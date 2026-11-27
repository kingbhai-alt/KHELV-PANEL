import React, { useMemo, useState } from 'react';
import { LotteryStats } from '../services/lotteryService';
import { BacktestSummary } from '../logic/backtestEngine';
import { SelfLearningState } from '../logic/aiSelfLearningEngine';

interface InvestmentRoiCalculatorProps {
  stats: LotteryStats;
  backtestSummary?: BacktestSummary;
  selfLearningState?: SelfLearningState | null;
  gameMode: string;
}

function formatCurrency(val: number): string {
  if (!Number.isFinite(val)) return '₹0';
  const sign = val < 0 ? '-' : '';
  return `${sign}₹${Math.abs(Math.round(val)).toLocaleString('en-IN')}`;
}

export const InvestmentRoiCalculator: React.FC<InvestmentRoiCalculatorProps> = ({
  stats,
  backtestSummary,
  selfLearningState,
  gameMode,
}) => {
  const [capitalInput, setCapitalInput] = useState<string>('5000');
  const [targetPctInput, setTargetPctInput] = useState<string>('30');
  const [compounding, setCompounding] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const startingCapital = useMemo(() => {
    const parsed = parseFloat(capitalInput);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(100000000, Math.max(100, parsed)) : 1000;
  }, [capitalInput]);

  const targetProfitPct = useMemo(() => {
    const parsed = parseFloat(targetPctInput);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(1000, Math.max(1, parsed)) : 25;
  }, [targetPctInput]);

  const projection = useMemo(() => {
    const liveTotal = stats.wins + stats.losses;
    const liveU3Wins = stats.level1Wins + stats.level2Wins + stats.level3Wins;
    const aiCycles = selfLearningState?.cyclesTotal || 0;
    const aiU3Wins = selfLearningState
      ? selfLearningState.l1Wins + selfLearningState.l2Wins + selfLearningState.l3Wins
      : 0;

    // 1. Live vs Backtest Round Win Rate (%)
    const backtestL1 = backtestSummary?.bestLevel1Accuracy ?? 58;
    const backtestU3 = backtestSummary?.bestUnder3FixRate ?? backtestSummary?.ensembleUnder3FixRate ?? 92;

    const liveWeight = liveTotal > 0 ? Math.min(0.65, liveTotal / 20) : 0;
    const effectiveRoundWinRate =
      liveTotal > 0
        ? Math.round((stats.winRate * liveWeight + backtestL1 * (1 - liveWeight)) * 10) / 10
        : backtestL1;

    // 2. Effective 3-Level Cycle Fix Rate (%)
    const liveCycleWinRate =
      liveTotal >= 3 && liveU3Wins > 0
        ? Math.min(99, (liveU3Wins / Math.max(1, liveU3Wins + Math.max(0, stats.losses - (stats.level1Wins + stats.level2Wins > 0 ? Math.floor(stats.losses * 0.65) : 0)))) * 100)
        : aiCycles >= 3
        ? (aiU3Wins / aiCycles) * 100
        : backtestU3;

    const cycleWeight = liveTotal >= 4 ? Math.min(0.55, liveTotal / 25) : aiCycles >= 4 ? 0.35 : 0;
    const effectiveCycleFixRate = Math.min(
      99.2,
      Math.max(55, Math.round((liveCycleWinRate * cycleWeight + backtestU3 * (1 - cycleWeight)) * 10) / 10)
    );

    // 3. Streak Momentum Multiplier (rewards active hot streaks + best session streak)
    const streakBoostFactor =
      1 + Math.min(0.45, stats.streak * 0.055 + stats.bestStreak * 0.015);
    const streakBoostPct = Math.round((streakBoostFactor - 1) * 100);

    // 4. Safe 3-Level Fix Stake Sizing (1x : 2.1x : 4.4x = 7.5x reserve, ~12-bankroll divider)
    const l1Stake = Math.max(10, Math.round(startingCapital / 15));
    const l2Stake = Math.round(l1Stake * 2.1);
    const l3Stake = Math.round(l1Stake * 4.4);
    const totalReserve3L = l1Stake + l2Stake + l3Stake; // 7.5x

    // Standard WinGo 1.96x payout:
    // Avg winning cycle net = +1.01 * l1Stake; Bust past L3 = -7.5 * l1Stake
    const pCycle = effectiveCycleFixRate / 100;
    const avgWinCycleReturn = 1.01 * l1Stake;
    const bustCost = totalReserve3L;
    const baseEvPerCycle = pCycle * avgWinCycleReturn - (1 - pCycle) * bustCost;
    const streakEvPerCycle = baseEvPerCycle > 0 ? baseEvPerCycle * streakBoostFactor : baseEvPerCycle;

    // Rate per cycle as % of capital
    const baseRatePerCycle = baseEvPerCycle / startingCapital;
    const streakRatePerCycle = streakEvPerCycle / startingCapital;

    const targetProfitAmount = startingCapital * (targetProfitPct / 100);
    const targetCapital = startingCapital + targetProfitAmount;

    // Simulate horizon curve over 50 cycles
    const horizons = [10, 25, 50];
    const pointsBase: number[] = [startingCapital];
    const pointsStreak: number[] = [startingCapital];

    let curBase = startingCapital;
    let curStreak = startingCapital;
    let cyclesToTargetBase: number | null = null;
    let cyclesToTargetStreak: number | null = null;

    for (let c = 1; c <= 120; c++) {
      if (compounding) {
        curBase = Math.max(0, curBase * (1 + baseRatePerCycle));
        curStreak = Math.max(0, curStreak * (1 + streakRatePerCycle));
      } else {
        curBase = Math.max(0, curBase + baseEvPerCycle);
        curStreak = Math.max(0, curStreak + streakEvPerCycle);
      }

      if (cyclesToTargetBase === null && curBase >= targetCapital) {
        cyclesToTargetBase = c;
      }
      if (cyclesToTargetStreak === null && curStreak >= targetCapital) {
        cyclesToTargetStreak = c;
      }

      if (c <= 50) {
        pointsBase.push(curBase);
        pointsStreak.push(curStreak);
      }
    }

    const milestone10 = {
      baseBal: pointsBase[10] ?? startingCapital,
      streakBal: pointsStreak[10] ?? startingCapital,
    };
    const milestone25 = {
      baseBal: pointsBase[25] ?? startingCapital,
      streakBal: pointsStreak[25] ?? startingCapital,
    };
    const milestone50 = {
      baseBal: pointsBase[50] ?? startingCapital,
      streakBal: pointsStreak[50] ?? startingCapital,
    };

    const projectedRoi50Pct = Math.round(((milestone50.streakBal - startingCapital) / startingCapital) * 100);

    return {
      effectiveRoundWinRate,
      effectiveCycleFixRate,
      streakBoostPct,
      l1Stake,
      l2Stake,
      l3Stake,
      totalReserve3L,
      baseEvPerCycle,
      streakEvPerCycle,
      targetCapital,
      targetProfitAmount,
      cyclesToTargetBase,
      cyclesToTargetStreak,
      milestone10,
      milestone25,
      milestone50,
      projectedRoi50Pct,
      pointsBase: pointsBase.slice(0, 31),
      pointsStreak: pointsStreak.slice(0, 31),
      rateSource:
        liveTotal >= 3
          ? `Live (${liveTotal} rds) + ${backtestSummary?.datasetSize ?? 600}-Draw Backtest`
          : `${backtestSummary?.datasetSize ?? 600}-Draw Backtest (${gameMode})`,
    };
  }, [startingCapital, targetProfitPct, compounding, stats, backtestSummary, selfLearningState, gameMode]);

  // Build SVG Sparkline points for 0..30 cycles
  const sparkline = useMemo(() => {
    const w = 280;
    const h = 58;
    const pad = 6;
    const allVals = [...projection.pointsBase, ...projection.pointsStreak, projection.targetCapital];
    const minV = Math.min(...allVals) * 0.98;
    const maxV = Math.max(...allVals) * 1.02;
    const span = Math.max(1, maxV - minV);

    const toPoints = (arr: number[]) =>
      arr
        .map((val, idx) => {
          const x = pad + (idx / Math.max(1, arr.length - 1)) * (w - pad * 2);
          const y = h - pad - ((val - minV) / span) * (h - pad * 2);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    const targetY = h - pad - ((projection.targetCapital - minV) / span) * (h - pad * 2);

    return {
      w,
      h,
      baseLine: toPoints(projection.pointsBase),
      streakLine: toPoints(projection.pointsStreak),
      targetY: Math.max(pad, Math.min(h - pad, targetY)),
    };
  }, [projection]);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0e1124] via-[#0b0e1d] to-[#11152c] border border-emerald-500/40 p-2.5 shadow-xl mb-2 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-left cursor-pointer group"
        >
          <span className="text-sm">📈</span>
          <div>
            <div className="font-extrabold text-xs sm:text-sm text-emerald-400 tracking-wide flex items-center gap-1.5">
              <span>Investment ROI Calculator</span>
              <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                U3 {projection.effectiveCycleFixRate}%
              </span>
            </div>
            <div className="text-[8.5px] font-mono text-slate-400">
              Source: {projection.rateSource}
              {projection.streakBoostPct > 0 ? ` · 🔥 +${projection.streakBoostPct}% Streak Boost` : ''}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCompounding((c) => !c)}
            className={`px-2 py-0.5 rounded-lg text-[8.5px] font-mono font-bold border transition-colors cursor-pointer ${
              compounding
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                : 'bg-slate-900 text-slate-300 border-slate-700'
            }`}
            title="Toggle Compound vs Flat Base Stake"
          >
            {compounding ? '⚡ Compound' : '📊 Flat Base'}
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="px-1.5 py-0.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[9px] font-mono cursor-pointer"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {/* Input Controls: Starting Capital + Target Profit % */}
          <div className="grid grid-cols-2 gap-2">
            {/* Starting Capital */}
            <div className="p-2 rounded-xl bg-black/45 border border-slate-800">
              <label className="block text-[8.5px] font-bold uppercase text-slate-400 mb-1">
                Starting Capital (₹)
              </label>
              <input
                type="number"
                min={100}
                step={100}
                value={capitalInput}
                onChange={(e) => setCapitalInput(e.target.value)}
                aria-label="Starting Capital"
                className="w-full px-2 py-1 rounded-lg bg-[#070914] border border-slate-700 focus:border-emerald-400 outline-none text-xs font-mono font-black text-white tabular-nums"
              />
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {[1000, 5000, 10000, 25000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCapitalInput(String(preset))}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono cursor-pointer border transition-colors ${
                      Number(capitalInput) === preset
                        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {preset >= 1000 ? `${preset / 1000}K` : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Profit % */}
            <div className="p-2 rounded-xl bg-black/45 border border-slate-800">
              <label className="block text-[8.5px] font-bold uppercase text-slate-400 mb-1">
                Target Profit (%)
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                step={5}
                value={targetPctInput}
                onChange={(e) => setTargetPctInput(e.target.value)}
                aria-label="Target Profit Percentage"
                className="w-full px-2 py-1 rounded-lg bg-[#070914] border border-slate-700 focus:border-amber-400 outline-none text-xs font-mono font-black text-amber-300 tabular-nums"
              />
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {[15, 30, 50, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTargetPctInput(String(pct))}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono cursor-pointer border transition-colors ${
                      Number(targetPctInput) === pct
                        ? 'bg-amber-500/25 text-amber-300 border-amber-400/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Key Projected Metrics */}
          <div className="grid grid-cols-4 gap-1 text-center font-mono tabular-nums">
            <div className="p-1.5 rounded-xl bg-emerald-950/35 border border-emerald-500/35">
              <div className="text-[8px] text-slate-400 uppercase font-sans font-bold">Target Value</div>
              <div className="text-[11px] font-black text-emerald-300">
                {formatCurrency(projection.targetCapital)}
              </div>
              <div className="text-[8px] text-emerald-400/80">
                +{formatCurrency(projection.targetProfitAmount)}
              </div>
            </div>

            <div className="p-1.5 rounded-xl bg-sky-950/35 border border-sky-500/35">
              <div className="text-[8px] text-slate-400 uppercase font-sans font-bold">Target Hit</div>
              <div className="text-[11px] font-black text-sky-300">
                {projection.cyclesToTargetStreak !== null
                  ? `~${projection.cyclesToTargetStreak} rds`
                  : projection.streakEvPerCycle > 0
                  ? '>120 rds'
                  : 'Wait Signal'}
              </div>
              <div className="text-[8px] text-slate-400">
                Base: {projection.cyclesToTargetBase ? `${projection.cyclesToTargetBase}r` : '—'}
              </div>
            </div>

            <div className="p-1.5 rounded-xl bg-amber-950/35 border border-amber-500/35">
              <div className="text-[8px] text-slate-400 uppercase font-sans font-bold">EV / Cycle</div>
              <div
                className={`text-[11px] font-black ${
                  projection.streakEvPerCycle >= 0 ? 'text-amber-300' : 'text-red-400'
                }`}
              >
                {projection.streakEvPerCycle >= 0 ? '+' : ''}
                {formatCurrency(projection.streakEvPerCycle)}
              </div>
              <div className="text-[8px] text-slate-400">
                L1 Win {projection.effectiveRoundWinRate}%
              </div>
            </div>

            <div className="p-1.5 rounded-xl bg-violet-950/35 border border-violet-500/35">
              <div className="text-[8px] text-slate-400 uppercase font-sans font-bold">50-Rd ROI</div>
              <div
                className={`text-[11px] font-black ${
                  projection.projectedRoi50Pct >= 0 ? 'text-violet-300' : 'text-red-400'
                }`}
              >
                {projection.projectedRoi50Pct >= 0 ? '+' : ''}
                {projection.projectedRoi50Pct}%
              </div>
              <div className="text-[8px] text-slate-400">
                Streak {stats.streak} / {stats.bestStreak}
              </div>
            </div>
          </div>

          {/* Mini SVG Projected Growth Curve (0 -> 30 Cycles) */}
          <div className="rounded-xl bg-black/50 border border-slate-800/90 p-2">
            <div className="flex items-center justify-between text-[8px] font-mono mb-1">
              <span className="text-slate-300 font-bold">
                30-Cycle Projected Growth Curve ({compounding ? 'Compounded' : 'Linear'})
              </span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">● Streak Pace</span>
                <span className="text-sky-400">● Base Pace</span>
                <span className="text-amber-300">-- Target</span>
              </div>
            </div>
            <svg
              viewBox={`0 0 ${sparkline.w} ${sparkline.h}`}
              className="w-full h-14 overflow-visible"
              role="img"
              aria-label="Projected Investment ROI Growth Curve"
            >
              <line
                x1={6}
                y1={sparkline.targetY}
                x2={sparkline.w - 6}
                y2={sparkline.targetY}
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.7"
              />
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.6"
                points={sparkline.baseLine}
                opacity="0.75"
              />
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.2"
                points={sparkline.streakLine}
              />
            </svg>

            {/* Horizon Milestones Strip */}
            <div className="grid grid-cols-3 gap-1.5 mt-1.5 pt-1.5 border-t border-white/5 text-[8.5px] font-mono text-center tabular-nums">
              <div className="rounded-lg bg-slate-900/70 px-1.5 py-1">
                <div className="text-slate-400 text-[7.5px]">10 Cycles</div>
                <div className="text-emerald-300 font-bold">{formatCurrency(projection.milestone10.streakBal)}</div>
              </div>
              <div className="rounded-lg bg-slate-900/70 px-1.5 py-1">
                <div className="text-slate-400 text-[7.5px]">25 Cycles</div>
                <div className="text-emerald-300 font-bold">{formatCurrency(projection.milestone25.streakBal)}</div>
              </div>
              <div className="rounded-lg bg-slate-900/70 px-1.5 py-1">
                <div className="text-slate-400 text-[7.5px]">50 Cycles</div>
                <div className="text-amber-300 font-bold">{formatCurrency(projection.milestone50.streakBal)}</div>
              </div>
            </div>
          </div>

          {/* 3-Level Fix Stake Allocation Guardrail */}
          <div className="flex items-center justify-between px-2 py-1 rounded-xl bg-slate-950/90 border border-slate-800 text-[8.5px] font-mono text-slate-300 tabular-nums">
            <span className="text-slate-400 font-bold">3-Lvl Reserve Plan:</span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-300">L1: {formatCurrency(projection.l1Stake)}</span>
              <span className="text-sky-300">L2: {formatCurrency(projection.l2Stake)}</span>
              <span className="text-amber-300">L3: {formatCurrency(projection.l3Stake)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
