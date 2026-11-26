import { and, desc, eq } from 'drizzle-orm';
import { db, isDbConfigured } from './index.ts';
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

// Track modes already seeded in current process lifetime
const seededModes = new Set<string>();

// In-Memory Storage Fallback (Active when Cloud SQL is unconfigured or disconnected)
const inMemoryDraws = new Map<string, StoredDrawItem[]>();
const inMemoryPredictionLogs: Array<{
  id: number;
  userUid: string;
  gameMode: string;
  period: string;
  predictedSize: string;
  predictedDigit: number;
  actualNumber: number | null;
  actualSize: string | null;
  outcome: string;
  level: number;
  winningStrategy: string;
  backtestAccuracy: number;
  createdAt: Date;
}> = [];
const inMemoryBacktestReports: Array<{
  id: number;
  userUid: string;
  gameMode: string;
  datasetSize: number;
  bestStrategy: string;
  level1Accuracy: number;
  under3FixRate: number;
  totalSimulatedRounds: number;
  maxLossStreak: number;
  createdAt: Date;
}> = [];

function seedInMemoryJaiClub500(gameMode: string) {
  if (inMemoryDraws.has(gameMode) && inMemoryDraws.get(gameMode)!.length >= JAICLUB_HISTORY_500.length) {
    return;
  }
  const isK3 = gameMode.startsWith('K3');
  const items: StoredDrawItem[] = JAICLUB_HISTORY_500.map((item, idx) => {
    let num = item.number;
    let size: 'BIG' | 'SMALL' = item.size === 'Big' ? 'BIG' : 'SMALL';
    let color = item.color;

    if (isK3) {
      const d1 = (item.number % 6) + 1;
      const d2 = ((JAICLUB_HISTORY_500[(idx + 1) % JAICLUB_HISTORY_500.length].number) % 6) + 1;
      const d3 = ((JAICLUB_HISTORY_500[(idx + 2) % JAICLUB_HISTORY_500.length].number) % 6) + 1;
      num = d1 + d2 + d3;
      size = num >= 11 ? 'BIG' : 'SMALL';
      color = size === 'BIG' ? 'Big' : 'Small';
    }

    return {
      issueNumber: item.period,
      number: String(num),
      size,
      colour: color,
      source: 'jaiclub_500',
    };
  });

  inMemoryDraws.set(gameMode, items);
  seededModes.add(gameMode);
}

export async function ensureJaiClub500Seeded(gameMode: string): Promise<void> {
  if (seededModes.has(gameMode)) return;

  if (!isDbConfigured) {
    seedInMemoryJaiClub500(gameMode);
    return;
  }

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
    console.warn(`Database seeding for ${gameMode} fell back to in-memory store`);
    seedInMemoryJaiClub500(gameMode);
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

  // Always keep in-memory backup updated
  ensureJaiClub500Seeded(gameMode).catch(() => {});
  const currentInMemory = inMemoryDraws.get(gameMode) || [];
  const knownPeriods = new Set(currentInMemory.map((d) => d.issueNumber));

  const validItems = draws
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
        issueNumber: String(d.period).trim(),
        number: String(num),
        size,
        colour: color,
        source,
      };
    });

  for (const item of validItems) {
    if (!knownPeriods.has(item.issueNumber)) {
      currentInMemory.unshift(item);
      knownPeriods.add(item.issueNumber);
    }
  }
  inMemoryDraws.set(gameMode, currentInMemory);

  if (!isDbConfigured) {
    return validItems.length;
  }

  try {
    const rows = validItems.map((item) => ({
      gameMode,
      period: item.issueNumber,
      number: Number(item.number),
      size: item.size,
      color: item.colour,
      source,
    }));

    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      await db
        .insert(drawHistory)
        .values(rows.slice(i, i + chunkSize))
        .onConflictDoNothing();
    }

    return rows.length;
  } catch (error) {
    console.warn('Database batch save fell back to in-memory store');
    return validItems.length;
  }
}

export async function getStoredDraws(
  gameMode: string,
  limit: number = 1000
): Promise<StoredDrawItem[]> {
  await ensureJaiClub500Seeded(gameMode);

  if (!isDbConfigured) {
    const list = inMemoryDraws.get(gameMode) || [];
    return list.slice(0, Math.min(limit, 1200));
  }

  try {
    const rows = await db
      .select()
      .from(drawHistory)
      .where(eq(drawHistory.gameMode, gameMode))
      .orderBy(desc(drawHistory.period))
      .limit(Math.min(limit, 1200));

    if (rows && rows.length > 0) {
      return rows.map((r: any) => ({
        issueNumber: r.period,
        number: String(r.number),
        size: r.size === 'BIG' ? 'BIG' : 'SMALL',
        colour: r.color,
        source: r.source,
      }));
    }
  } catch (error) {
    console.warn('Database getStoredDraws fell back to in-memory store');
  }

  const list = inMemoryDraws.get(gameMode) || [];
  return list.slice(0, Math.min(limit, 1200));
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
  const fallbackRecord = {
    id: inMemoryPredictionLogs.length + 1,
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
    createdAt: new Date(),
  };

  const existingIdx = inMemoryPredictionLogs.findIndex(
    (l) =>
      l.userUid === params.userUid &&
      l.gameMode === params.gameMode &&
      l.period === params.period
  );
  if (existingIdx >= 0) {
    inMemoryPredictionLogs[existingIdx] = {
      ...inMemoryPredictionLogs[existingIdx],
      ...fallbackRecord,
    };
  } else {
    inMemoryPredictionLogs.unshift(fallbackRecord);
  }

  if (!isDbConfigured) {
    return fallbackRecord;
  }

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
    console.warn('Database upsertPredictionLog fell back to in-memory store');
    return fallbackRecord;
  }
}

export async function getUserPredictionLogs(
  userUid: string,
  gameMode: string,
  limit: number = 100
) {
  if (!isDbConfigured) {
    return inMemoryPredictionLogs
      .filter((l) => l.userUid === userUid && l.gameMode === gameMode)
      .slice(0, limit);
  }

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
    console.warn('Database getUserPredictionLogs fell back to in-memory store');
    return inMemoryPredictionLogs
      .filter((l) => l.userUid === userUid && l.gameMode === gameMode)
      .slice(0, limit);
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
  const fallbackReport = {
    id: inMemoryBacktestReports.length + 1,
    ...params,
    createdAt: new Date(),
  };
  inMemoryBacktestReports.unshift(fallbackReport);

  if (!isDbConfigured) {
    return fallbackReport;
  }

  try {
    const result = await db
      .insert(backtestReports)
      .values(params)
      .returning();

    return result[0];
  } catch (error) {
    console.warn('Database saveBacktestReport fell back to in-memory store');
    return fallbackReport;
  }
}

export async function getLatestBacktestReport(
  userUid: string,
  gameMode: string
) {
  if (!isDbConfigured) {
    return (
      inMemoryBacktestReports.find(
        (r) => r.userUid === userUid && r.gameMode === gameMode
      ) || null
    );
  }

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
    console.warn('Database getLatestBacktestReport fell back to in-memory store');
    return (
      inMemoryBacktestReports.find(
        (r) => r.userUid === userUid && r.gameMode === gameMode
      ) || null
    );
  }
}

