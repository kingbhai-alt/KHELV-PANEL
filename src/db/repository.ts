import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { backtestReports, drawHistory, predictionLogs } from './schema.ts';
import { JAICLUB_HISTORY_500 } from '../data/jaiclubHistory500.ts';

export interface StoredDrawItem {
  issueNumber: string;
  number: string;
  size: 'BIG' | 'SMALL';
  colour: string;
  source: string;
}

function normalizeSize(num: number, gameMode: string): 'BIG' | 'SMALL' {
  if (gameMode.startsWith('K3')) {
    return num >= 11 ? 'BIG' : 'SMALL';
  }
  return num >= 5 ? 'BIG' : 'SMALL';
}

// Track modes already seeded in current process lifetime to minimize redundant checks
const seededModes = new Set<string>();

export async function ensureJaiClub500Seeded(gameMode: string): Promise<void> {
  if (seededModes.has(gameMode)) return;

  try {
    const existingSeed = await db
      .select({ id: drawHistory.id })
      .from(drawHistory)
      .where(
        and(
          eq(drawHistory.gameMode, gameMode),
          eq(drawHistory.source, 'jaiclub_500')
        )
      )
      .limit(1);

    if (existingSeed.length === 0) {
      const isK3 = gameMode.startsWith('K3');
      const rowsToInsert = JAICLUB_HISTORY_500.map((item, idx) => {
        let num = item.number;
        let size: 'BIG' | 'SMALL' = item.size === 'Big' ? 'BIG' : 'SMALL';
        let color = item.color;

        if (isK3) {
          // Deterministically derive valid 3-dice sum (3..18) from consecutive triplets in the 500 dataset
          const d1 = (item.number % 6) + 1;
          const d2 = ((JAICLUB_HISTORY_500[(idx + 1) % JAICLUB_HISTORY_500.length].number) % 6) + 1;
          const d3 = ((JAICLUB_HISTORY_500[(idx + 2) % JAICLUB_HISTORY_500.length].number) % 6) + 1;
          num = d1 + d2 + d3;
          size = num >= 11 ? 'BIG' : 'SMALL';
          color = size === 'BIG' ? 'Big' : 'Small';
        }

        return {
          gameMode,
          period: item.period,
          number: num,
          size,
          color,
          source: 'jaiclub_500',
        };
      });

      const chunkSize = 100;
      for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
        const chunk = rowsToInsert.slice(i, i + chunkSize);
        await db.insert(drawHistory).values(chunk).onConflictDoNothing();
      }
    }

    seededModes.add(gameMode);
  } catch (error) {
    console.error(`Failed to seed 500 history for ${gameMode}:`, error);
    throw new Error('Failed to seed historical database.', { cause: error });
  }
}

export async function saveDrawsBatch(
  gameMode: string,
  draws: Array<{
    period: string;
    number: number;
    size?: string;
    color?: string;
  }>,
  source: string = 'live_api'
): Promise<number> {
  if (!draws || draws.length === 0) return 0;

  try {
    await ensureJaiClub500Seeded(gameMode);

    const rows = draws
      .filter((d) => d.period && !isNaN(Number(d.number)))
      .map((d) => {
        const num = Number(d.number);
        const size = normalizeSize(num, gameMode);
        const color =
          d.color ||
          (num === 0
            ? 'Red+Violet'
            : num === 5
            ? 'Green+Violet'
            : num % 2 === 0
            ? 'Red'
            : 'Green');

        return {
          gameMode,
          period: String(d.period).trim(),
          number: num,
          size,
          color,
          source,
        };
      });

    if (rows.length === 0) return 0;

    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      await db
        .insert(drawHistory)
        .values(rows.slice(i, i + chunkSize))
        .onConflictDoNothing();
    }

    return rows.length;
  } catch (error) {
    console.error('Failed to auto-save draws batch:', error);
    throw new Error('Failed to persist draw history.', { cause: error });
  }
}

export async function getStoredDraws(
  gameMode: string,
  limit: number = 1000
): Promise<StoredDrawItem[]> {
  try {
    await ensureJaiClub500Seeded(gameMode);

    const rows = await db
      .select()
      .from(drawHistory)
      .where(eq(drawHistory.gameMode, gameMode))
      .orderBy(desc(drawHistory.period))
      .limit(Math.min(limit, 1200));

    return rows.map((r) => ({
      issueNumber: r.period,
      number: String(r.number),
      size: r.size === 'BIG' ? 'BIG' : 'SMALL',
      colour: r.color,
      source: r.source,
    }));
  } catch (error) {
    console.error('Failed to fetch stored draws:', error);
    throw new Error('Failed to load draw history from database.', { cause: error });
  }
}

export async function upsertPredictionLog(params: {
  userUid: string;
  gameMode: string;
  period: string;
  predictedSize: string;
  predictedDigit: number;
  actualNumber?: number | null;
  actualSize?: string | null;
  outcome: string;
  level: number;
  winningStrategy: string;
  backtestAccuracy: number;
}) {
  try {
    const result = await db
      .insert(predictionLogs)
      .values({
        userUid: params.userUid,
        gameMode: params.gameMode,
        period: params.period,
        predictedSize: params.predictedSize,
        predictedDigit: params.predictedDigit,
        actualNumber: params.actualNumber ?? null,
        actualSize: params.actualSize ?? null,
        outcome: params.outcome,
        level: params.level,
        winningStrategy: params.winningStrategy,
        backtestAccuracy: params.backtestAccuracy,
      })
      .onConflictDoUpdate({
        target: [
          predictionLogs.userUid,
          predictionLogs.gameMode,
          predictionLogs.period,
        ],
        set: {
          actualNumber: params.actualNumber ?? null,
          actualSize: params.actualSize ?? null,
          outcome: params.outcome,
          level: params.level,
          winningStrategy: params.winningStrategy,
          backtestAccuracy: params.backtestAccuracy,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to save prediction log:', error);
    throw new Error('Failed to save prediction record.', { cause: error });
  }
}

export async function getUserPredictionLogs(
  userUid: string,
  gameMode: string,
  limit: number = 100
) {
  try {
    return await db
      .select()
      .from(predictionLogs)
      .where(
        and(
          eq(predictionLogs.userUid, userUid),
          eq(predictionLogs.gameMode, gameMode)
        )
      )
      .orderBy(desc(predictionLogs.period))
      .limit(limit);
  } catch (error) {
    console.error('Failed to fetch prediction logs:', error);
    throw new Error('Failed to fetch prediction logs.', { cause: error });
  }
}

export async function saveBacktestReport(params: {
  userUid: string;
  gameMode: string;
  datasetSize: number;
  bestStrategy: string;
  level1Accuracy: number;
  under3FixRate: number;
  totalSimulatedRounds: number;
  maxLossStreak: number;
}) {
  try {
    const result = await db
      .insert(backtestReports)
      .values(params)
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to save backtest report:', error);
    throw new Error('Failed to save backtest report.', { cause: error });
  }
}

export async function getLatestBacktestReport(
  userUid: string,
  gameMode: string
) {
  try {
    const rows = await db
      .select()
      .from(backtestReports)
      .where(
        and(
          eq(backtestReports.userUid, userUid),
          eq(backtestReports.gameMode, gameMode)
        )
      )
      .orderBy(desc(backtestReports.createdAt))
      .limit(1);

    return rows[0] || null;
  } catch (error) {
    console.error('Failed to fetch latest backtest report:', error);
    throw new Error('Failed to fetch backtest report.', { cause: error });
  }
}
