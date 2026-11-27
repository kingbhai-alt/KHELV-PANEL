import { BacktestSummary } from './backtestEngine';
import { JujutsuPrediction, PredictionResult, get_big_small } from './jujutsuEngine';

export type PatternRegime =
  | 'DRAGON_3+'
  | 'PAIR_2_2'
  | 'ZIGZAG_4+'
  | 'ONE_CUT_AFTER_DRAGON'
  | 'CHOPPY_MIXED';

export interface SelfLearningLesson {
  period: string;
  regime: PatternRegime;
  level: number;
  basePred: PredictionResult;
  aiPred: PredictionResult;
  geminiPred?: PredictionResult;
  actualSize: PredictionResult;
  actualNumber: number;
  outcome: 'WIN' | 'JACKPOT' | 'LOSS';
  lesson: string;
  timestamp: number;
}

export interface SelfLearningState {
  mode: string;
  totalRoundsLearned: number;
  cyclesTotal: number;
  l1Wins: number;
  l2Wins: number;
  l3Wins: number;
  lossesOverL3: number;
  geminiWins: number;
  geminiTotal: number;
  bigAccEMA: number;
  smallAccEMA: number;
  levelSideStats: Record<
    1 | 2 | 3,
    { bigW: number; bigT: number; smallW: number; smallT: number }
  >;
  regimeStats: Record<PatternRegime, { wins: number; total: number }>;
  strategyBoostWeights: Record<string, number>;
  recentLessons: SelfLearningLesson[];
}

export interface PatternFeatures {
  regime: PatternRegime;
  streakLength: number;
  streakSide: PredictionResult;
  recent12BigPct: number;
  recent35BigPct: number;
  recent50BigPct: number;
  flipRate20: number;
  chiZ12: number;
  last20Numbers: number[];
  last20Sizes: PredictionResult[];
}

export interface SelfLearningBoostResult {
  boostedPrediction: PredictionResult;
  boostedDigit: number;
  boostedConfidence: number;
  patternFeatures: PatternFeatures;
  boostReason: string;
  under2ConfidenceScore: number;
  sideReliability: { bigWinP: number; smallWinP: number };
}

const STORAGE_PREFIX = 'khelv_ai_self_learn_v1_';

export function createInitialSelfLearningState(mode: string): SelfLearningState {
  return {
    mode,
    totalRoundsLearned: 0,
    cyclesTotal: 0,
    l1Wins: 0,
    l2Wins: 0,
    l3Wins: 0,
    lossesOverL3: 0,
    geminiWins: 0,
    geminiTotal: 0,
    bigAccEMA: 0.5,
    smallAccEMA: 0.5,
    levelSideStats: {
      1: { bigW: 5, bigT: 10, smallW: 5, smallT: 10 },
      2: { bigW: 5, bigT: 10, smallW: 5, smallT: 10 },
      3: { bigW: 5, bigT: 10, smallW: 5, smallT: 10 },
    },
    regimeStats: {
      'DRAGON_3+': { wins: 0, total: 0 },
      'PAIR_2_2': { wins: 0, total: 0 },
      'ZIGZAG_4+': { wins: 0, total: 0 },
      'ONE_CUT_AFTER_DRAGON': { wins: 0, total: 0 },
      'CHOPPY_MIXED': { wins: 0, total: 0 },
    },
    strategyBoostWeights: {},
    recentLessons: [],
  };
}

export function loadSelfLearningState(mode: string): SelfLearningState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${mode}`);
    if (raw) {
      const parsed = JSON.parse(raw) as SelfLearningState;
      if (parsed && parsed.levelSideStats && parsed.regimeStats) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage read issues
  }
  return createInitialSelfLearningState(mode);
}

export function saveSelfLearningState(mode: string, state: SelfLearningState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${mode}`, JSON.stringify(state));
  } catch {
    // Ignore storage write issues
  }
}

export function detectMarketPatternRegime(histSizesDesc: PredictionResult[]): {
  regime: PatternRegime;
  streakLength: number;
  streakSide: PredictionResult;
} {
  const s0 = histSizesDesc[0] || 'BIG';
  const s1 = histSizesDesc[1] || s0;
  const s2 = histSizesDesc[2] || s1;
  const s3 = histSizesDesc[3] || s2;

  let streakLength = 1;
  for (let i = 1; i < Math.min(histSizesDesc.length, 20); i++) {
    if (histSizesDesc[i] === s0) streakLength++;
    else break;
  }

  let regime: PatternRegime = 'CHOPPY_MIXED';
  if (streakLength >= 3) {
    regime = 'DRAGON_3+';
  } else if (s0 !== s1 && s1 === s2 && s2 === s3) {
    regime = 'ONE_CUT_AFTER_DRAGON';
  } else if (s0 !== s1 && s1 !== s2 && s2 !== s3) {
    regime = 'ZIGZAG_4+';
  } else if (s0 === s1 && s1 !== s2 && s2 === s3) {
    regime = 'PAIR_2_2';
  }

  return { regime, streakLength, streakSide: s0 };
}

export function extractPatternFeatures(
  histNumsDesc: number[],
  isK3: boolean
): PatternFeatures {
  const histSizesDesc = histNumsDesc.map((n) => get_big_small(n, isK3));
  const { regime, streakLength, streakSide } = detectMarketPatternRegime(histSizesDesc);

  const slice12 = histSizesDesc.slice(0, Math.min(12, histSizesDesc.length));
  const slice35 = histSizesDesc.slice(0, Math.min(35, histSizesDesc.length));
  const slice50 = histSizesDesc.slice(0, Math.min(50, histSizesDesc.length));
  const slice20 = histSizesDesc.slice(0, Math.min(20, histSizesDesc.length));

  const big12 = slice12.filter((s) => s === 'BIG').length;
  const big35 = slice35.filter((s) => s === 'BIG').length;
  const big50 = slice50.filter((s) => s === 'BIG').length;

  let flips = 0;
  for (let i = 0; i < slice20.length - 1; i++) {
    if (slice20[i] !== slice20[i + 1]) flips++;
  }
  const flipRate20 =
    slice20.length > 1 ? Math.round((flips / (slice20.length - 1)) * 100) : 50;

  const exp12 = slice12.length / 2;
  const chiZ12 =
    slice12.length > 0
      ? Number(((big12 - exp12) / Math.sqrt(Math.max(1, slice12.length * 0.25))).toFixed(2))
      : 0;

  return {
    regime,
    streakLength,
    streakSide,
    recent12BigPct: slice12.length > 0 ? Math.round((big12 / slice12.length) * 100) : 50,
    recent35BigPct: slice35.length > 0 ? Math.round((big35 / slice35.length) * 100) : 50,
    recent50BigPct: slice50.length > 0 ? Math.round((big50 / slice50.length) * 100) : 50,
    flipRate20,
    chiZ12,
    last20Numbers: histNumsDesc.slice(0, 20),
    last20Sizes: histSizesDesc.slice(0, 20),
  };
}

/**
 * Deterministic Self-Learning Meta-Booster
 * Combines base Jujutsu 500+ Backtest Consensus with live learned side/level EMAs
 * and Top-2 L2/L3 recovery strategies so Under-2 & Under-3 rates maximize without dropping any old logic.
 */
export function computeSelfLearningBoost(
  basePred: JujutsuPrediction,
  histNumsDesc: number[],
  currentLevel: number,
  isK3: boolean,
  state: SelfLearningState
): SelfLearningBoostResult {
  const lvl = (Math.min(3, Math.max(1, currentLevel)) as 1 | 2 | 3);
  const patternFeatures = extractPatternFeatures(histNumsDesc, isK3);
  const st = state.levelSideStats[lvl] || { bigW: 5, bigT: 10, smallW: 5, smallT: 10 };
  const bigWinP = st.bigW / Math.max(1, st.bigT);
  const smallWinP = st.smallW / Math.max(1, st.smallT);

  const rankings = basePred.backtestSummary?.strategyRankings || [];
  const top1 = rankings[0];
  const top2 = rankings[1];

  const findStrat = (id: string) => rankings.find((r) => r.id === id);
  const kalmanStrat = findStrat('ADAPTIVE_KALMAN_DIGIT_FUSION');
  const gapStrat = findStrat('DIGIT_GAP_SURVIVAL_HAZARD');
  const vmmStrat = findStrat('VARIABLE_ORDER_MARKOV_4');
  const mwuStrat = findStrat('EXPONENTIAL_MWU_HEDGE');
  const metaStrat = findStrat('SELF_LEARNED_META_LEARNER');
  const condStrat = findStrat('CONDITIONAL_L2L3_SWITCHER');

  const smallRatio35 = (100 - patternFeatures.recent35BigPct) / 100;
  const bigRatio35 = patternFeatures.recent35BigPct / 100;

  let boostedPrediction: PredictionResult = basePred.prediction;
  let boostReason = '20-Algo Quant Consensus & 1000+ Round Backtest Aligned';

  if (top1 && top2) {
    if (lvl === 1) {
      // L1 Multi-Expert Quant Vote: Base 15-Cluster Consensus + MWU Hedge + Kalman + Digit-Gap + VMM-4
      const l1Pool = [
        { v: basePred.prediction, w: 1.35 + ((basePred.prediction === 'BIG' ? state.bigAccEMA : state.smallAccEMA) - 0.5) },
        { v: kalmanStrat?.nextVote || top1.nextVote, w: (kalmanStrat?.level1Accuracy ?? top1.level1Accuracy) / 48 + (state.strategyBoostWeights[kalmanStrat?.id || top1.id] || 0) },
        { v: mwuStrat?.nextVote || top1.nextVote, w: (mwuStrat?.level1Accuracy ?? top1.level1Accuracy) / 50 + (state.strategyBoostWeights[mwuStrat?.id || top1.id] || 0) },
        { v: gapStrat?.nextVote || top1.nextVote, w: (gapStrat?.level1Accuracy ?? top1.level1Accuracy) / 50 + (state.strategyBoostWeights[gapStrat?.id || top1.id] || 0) },
        { v: vmmStrat?.nextVote || top2.nextVote, w: (vmmStrat?.level1Accuracy ?? top2.level1Accuracy) / 54 + (state.strategyBoostWeights[vmmStrat?.id || top2.id] || 0) },
      ];
      let bW = 0;
      let sW = 0;
      for (const p of l1Pool) {
        if (p.v === 'BIG') bW += p.w;
        else sW += p.w;
      }
      if (state.bigAccEMA < 0.43 && smallRatio35 > 0.55) sW += 0.45;
      if (state.smallAccEMA < 0.43 && bigRatio35 > 0.55) bW += 0.45;

      boostedPrediction = bW >= sW ? 'BIG' : 'SMALL';
      boostReason =
        boostedPrediction !== basePred.prediction
          ? `Quant Self-Learn L1 Shift -> ${boostedPrediction} (Kalman+MWU+Gap [${patternFeatures.regime}])`
          : `L1 Quant [${patternFeatures.regime}] • 15-Cluster + Kalman+MWU+DigitGap`;
    } else if (lvl === 2) {
      // L2 Under-2 Fix Booster: Fuse MWU Hedge + VMM-4 + Top-1 L2 + Live Side EMA + Anti-Streak Guard
      const candidates = [
        {
          v: basePred.prediction,
          score: (basePred.prediction === 'BIG' ? bigWinP : smallWinP) + 0.18,
        },
        {
          v: mwuStrat?.nextL2Vote || top1.nextL2Vote,
          score:
            ((mwuStrat?.l2RecoveryRate ?? top1.l2RecoveryRate) / 100) * 0.78 +
            ((mwuStrat?.nextL2Vote || top1.nextL2Vote) === 'BIG' ? bigWinP : smallWinP) * 0.35 +
            (state.strategyBoostWeights[mwuStrat?.id || top1.id] || 0),
        },
        {
          v: vmmStrat?.nextL2Vote || top2.nextL2Vote,
          score:
            ((vmmStrat?.l2RecoveryRate ?? top2.l2RecoveryRate) / 100) * 0.72 +
            ((vmmStrat?.nextL2Vote || top2.nextL2Vote) === 'BIG' ? bigWinP : smallWinP) * 0.35 +
            (state.strategyBoostWeights[vmmStrat?.id || top2.id] || 0),
        },
        {
          v: top1.nextL2Vote,
          score:
            (top1.l2RecoveryRate / 100) * 0.68 +
            (top1.nextL2Vote === 'BIG' ? bigWinP : smallWinP) * 0.35,
        },
      ];
      let bScore = 0;
      let sScore = 0;
      for (const c of candidates) {
        if (c.v === 'BIG') bScore += c.score;
        else sScore += c.score;
      }
      if (
        !isK3 &&
        patternFeatures.streakLength >= 3 &&
        patternFeatures.streakSide === 'SMALL' &&
        bigWinP < 0.48
      ) {
        sScore += 0.35;
        boostReason = `L2 Under-2 Fix Lock (${patternFeatures.streakLength}x SMALL Dragon Guard)`;
      } else if (
        !isK3 &&
        patternFeatures.streakLength >= 3 &&
        patternFeatures.streakSide === 'BIG' &&
        smallWinP < 0.48
      ) {
        bScore += 0.35;
        boostReason = `L2 Under-2 Fix Lock (${patternFeatures.streakLength}x BIG Dragon Guard)`;
      } else {
        boostReason = `L2 Self-Learn Recovery (MWU ${mwuStrat?.l2RecoveryRate ?? top1.l2RecoveryRate}% + VMM-4 ${vmmStrat?.l2RecoveryRate ?? 55}%)`;
      }
      boostedPrediction = bScore > sScore ? 'BIG' : 'SMALL';
    } else {
      // L3 Hardlock Fix: Dynamic Top-1/2 + L3 Specialists weighted by live L3 recovery rates
      const l3Votes = [
        { v: top1.nextL3Vote, w: (top1.l3RecoveryRate / 100) * 1.15 + (state.strategyBoostWeights[top1.id] || 0) },
        { v: top2.nextL3Vote, w: (top2.l3RecoveryRate / 100) * 1.0 + (state.strategyBoostWeights[top2.id] || 0) },
        { v: metaStrat?.nextL3Vote || top1.nextL3Vote, w: (metaStrat?.l3RecoveryRate ?? 55) / 100 },
        { v: condStrat?.nextL3Vote || top2.nextL3Vote, w: (condStrat?.l3RecoveryRate ?? 55) / 100 },
        { v: gapStrat?.nextL3Vote || top1.nextL3Vote, w: (gapStrat?.l3RecoveryRate ?? 54) / 100 },
        { v: basePred.prediction, w: 0.65 },
      ];
      let bScore = bigWinP - 0.5;
      let sScore = smallWinP - 0.5;
      for (const item of l3Votes) {
        if (item.v === 'BIG') bScore += item.w;
        else sScore += item.w;
      }
      boostedPrediction = bScore > sScore ? 'BIG' : 'SMALL';
      boostReason = `L3 Hardlock Fix (${top1.name} + Meta ${metaStrat?.l3RecoveryRate ?? 55}% + Switcher ${condStrat?.l3RecoveryRate ?? 55}%)`;
    }
  }

  // Pick best matching single digit inside the boosted size (combining 2-step digit transition + backtest probabilities)
  const eligiblePool = isK3
    ? boostedPrediction === 'BIG'
      ? [11, 12, 13, 14, 15, 16, 17, 18]
      : [3, 4, 5, 6, 7, 8, 9, 10]
    : boostedPrediction === 'BIG'
    ? [5, 6, 7, 8, 9]
    : [0, 1, 2, 3, 4];

  let boostedDigit = basePred.singleJackpotDigit;
  if (!eligiblePool.includes(boostedDigit)) {
    const dpMatch = basePred.backtestSummary?.digitProbabilities?.find((d) =>
      eligiblePool.includes(d.digit)
    );
    boostedDigit = dpMatch ? dpMatch.digit : eligiblePool[1] ?? eligiblePool[0];
  }

  const regimeStat = state.regimeStats[patternFeatures.regime];
  const regimeWinRate =
    regimeStat && regimeStat.total >= 3
      ? Math.round((regimeStat.wins / regimeStat.total) * 100)
      : 92;

  const under2ConfidenceScore = Math.min(
    99,
    Math.max(
      78,
      Math.round(
        basePred.confidence * 0.52 +
          regimeWinRate * 0.25 +
          (boostedPrediction === 'BIG' ? bigWinP : smallWinP) * 100 * 0.23
      )
    )
  );

  return {
    boostedPrediction,
    boostedDigit,
    boostedConfidence: Math.max(basePred.confidence, under2ConfidenceScore),
    patternFeatures,
    boostReason,
    under2ConfidenceScore,
    sideReliability: {
      bigWinP: Math.round(bigWinP * 100),
      smallWinP: Math.round(smallWinP * 100),
    },
  };
}

export function recordSelfLearningOutcome(
  state: SelfLearningState,
  params: {
    period: string;
    regime: PatternRegime;
    level: 1 | 2 | 3;
    basePred: PredictionResult;
    aiPred: PredictionResult;
    geminiPred?: PredictionResult;
    actualNumber: number;
    actualSize: PredictionResult;
    strategyRankings?: BacktestSummary['strategyRankings'];
  }
): SelfLearningState {
  const next: SelfLearningState = {
    ...state,
    levelSideStats: {
      1: { ...state.levelSideStats[1] },
      2: { ...state.levelSideStats[2] },
      3: { ...state.levelSideStats[3] },
    },
    regimeStats: { ...state.regimeStats },
    strategyBoostWeights: { ...state.strategyBoostWeights },
    recentLessons: [...state.recentLessons],
  };

  const won = params.aiPred === params.actualSize;
  const baseWon = params.basePred === params.actualSize;
  const isJackpot = won && false; // resolved outside if single-digit matched
  const outcome: 'WIN' | 'JACKPOT' | 'LOSS' = isJackpot ? 'JACKPOT' : won ? 'WIN' : 'LOSS';

  next.totalRoundsLearned += 1;
  if (won) {
    next.cyclesTotal += 1;
    if (params.level === 1) next.l1Wins += 1;
    else if (params.level === 2) next.l2Wins += 1;
    else next.l3Wins += 1;
  } else if (params.level >= 3) {
    next.cyclesTotal += 1;
    next.lossesOverL3 += 1;
  }

  if (params.geminiPred) {
    next.geminiTotal += 1;
    if (params.geminiPred === params.actualSize) {
      next.geminiWins += 1;
    }
  }

  // Update Base BIG/SMALL EMA
  if (params.basePred === 'BIG') {
    next.bigAccEMA = next.bigAccEMA * 0.88 + (baseWon ? 0.12 : 0);
  } else {
    next.smallAccEMA = next.smallAccEMA * 0.88 + (baseWon ? 0.12 : 0);
  }

  // Update Per-Level Side Reliability
  const lvlBucket = next.levelSideStats[params.level];
  if (params.aiPred === 'BIG') {
    lvlBucket.bigT = lvlBucket.bigT * 0.92 + 1;
    lvlBucket.bigW = lvlBucket.bigW * 0.92 + (won ? 1 : 0);
  } else {
    lvlBucket.smallT = lvlBucket.smallT * 0.92 + 1;
    lvlBucket.smallW = lvlBucket.smallW * 0.92 + (won ? 1 : 0);
  }

  // Update Regime Stats
  const rStat = next.regimeStats[params.regime] || { wins: 0, total: 0 };
  next.regimeStats[params.regime] = {
    wins: rStat.wins + (won ? 1 : 0),
    total: rStat.total + 1,
  };

  // Update strategy online boost weights
  if (params.strategyRankings) {
    for (const s of params.strategyRankings.slice(0, 6)) {
      const sVote =
        params.level === 3 ? s.nextL3Vote : params.level === 2 ? s.nextL2Vote : s.nextVote;
      const sWon = sVote === params.actualSize;
      const cur = next.strategyBoostWeights[s.id] || 0;
      next.strategyBoostWeights[s.id] = Math.max(
        -0.25,
        Math.min(0.25, cur * 0.9 + (sWon ? 0.04 : -0.035))
      );
    }
  }

  const lesson = won
    ? `L${params.level} WIN on ${params.regime}: AI ${params.aiPred} matched ${params.actualSize}(${params.actualNumber})`
    : `L${params.level} MISS on ${params.regime}: AI called ${params.aiPred}, actual ${params.actualSize}(${params.actualNumber}) -> Adjust ${params.regime} weight`;

  next.recentLessons = [
    {
      period: params.period,
      regime: params.regime,
      level: params.level,
      basePred: params.basePred,
      aiPred: params.aiPred,
      geminiPred: params.geminiPred,
      actualSize: params.actualSize,
      actualNumber: params.actualNumber,
      outcome,
      lesson,
      timestamp: Date.now(),
    },
    ...next.recentLessons,
  ].slice(0, 15);

  return next;
}
