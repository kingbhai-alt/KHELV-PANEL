import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeWith500Dataset, calculateQuantumDriftAnalysis } from '../services/lotteryService';
import { runFull500RoundBacktest } from './backtestEngine';
import { jujutsu_high_winning_predictor, get_big_small } from './jujutsuEngine';
import {
  computeSelfLearningBoost,
  createInitialSelfLearningState,
  recordSelfLearningOutcome,
} from './aiSelfLearningEngine';

test('mergeWith500Dataset provides >= 1,099 unique historical draws', () => {
  const items = mergeWith500Dataset([], '1M');
  assert.ok(items.length >= 1099, `Expected >= 1099 items, got ${items.length}`);
  const uniquePeriods = new Set(items.map((it) => it.issueNumber));
  assert.equal(uniquePeriods.size, items.length, 'All periods must be deduplicated');
});

test('runFull500RoundBacktest evaluates 28 algorithms & builds windowAnalytics', () => {
  const items = mergeWith500Dataset([], '1M');
  const nums = items.map((it) => Number(it.number));
  const periods = items.map((it) => it.issueNumber);

  const summary = runFull500RoundBacktest('20261127100011156', nums, periods, 1, false, []);
  assert.equal(summary.strategyRankings.length, 28);
  assert.ok(summary.datasetSize >= 1099);
  assert.ok(summary.totalSimulatedRounds >= 1080);
  assert.ok(summary.bestUnder2FixRate >= 70 && summary.bestUnder2FixRate <= 100);
  assert.ok(summary.bestUnder3FixRate >= 85 && summary.bestUnder3FixRate <= 100);
  assert.ok(summary.bestUnder5FixRate >= 95 && summary.bestUnder5FixRate <= 100);
  assert.ok(summary.windowAnalytics.length >= 8);
  for (const w of summary.windowAnalytics) {
    assert.ok(['DRAGON', 'ZIGZAG', 'BALANCED'].includes(w.regimeTag));
    assert.ok(w.rounds > 0);
  }
});

test('jujutsu_high_winning_predictor emits deterministic call across 18 clusters & 170K calcs', () => {
  const items = mergeWith500Dataset([], '1M');
  const nums = items.map((it) => Number(it.number));
  const periods = items.map((it) => it.issueNumber);

  const pred1 = jujutsu_high_winning_predictor(
    '20261127100011156',
    nums,
    null,
    1,
    nums[0],
    false,
    periods,
    []
  );
  const pred2 = jujutsu_high_winning_predictor(
    '20261127100011156',
    nums,
    null,
    1,
    nums[0],
    false,
    periods,
    []
  );

  assert.equal(pred1.prediction, pred2.prediction);
  assert.equal(pred1.singleJackpotDigit, pred2.singleJackpotDigit);
  assert.equal(pred1.clusterVotes.length, 18);
  assert.equal(pred1.userCalcDetail?.total170kCalculations.totalCount, 170000);
  assert.equal(pred1.userCalcDetail?.total170kCalculations.families.length, 10);
  assert.ok(['BIG', 'SMALL'].includes(pred1.prediction));
  assert.ok(
    pred1.prediction === 'BIG'
      ? pred1.singleJackpotDigit >= 5 && pred1.singleJackpotDigit <= 9
      : pred1.singleJackpotDigit >= 0 && pred1.singleJackpotDigit <= 4
  );
});

test('computeSelfLearningBoost adapts cleanly across levels 1-5 and updates state', () => {
  const items = mergeWith500Dataset([], '1M');
  const nums = items.map((it) => Number(it.number));
  const periods = items.map((it) => it.issueNumber);
  let state = createInitialSelfLearningState('1M');

  for (const lvl of [1, 2, 3, 4, 5] as const) {
    const base = jujutsu_high_winning_predictor(
      '20261127100011156',
      nums,
      null,
      lvl,
      nums[0],
      false,
      periods,
      []
    );
    const boost = computeSelfLearningBoost(base, nums, lvl, false, state);
    assert.ok(['BIG', 'SMALL'].includes(boost.boostedPrediction));
    assert.ok(boost.boostedConfidence >= 78 && boost.boostedConfidence <= 99);
    state = recordSelfLearningOutcome(state, {
      period: `TEST-${lvl}`,
      regime: boost.patternFeatures.regime,
      level: lvl,
      basePred: base.prediction,
      aiPred: boost.boostedPrediction,
      actualNumber: 7,
      actualSize: get_big_small(7, false),
      strategyRankings: base.backtestSummary?.strategyRankings,
    });
  }

  assert.equal(state.totalRoundsLearned, 5);
  assert.equal(state.recentLessons.length, 5);
});

test('Dynamic Trend Recognition (DTR) detects dragon/mirror/zigzag and raises threshold on streak of 3', () => {
  const items = mergeWith500Dataset([], '1M');
  const periods = items.map((it) => it.issueNumber);

  // Case A: Streak of 3 identical results (e.g. [9, 8, 7] all BIG -> streak of 3)
  const streak3Nums = [9, 8, 7, 2, 3, 4, 1, 0, 9, 8, ...items.map((it) => Number(it.number))];
  const predStreak3 = jujutsu_high_winning_predictor(
    '20261127100011156',
    streak3Nums,
    null,
    1,
    streak3Nums[0],
    false,
    periods,
    []
  );

  assert.ok(predStreak3.dtrAnalysis, 'dtrAnalysis must be populated');
  assert.equal(predStreak3.dtrAnalysis.hasStreak3, true);
  assert.equal(predStreak3.dtrAnalysis.patternType, 'DRAGON');
  assert.ok(predStreak3.dtrAnalysis.streakLength >= 3);
  assert.ok(predStreak3.dtrAnalysis.winProbabilityThreshold >= 96, `Expected >= 96%, got ${predStreak3.dtrAnalysis.winProbabilityThreshold}%`);
  assert.equal(predStreak3.dtrAnalysis.under2RecoveryArmed, true);
  assert.ok(predStreak3.rule.includes('DTR: STREAK-'));

  // Case B: Streak of 3 at Level 2 (must increase threshold to 98% for <2 level recovery)
  const predStreak3L2 = jujutsu_high_winning_predictor(
    '20261127100011156',
    streak3Nums,
    null,
    2,
    streak3Nums[0],
    false,
    periods,
    []
  );
  assert.equal(predStreak3L2.dtrAnalysis?.winProbabilityThreshold, 98);
  assert.equal(predStreak3L2.dtrAnalysis?.under2RecoveryArmed, true);

  // Case C: ZigZag pattern (alternating outcomes [9, 1, 8, 2, 7, 3, 6, 4, ...])
  const zigzagNums = [9, 1, 8, 2, 7, 3, 6, 4, 9, 0, ...items.map((it) => Number(it.number))];
  const predZigzag = jujutsu_high_winning_predictor(
    '20261127100011156',
    zigzagNums,
    null,
    1,
    zigzagNums[0],
    false,
    periods,
    []
  );
  assert.equal(predZigzag.dtrAnalysis?.isZigzagPattern, true);
  assert.equal(predZigzag.dtrAnalysis?.patternType, 'ZIGZAG');

  // Case D: Mirror palindrome (AA-B-AA: [9, 8, 1, 8, 9, ...])
  const mirrorNums = [9, 8, 1, 8, 9, 2, 3, 4, 5, 6, ...items.map((it) => Number(it.number))];
  const predMirror = jujutsu_high_winning_predictor(
    '20261127100011156',
    mirrorNums,
    null,
    1,
    mirrorNums[0],
    false,
    periods,
    []
  );
  assert.equal(predMirror.dtrAnalysis?.isMirrorPattern, true);
  assert.equal(predMirror.dtrAnalysis?.patternType, 'MIRROR');
});

test('calculateQuantumDriftAnalysis computes velocity, acceleration, and feeds into consensus confidence', () => {
  const items = mergeWith500Dataset([], '1M');
  const nums = items.map((it) => Number(it.number));
  const periods = items.map((it) => it.issueNumber);

  // 1. Direct function test with 50 rounds
  const qdResult = calculateQuantumDriftAnalysis(nums.slice(0, 50), false);
  assert.ok(qdResult.sizeVelocity.big !== undefined);
  assert.ok(qdResult.sizeVelocity.small !== undefined);
  assert.equal(
    Math.round((qdResult.sizeVelocity.big + qdResult.sizeVelocity.small) * 1000),
    0,
    'vSmall must equal -vBig'
  );
  assert.equal(
    Math.round((qdResult.sizeAcceleration.big + qdResult.sizeAcceleration.small) * 1000),
    0,
    'aSmall must equal -aBig'
  );
  assert.ok(qdResult.recoveryReductionMultiplier >= 1.18);
  assert.ok(qdResult.quantumSurgeDigits.length > 0);
  assert.ok(['BIG', 'SMALL', 'NEUTRAL'].includes(qdResult.driftBias));
  assert.ok(qdResult.summary.includes('QD-50R:'));

  // 2. Integration into jujutsu_high_winning_predictor
  const pred = jujutsu_high_winning_predictor(
    '20261127100011156',
    nums,
    null,
    1,
    nums[0],
    false,
    periods,
    []
  );

  assert.ok(pred.dtrAnalysis?.quantumDrift, 'dtrAnalysis must contain quantumDrift');
  assert.ok(pred.rule.includes('QD:'), 'Prediction rule must include Quantum Drift metrics');
  assert.ok(pred.dtrAnalysis.quantumDrift.recoveryReductionMultiplier >= 1.18);

  // 3. Level 2 Recovery test: ensures quantumDrift boosts recovery clusters with recoveryReductionMultiplier
  const predL2 = jujutsu_high_winning_predictor(
    '20261127100011156',
    nums,
    null,
    2,
    nums[0],
    false,
    periods,
    []
  );
  assert.ok(predL2.dtrAnalysis?.under2RecoveryArmed);
  assert.ok(predL2.confidence >= 95, `Expected >= 95% confidence at Level 2, got ${predL2.confidence}%`);
});


