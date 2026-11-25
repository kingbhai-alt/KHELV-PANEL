import { DrawItem, WinGoMode } from './lotteryService';

export async function fetchDatabaseDraws(
  idToken: string,
  gameMode: WinGoMode,
  limit: number = 1000
): Promise<DrawItem[]> {
  try {
    const res = await fetch(
      `/api/db/draws?type=${encodeURIComponent(gameMode)}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data?.draws)) {
      return data.draws.map((d: any) => ({
        issueNumber: String(d.issueNumber || d.period),
        number: String(d.number),
        colour: d.colour || d.color,
        openTime: d.openTime,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export async function syncDrawsToDatabase(
  idToken: string,
  gameMode: WinGoMode,
  draws: DrawItem[]
): Promise<boolean> {
  if (!idToken || !draws || draws.length === 0) return false;
  try {
    const payload = draws.slice(0, 120).map((d) => ({
      period: d.issueNumber,
      number: Number(d.number),
      color: d.colour || '',
    }));
    const res = await fetch('/api/db/draws/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        gameMode,
        draws: payload,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function savePredictionToDatabase(
  idToken: string,
  params: {
    gameMode: WinGoMode;
    period: string;
    predictedSize: 'BIG' | 'SMALL';
    predictedDigit: number;
    actualNumber?: number | null;
    actualSize?: string | null;
    outcome: 'WIN' | 'LOSS' | 'JACKPOT' | 'PENDING';
    level: number;
    winningStrategy: string;
    backtestAccuracy: number;
  }
): Promise<boolean> {
  if (!idToken) return false;
  try {
    const res = await fetch('/api/db/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(params),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface StoredPredictionLog {
  period: string;
  predictedSize: string;
  predictedDigit?: number;
  actualNumber?: number | null;
  actualSize?: string | null;
  outcome: string;
  level: number;
  winningStrategy: string;
  backtestAccuracy?: number;
}

export async function fetchDatabasePredictionLogs(
  authToken: string,
  gameMode: WinGoMode,
  limit: number = 250
): Promise<StoredPredictionLog[]> {
  if (!authToken) return [];
  try {
    const res = await fetch(
      `/api/db/predictions?type=${encodeURIComponent(gameMode)}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data?.logs)) {
      return data.logs.map((row: any) => ({
        period: String(row.period),
        predictedSize: String(row.predictedSize || 'BIG'),
        predictedDigit: row.predictedDigit !== undefined ? Number(row.predictedDigit) : undefined,
        actualNumber: row.actualNumber !== null && row.actualNumber !== undefined ? Number(row.actualNumber) : null,
        actualSize: row.actualSize ? String(row.actualSize) : null,
        outcome: String(row.outcome || 'PENDING'),
        level: Number(row.level) || 1,
        winningStrategy: String(row.winningStrategy || ''),
        backtestAccuracy: row.backtestAccuracy !== undefined ? Number(row.backtestAccuracy) : undefined,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveBacktestReportToDatabase(
  idToken: string,
  params: {
    gameMode: WinGoMode;
    datasetSize: number;
    bestStrategy: string;
    level1Accuracy: number;
    under3FixRate: number;
    totalSimulatedRounds: number;
    maxLossStreak: number;
  }
): Promise<boolean> {
  if (!idToken) return false;
  try {
    const res = await fetch('/api/db/backtest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(params),
    });
    return res.ok;
  } catch {
    return false;
  }
}
