import { JAICLUB_HISTORY_500, JaiClubDrawRecord } from '../data/jaiclubHistory500';
import { KURMA_HISTORY_20261127 } from '../data/kurmaHistory20261127';
import { LIVE_BATCH_20261127_NIGHT } from '../data/liveBatch20261127Night';

/**
 * WinGo Lottery Service
 * Connects to live WinGo Draw API (30S, 1M, TRX_1M, K3_1M modes)
 * Merges live API draws with the combined 1,100-round JaiClub + Kurma historical dataset & Cloud SQL DB records.
 */

export interface DrawItem {
  issueNumber: string;
  number: string;
  openTime?: string;
  colour?: string;
}

export interface QuantumDriftResult {
  digitVelocities: Record<number, number>;
  digitAccelerations: Record<number, number>;
  sizeVelocity: { big: number; small: number };
  sizeAcceleration: { big: number; small: number };
  driftBias: 'BIG' | 'SMALL' | 'NEUTRAL';
  driftMagnitude: number;
  quantumSurgeDigits: number[];
  exhaustionDetected: boolean;
  recoveryReductionMultiplier: number;
  confidenceDelta: number;
  summary: string;
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
  level4Wins?: number;
  level5Wins?: number;
  currentLevel: 1 | 2 | 3 | 4 | 5;
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
  level?: 1 | 2 | 3 | 4 | 5;
}

export interface LastResultInfo {
  number: string;
  size: 'BIG' | 'SMALL' | '---';
  digit: string;
  outcome: 'WIN' | 'LOSS' | '---';
  period: string;
  level?: 1 | 2 | 3 | 4 | 5;
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

export function getLiveBatch20261127NightDrawItems(type: WinGoMode): DrawItem[] {
  return recordsToDrawItems(LIVE_BATCH_20261127_NIGHT, type);
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
  // 3. Integrate the 2026-11-27 night 1-min batch (deduplicated by period)
  for (const nightItem of getLiveBatch20261127NightDrawItems(type)) {
    if (nightItem.issueNumber && !map.has(nightItem.issueNumber)) {
      map.set(nightItem.issueNumber, nightItem);
    }
  }
  // 4. Overlay live API / DB items (live takes priority on matching period)
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

/**
 * ==================================================
 * ⚛️ QUANTUM DRIFT ANALYSIS ENGINE (50-ROUND VELOCITY & ACCELERATION)
 * Calculates the velocity (v = f1 - f2) and acceleration (a = f1 - 2*f2 + f3)
 * of number frequencies and Big/Small sizes over the last 50 rounds.
 * Feeds into consensus cluster confidence and ensures aggressive <2 level recovery.
 * ==================================================
 */
export function calculateQuantumDriftAnalysis(
  drawsOrNumbers: (DrawItem | number | string)[],
  isK3: boolean = false
): QuantumDriftResult {
  const nums: number[] = [];
  for (const item of drawsOrNumbers || []) {
    if (typeof item === 'object' && item !== null && 'number' in item) {
      nums.push(Number(item.number) || 0);
    } else {
      nums.push(Number(item) || 0);
    }
  }

  const window50 = nums.slice(0, 50);
  const totalRounds = window50.length;

  // Safe fallback if empty or insufficient data
  if (totalRounds < 6) {
    const emptyMap: Record<number, number> = {};
    const digits = isK3 ? Array.from({ length: 16 }, (_, i) => i + 3) : Array.from({ length: 10 }, (_, i) => i);
    for (const d of digits) emptyMap[d] = 0;
    return {
      digitVelocities: emptyMap,
      digitAccelerations: emptyMap,
      sizeVelocity: { big: 0, small: 0 },
      sizeAcceleration: { big: 0, small: 0 },
      driftBias: 'NEUTRAL',
      driftMagnitude: 0,
      quantumSurgeDigits: isK3 ? [10, 11] : [7, 2],
      exhaustionDetected: false,
      recoveryReductionMultiplier: 1.15,
      confidenceDelta: 2,
      summary: 'Quantum Drift: Baseline Stable (insufficient history)',
    };
  }

  // Partition into 3 temporal subwindows:
  // W1 (rounds 0..w1End-1): Latest fast wave
  // W2 (rounds w1End..w2End-1): Intermediate wave
  // W3 (rounds w2End..totalRounds-1): Baseline wave
  const w1Size = Math.max(2, Math.floor(totalRounds / 3));
  const w2Size = Math.max(2, Math.floor(totalRounds / 3));
  const w1 = window50.slice(0, w1Size);
  const w2 = window50.slice(w1Size, w1Size + w2Size);
  const w3 = window50.slice(w1Size + w2Size);

  const len1 = w1.length || 1;
  const len2 = w2.length || 1;
  const len3 = w3.length || 1;

  const isBig = (n: number) => (isK3 ? n >= 11 : n >= 5);

  // 1. Size Frequencies, Velocity, and Acceleration
  const bigCount1 = w1.filter(isBig).length;
  const bigCount2 = w2.filter(isBig).length;
  const bigCount3 = w3.filter(isBig).length;

  const fBig1 = bigCount1 / len1;
  const fBig2 = bigCount2 / len2;
  const fBig3 = bigCount3 / len3;

  // Velocity: First derivative of frequency
  const vBig = Math.round((fBig1 - fBig2) * 1000) / 1000;
  // Acceleration: Second derivative of frequency
  const aBig = Math.round((fBig1 - 2 * fBig2 + fBig3) * 1000) / 1000;

  const vSmall = -vBig;
  const aSmall = -aBig;

  // Composite momentum vector (60% velocity + 40% acceleration)
  const compositeMomentum = Math.round((vBig * 0.6 + aBig * 0.4) * 1000) / 1000;
  const driftMagnitude = Math.round(Math.abs(compositeMomentum) * 100) / 100;

  let driftBias: 'BIG' | 'SMALL' | 'NEUTRAL' = 'NEUTRAL';
  if (compositeMomentum >= 0.035) {
    driftBias = 'BIG';
  } else if (compositeMomentum <= -0.035) {
    driftBias = 'SMALL';
  }

  // 2. Individual Digit Velocity & Acceleration
  const digitVelocities: Record<number, number> = {};
  const digitAccelerations: Record<number, number> = {};
  const surgeScores: { digit: number; score: number }[] = [];

  const eligibleDigits = isK3
    ? Array.from({ length: 16 }, (_, i) => i + 3)
    : Array.from({ length: 10 }, (_, i) => i);

  for (const d of eligibleDigits) {
    const c1 = w1.filter((x) => x === d).length;
    const c2 = w2.filter((x) => x === d).length;
    const c3 = w3.filter((x) => x === d).length;

    const fd1 = c1 / len1;
    const fd2 = c2 / len2;
    const fd3 = c3 / len3;

    const vd = Math.round((fd1 - fd2) * 1000) / 1000;
    const ad = Math.round((fd1 - 2 * fd2 + fd3) * 1000) / 1000;

    digitVelocities[d] = vd;
    digitAccelerations[d] = ad;

    const surgeScore = Math.round((vd * 1.5 + ad * 1.0) * 1000) / 1000;
    surgeScores.push({ digit: d, score: surgeScore });
  }

  surgeScores.sort((a, b) => b.score - a.score);
  const quantumSurgeDigits = surgeScores.slice(0, 3).map((item) => item.digit);

  // 3. Exhaustion & Inflection Detection
  // If recent concentration is extreme (>68%) but acceleration has turned sharply negative (< -0.10)
  const exhaustionDetected =
    (fBig1 >= 0.68 && aBig <= -0.08) || ((1 - fBig1) >= 0.68 && aSmall <= -0.08);

  // 4. Dynamic Under-2 Recovery Boost Multiplier
  // Increases aggressive pull when entering level 2 recovery
  const recoveryReductionMultiplier = Math.round(
    Math.min(1.45, 1.18 + Math.max(0, driftMagnitude) * 1.5) * 100
  ) / 100;

  const confidenceDelta = Math.min(
    5,
    Math.max(1, Math.round(driftMagnitude * 20) + (exhaustionDetected ? 2 : 1))
  );

  const vBigSign = vBig >= 0 ? '+' : '';
  const aBigSign = aBig >= 0 ? '+' : '';
  const summary = `QD-50R: Big[v=${vBigSign}${vBig.toFixed(3)}, a=${aBigSign}${aBig.toFixed(3)}] -> Bias:${driftBias} (Mag:${driftMagnitude}, U2-Mult:x${recoveryReductionMultiplier})`;

  return {
    digitVelocities,
    digitAccelerations,
    sizeVelocity: { big: vBig, small: vSmall },
    sizeAcceleration: { big: aBig, small: aSmall },
    driftBias,
    driftMagnitude,
    quantumSurgeDigits,
    exhaustionDetected,
    recoveryReductionMultiplier,
    confidenceDelta,
    summary,
  };
}

