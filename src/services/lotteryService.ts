import { JAICLUB_HISTORY_500, JaiClubDrawRecord } from '../data/jaiclubHistory500';
import { KURMA_HISTORY_20261127 } from '../data/kurmaHistory20261127';

/**
 * WinGo Lottery Service
 * Connects to live WinGo Draw API (30S, 1M, TRX_1M, K3_1M modes)
 * Merges live API draws with the combined 1,000-round JaiClub + Kurma historical dataset & Cloud SQL DB records.
 */

export interface DrawItem {
  issueNumber: string;
  number: string;
  openTime?: string;
  colour?: string;
}

export interface LotteryStats {
  wins: number;
  jackpots: number;
  losses: number;
  winRate: number;
  streak: number;
  bestStreak: number;
  level1Wins: number;
  level2Wins: number;
  level3Wins: number;
  currentLevel: 1 | 2 | 3;
  targetWins: number;
  targetRunsCompleted: number;
  singleJackpotHits: number;
}

export interface HistoryLogRow {
  period: string;
  number: string;
  result: 'BIG' | 'SMALL';
  pred: 'BIG' | 'SMALL';
  predDigit?: number;
  singleJackpotDigit?: number;
  isSingleHit?: boolean;
  predNumbers?: [number, number];
  outcome: 'WIN' | 'LOSS' | 'JACKPOT';
  time: string;
  confidence: number;
  rule?: string;
  level?: 1 | 2 | 3;
}

export interface LastResultInfo {
  number: string;
  size: 'BIG' | 'SMALL' | '---';
  digit: string;
  outcome: 'WIN' | 'LOSS' | '---';
  period: string;
  level?: 1 | 2 | 3;
}

export type WinGoMode = '1M' | 'TRX_1M' | 'K3_1M' | '30S';
export type WingoMode = WinGoMode;

export function isK3Game(mode: WinGoMode | string): boolean {
  return String(mode).startsWith('K3');
}

export function isTrxGame(mode: WinGoMode | string): boolean {
  return String(mode).startsWith('TRX') || String(mode).startsWith('Trx');
}

function recordsToDrawItems(records: JaiClubDrawRecord[], type: WinGoMode): DrawItem[] {
  const isK3 = isK3Game(type);
  return records.map((item, idx) => {
    if (isK3) {
      const d1 = (item.number % 6) + 1;
      const d2 = (records[(idx + 1) % records.length].number % 6) + 1;
      const d3 = (records[(idx + 2) % records.length].number % 6) + 1;
      const sum = d1 + d2 + d3;
      return {
        issueNumber: item.period,
        number: String(sum),
        colour: sum >= 11 ? 'big' : 'small',
      };
    }
    return {
      issueNumber: item.period,
      number: String(item.number),
      colour: item.color,
    };
  });
}

export function getJaiClub500DrawItems(type: WinGoMode): DrawItem[] {
  return recordsToDrawItems(JAICLUB_HISTORY_500, type);
}

export function getKurma20261127DrawItems(type: WinGoMode): DrawItem[] {
  return recordsToDrawItems(KURMA_HISTORY_20261127, type);
}

export function mergeWith500Dataset(liveItems: DrawItem[], type: WinGoMode): DrawItem[] {
  const map = new Map<string, DrawItem>();
  // 1. Populate with the existing JaiClub historical buffer
  for (const seedItem of getJaiClub500DrawItems(type)) {
    if (seedItem.issueNumber) {
      map.set(seedItem.issueNumber, seedItem);
    }
  }
  // 2. Integrate the additional 500-round 2026-11-27 Kurma historical buffer (deduplicated by period)
  for (const extraItem of getKurma20261127DrawItems(type)) {
    if (extraItem.issueNumber && !map.has(extraItem.issueNumber)) {
      map.set(extraItem.issueNumber, extraItem);
    }
  }
  // 3. Overlay live API / DB items (live takes priority on matching period)
  for (const liveItem of liveItems) {
    if (liveItem.issueNumber) {
      map.set(liveItem.issueNumber, liveItem);
    }
  }
  const merged = Array.from(map.values());
  merged.sort((a, b) => {
    try {
      const ba = BigInt(a.issueNumber.replace(/\D/g, '') || '0');
      const bb = BigInt(b.issueNumber.replace(/\D/g, '') || '0');
      return bb > ba ? 1 : bb < ba ? -1 : 0;
    } catch {
      return 0;
    }
  });
  return merged.slice(0, 5000);
}

export async function fetchLiveDrawHistory(type: WinGoMode = '1M'): Promise<DrawItem[]> {
  const ts = Date.now();
  const isK3 = isK3Game(type);
  const isTrx = isTrxGame(type);

  // Try 1: Local server proxy (handles Referer, CORS, TRX, K3 & 500 dataset merge)
  try {
    const res = await fetch(`/api/history?type=${type}&_t=${ts}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && Array.isArray(json.data.list) && json.data.list.length > 0) {
        const items: DrawItem[] = json.data.list.map((item: any) => {
          let numStr = String(item.number ?? item.num ?? item.result ?? '');
          if ((!numStr || numStr === '') && item.sum !== undefined && item.sum !== null) {
            numStr = String(item.sum);
          }
          return {
            issueNumber: String(item.issueNumber || item.issue || item.period || item.id || '').trim(),
            number: numStr,
            openTime: item.openTime,
            colour: item.colour || item.color,
          };
        });
        return mergeWith500Dataset(items, type);
      }
    }
  } catch {
    // Continue to fallback
  }

  // Try 2: Direct API fetch
  try {
    const directUrl = isK3
      ? `https://draw.ar-lottery01.com/K3/K3_1M/GetHistoryIssuePage.json?ts=${ts}`
      : isTrx
      ? `https://draw.ar-lottery01.com/TrxWinGo/TrxWinGo_1M/GetHistoryIssuePage.json?ts=${ts}`
      : `https://draw.ar-lottery01.com/WinGo/${type === '30S' ? 'WinGo_30S' : 'WinGo_1M'}/GetHistoryIssuePage.json?ts=${ts}`;
    const directRes = await fetch(directUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });
    if (directRes.ok) {
      const json = await directRes.json();
      if (json && json.data && Array.isArray(json.data.list) && json.data.list.length > 0) {
        const items: DrawItem[] = json.data.list.map((item: any) => {
          let numStr = String(item.number ?? item.num ?? item.result ?? '');
          if ((!numStr || numStr === '') && item.sum !== undefined && item.sum !== null) {
            numStr = String(item.sum);
          }
          return {
            issueNumber: String(item.issueNumber || item.issue || item.period || item.id || '').trim(),
            number: numStr,
            openTime: item.openTime,
            colour: item.colour || item.color
          };
        });
        return mergeWith500Dataset(items, type);
      }
    }
  } catch {
    // Continue to 500 dataset fallback
  }

  // Fallback: Full combined historical dataset (JaiClub + Kurma 2026-11-27)
  return mergeWith500Dataset([], type);
}
