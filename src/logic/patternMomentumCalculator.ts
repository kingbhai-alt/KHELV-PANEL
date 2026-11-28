import { DrawItem, isK3Game, WinGoMode, calculateQuantumDriftAnalysis } from '../services/lotteryService';
import { get_big_small, DynamicTrendRecognitionResult, ClusterVote, PredictionResult } from './jujutsuEngine';
import { BacktestSummary } from './backtestEngine';

export interface PatternClusterMomentum {
  id: string;
  name: string;
  shortLabel: string;
  category: 'DRAGON' | 'MIRROR' | 'ZIGZAG' | 'QUANTUM_DRIFT' | 'CONSENSUS';
  currentStability: number; // 0 - 100
  momentumDirection: 'BIG' | 'SMALL' | 'NEUTRAL';
  trendState: string;
  metrics: {
    streakOrDepth: number;
    velocity?: number;
    acceleration?: number;
    flipRate?: number;
    confidence: number;
  };
  timeSeries: {
    sliceIndex: number;
    label: string;
    period: string;
    stability: number; // 0 - 100
    dominantSize: 'BIG' | 'SMALL';
    details: string;
    status: 'PEAK' | 'STABLE' | 'TRANSITION' | 'DORMANT';
  }[];
}

export interface PatternMomentumDashboardData {
  clusters: PatternClusterMomentum[];
  overallStability: number;
  activeRegime: string;
  under2RecoveryReadiness: number;
  quantumBias: 'BIG' | 'SMALL' | 'NEUTRAL';
  quantumMagnitude: number;
  timeSliceLabels: string[];
}

/**
 * Calculates live Pattern Momentum & Cluster Stability Matrix across historical horizons
 * Maps Dragon, Mirror, ZigZag, Quantum Drift, and Consensus clusters for D3 Heatmap rendering.
 */
export function calculatePatternMomentumData(
  drawItems: DrawItem[],
  gameMode: WinGoMode,
  horizonSlices: number = 12,
  dtrAnalysis?: DynamicTrendRecognitionResult,
  backtestSummary?: BacktestSummary,
  clusterVotes?: ClusterVote[]
): PatternMomentumDashboardData {
  const isK3 = isK3Game(gameMode);
  const rawNums: number[] = (drawItems || []).map((d) => Number(d.number) || 0);
  const sizes: PredictionResult[] = rawNums.map((n) => get_big_small(n, isK3));
  const periods: string[] = (drawItems || []).map((d) => d.issueNumber || '');

  const numSlices = Math.min(horizonSlices, Math.max(6, Math.floor(rawNums.length / 2)));
  const timeSliceLabels: string[] = [];

  for (let i = 0; i < numSlices; i++) {
    const p = periods[i] || '';
    const shortP = p.length > 4 ? p.slice(-4) : p || `T-${i}`;
    timeSliceLabels.push(i === 0 ? 'Live (T-0)' : `#${shortP}`);
  }

  // 1. DRAGON STREAK MOMENTUM CLUSTER
  const dragonTimeSeries: PatternClusterMomentum['timeSeries'] = [];
  for (let t = 0; t < numSlices; t++) {
    const s0 = sizes[t] || 'BIG';
    let streak = 1;
    for (let j = t + 1; j < Math.min(t + 15, sizes.length); j++) {
      if (sizes[j] === s0) streak++;
      else break;
    }

    let stability = 45;
    let status: 'PEAK' | 'STABLE' | 'TRANSITION' | 'DORMANT' = 'DORMANT';
    if (streak >= 5) {
      stability = 98;
      status = 'PEAK';
    } else if (streak >= 3) {
      stability = 92;
      status = 'STABLE';
    } else if (streak === 2) {
      stability = 74;
      status = 'TRANSITION';
    } else {
      stability = 42;
      status = 'DORMANT';
    }

    const p = periods[t] || `T-${t}`;
    dragonTimeSeries.push({
      sliceIndex: t,
      label: timeSliceLabels[t],
      period: p,
      stability,
      dominantSize: s0,
      details: `${streak}x Consecutive ${s0} Streak`,
      status,
    });
  }

  const liveDragonStreak = dragonTimeSeries[0]?.details || '1x Streak';
  const liveDragonStability = dragonTimeSeries[0]?.stability || 50;

  // 2. MIRROR PALINDROME SYMMETRY CLUSTER
  const mirrorTimeSeries: PatternClusterMomentum['timeSeries'] = [];
  for (let t = 0; t < numSlices; t++) {
    const sub = sizes.slice(t, t + 7);
    const n = sub.length;
    let stability = 38;
    let details = 'No Symmetry';
    let status: 'PEAK' | 'STABLE' | 'TRANSITION' | 'DORMANT' = 'DORMANT';

    if (n >= 6 && sub[0] === sub[5] && sub[1] === sub[4] && sub[2] === sub[3]) {
      stability = 97;
      details = '6R Mirror Symmetry (ABC-CBA)';
      status = 'PEAK';
    } else if (n >= 5 && sub[0] === sub[4] && sub[1] === sub[3]) {
      stability = 92;
      details = `5R Palindrome (${sub[4]}${sub[3]}-${sub[2]}-${sub[1]}${sub[0]})`;
      status = 'STABLE';
    } else if (n >= 4 && sub[0] === sub[3] && sub[1] === sub[2] && sub[0] !== sub[1]) {
      stability = 88;
      details = '4R Pair Mirror (A-BB-A)';
      status = 'STABLE';
    } else if (n >= 6 && sub[0] === sub[1] && sub[2] === sub[3] && sub[4] === sub[5] && sub[0] === sub[4]) {
      stability = 86;
      details = 'Double-Pair Wave (AA-BB-AA)';
      status = 'STABLE';
    } else if (n >= 4 && sub[0] === sub[3]) {
      stability = 68;
      details = '3R Mirror Echo (A-X-X-A)';
      status = 'TRANSITION';
    }

    mirrorTimeSeries.push({
      sliceIndex: t,
      label: timeSliceLabels[t],
      period: periods[t] || `T-${t}`,
      stability,
      dominantSize: sub[0] || 'BIG',
      details,
      status,
    });
  }

  // 3. ZIGZAG PARITY OSCILLATION CLUSTER
  const zigzagTimeSeries: PatternClusterMomentum['timeSeries'] = [];
  for (let t = 0; t < numSlices; t++) {
    const sub = sizes.slice(t, t + 6);
    const n = sub.length;
    let altStreak = 1;
    for (let i = 1; i < n; i++) {
      if (sub[i] !== sub[i - 1]) altStreak++;
      else break;
    }

    let flips = 0;
    for (let i = 0; i < n - 1; i++) {
      if (sub[i] !== sub[i + 1]) flips++;
    }

    const flipRatio = n > 1 ? flips / (n - 1) : 0;
    let stability = Math.round(35 + flipRatio * 60);
    let status: 'PEAK' | 'STABLE' | 'TRANSITION' | 'DORMANT' = 'DORMANT';
    let details = `${flips}/${n - 1} Flips (${Math.round(flipRatio * 100)}%)`;

    if (altStreak >= 4 || flipRatio >= 0.85) {
      stability = 96;
      status = 'PEAK';
      details = `Pure Alternation (${altStreak}x Wave)`;
    } else if (altStreak >= 3 || flipRatio >= 0.65) {
      stability = 89;
      status = 'STABLE';
      details = `Oscillating Wave (${altStreak}x Switch)`;
    } else if (flipRatio >= 0.5) {
      stability = 68;
      status = 'TRANSITION';
    }

    zigzagTimeSeries.push({
      sliceIndex: t,
      label: timeSliceLabels[t],
      period: periods[t] || `T-${t}`,
      stability,
      dominantSize: sub[0] === 'BIG' ? 'SMALL' : 'BIG',
      details,
      status,
    });
  }

  // 4. QUANTUM DRIFT MOMENTUM CLUSTER
  const quantumTimeSeries: PatternClusterMomentum['timeSeries'] = [];
  for (let t = 0; t < numSlices; t++) {
    const sliceDraws = rawNums.slice(t, t + 45);
    const qd = calculateQuantumDriftAnalysis(sliceDraws, isK3);
    const mag = qd.driftMagnitude;
    const vBig = qd.sizeVelocity.big;
    const aBig = qd.sizeAcceleration.big;

    let stability = Math.min(98, Math.max(48, Math.round(62 + mag * 135)));
    let status: 'PEAK' | 'STABLE' | 'TRANSITION' | 'DORMANT' = 'TRANSITION';

    if (qd.exhaustionDetected) {
      stability = 68;
      status = 'TRANSITION';
    } else if (mag >= 0.12) {
      stability = 95;
      status = 'PEAK';
    } else if (mag >= 0.05) {
      stability = 86;
      status = 'STABLE';
    } else {
      status = 'DORMANT';
    }

    const vSign = vBig >= 0 ? '+' : '';
    const aSign = aBig >= 0 ? '+' : '';
    const details = `v=${vSign}${vBig.toFixed(2)}, a=${aSign}${aBig.toFixed(2)} [${qd.driftBias}]`;

    quantumTimeSeries.push({
      sliceIndex: t,
      label: timeSliceLabels[t],
      period: periods[t] || `T-${t}`,
      stability,
      dominantSize: qd.driftBias === 'NEUTRAL' ? (sizes[t] || 'BIG') : qd.driftBias,
      details,
      status,
    });
  }

  // 5. 18-CLUSTER CONSENSUS ENSEMBLE STABILITY
  const consensusTimeSeries: PatternClusterMomentum['timeSeries'] = [];
  const baseU2Rate = backtestSummary?.bestUnder2FixRate ?? 82;
  const baseU3Rate = backtestSummary?.bestUnder3FixRate ?? 92;

  for (let t = 0; t < numSlices; t++) {
    let stability = 88;
    let details = '18 Clusters Weighted Consensus';
    let status: 'PEAK' | 'STABLE' | 'TRANSITION' | 'DORMANT' = 'STABLE';

    if (t === 0) {
      stability = Math.min(99, Math.max(90, dtrAnalysis?.winProbabilityThreshold ?? 95));
      status = 'PEAK';
      details = `${clusterVotes?.length || 18} Clusters Active (${stability}% Thresh)`;
    } else {
      const decay = Math.round(t * 1.2);
      stability = Math.max(76, baseU3Rate - decay);
      details = `Backtest Multi-Node Agreement (${stability}%)`;
    }

    consensusTimeSeries.push({
      sliceIndex: t,
      label: timeSliceLabels[t],
      period: periods[t] || `T-${t}`,
      stability,
      dominantSize: sizes[t] || 'BIG',
      details,
      status,
    });
  }

  const clusters: PatternClusterMomentum[] = [
    {
      id: 'cluster-dragon',
      name: 'Dragon Momentum Lock',
      shortLabel: 'Dragon Streak',
      category: 'DRAGON',
      currentStability: liveDragonStability,
      momentumDirection: dragonTimeSeries[0]?.dominantSize || 'BIG',
      trendState: liveDragonStreak,
      metrics: {
        streakOrDepth: dtrAnalysis?.streakLength || 1,
        confidence: dtrAnalysis?.winProbabilityThreshold || 88,
      },
      timeSeries: dragonTimeSeries,
    },
    {
      id: 'cluster-mirror',
      name: 'Mirror Palindrome Symmetry',
      shortLabel: 'Mirror Symmetry',
      category: 'MIRROR',
      currentStability: mirrorTimeSeries[0]?.stability || 45,
      momentumDirection: mirrorTimeSeries[0]?.dominantSize || 'BIG',
      trendState: mirrorTimeSeries[0]?.details || 'Symmetry Monitoring',
      metrics: {
        streakOrDepth: dtrAnalysis?.isMirrorPattern ? 5 : 2,
        confidence: dtrAnalysis?.isMirrorPattern ? 94 : 78,
      },
      timeSeries: mirrorTimeSeries,
    },
    {
      id: 'cluster-zigzag',
      name: 'ZigZag Parity Oscillator',
      shortLabel: 'ZigZag Wave',
      category: 'ZIGZAG',
      currentStability: zigzagTimeSeries[0]?.stability || 50,
      momentumDirection: zigzagTimeSeries[0]?.dominantSize || 'SMALL',
      trendState: zigzagTimeSeries[0]?.details || 'Wave Scanning',
      metrics: {
        streakOrDepth: dtrAnalysis?.isZigzagPattern ? 4 : 1,
        flipRate: 0.72,
        confidence: dtrAnalysis?.isZigzagPattern ? 94 : 80,
      },
      timeSeries: zigzagTimeSeries,
    },
    {
      id: 'cluster-quantum',
      name: 'Quantum Drift Velocity & Accel',
      shortLabel: 'Quantum Drift',
      category: 'QUANTUM_DRIFT',
      currentStability: quantumTimeSeries[0]?.stability || 75,
      momentumDirection: dtrAnalysis?.quantumDrift?.driftBias || 'NEUTRAL',
      trendState: dtrAnalysis?.quantumDrift?.summary || 'Drift Momentum Active',
      metrics: {
        streakOrDepth: 50,
        velocity: dtrAnalysis?.quantumDrift?.sizeVelocity.big ?? 0,
        acceleration: dtrAnalysis?.quantumDrift?.sizeAcceleration.big ?? 0,
        confidence: 95,
      },
      timeSeries: quantumTimeSeries,
    },
    {
      id: 'cluster-consensus',
      name: 'Consensus Ensemble Stability',
      shortLabel: 'Consensus',
      category: 'CONSENSUS',
      currentStability: consensusTimeSeries[0]?.stability || 95,
      momentumDirection: sizes[0] || 'BIG',
      trendState: `${clusterVotes?.length || 18} Clusters Dynamic Balance`,
      metrics: {
        streakOrDepth: 18,
        confidence: baseU3Rate,
      },
      timeSeries: consensusTimeSeries,
    },
  ];

  // Compute Overall Live Stability Index
  const weights = [0.25, 0.20, 0.20, 0.20, 0.15];
  let weightedSum = 0;
  clusters.forEach((c, idx) => {
    weightedSum += c.currentStability * (weights[idx] || 0.2);
  });
  const overallStability = Math.round(weightedSum);

  const activeRegime = dtrAnalysis?.detectedTrend || (
    dtrAnalysis?.hasStreak3
      ? 'Dragon Streak Lock'
      : dtrAnalysis?.isMirrorPattern
      ? 'Mirror Palindrome Wave'
      : dtrAnalysis?.isZigzagPattern
      ? 'ZigZag Parity Alternation'
      : 'Quantum Equilibrium'
  );

  const under2RecoveryReadiness = dtrAnalysis?.under2RecoveryArmed
    ? 98
    : Math.max(baseU2Rate, 85);

  return {
    clusters,
    overallStability,
    activeRegime,
    under2RecoveryReadiness,
    quantumBias: dtrAnalysis?.quantumDrift?.driftBias || 'NEUTRAL',
    quantumMagnitude: dtrAnalysis?.quantumDrift?.driftMagnitude || 0,
    timeSliceLabels,
  };
}
