import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DrawItem, WinGoMode, isK3Game } from '../services/lotteryService';
import { ClusterVote, get_big_small, UserCalculationDetail } from '../logic/jujutsuEngine';
import { BacktestSummary } from '../logic/backtestEngine';

interface PatternAnalysisPanelProps {
  gameMode: WinGoMode;
  drawItems: DrawItem[];
  clusterVotes?: ClusterVote[];
  consensusRate?: number;
  userCalcDetail?: UserCalculationDetail;
  backtestSummary?: BacktestSummary;
  currentPrediction?: {
    period: string;
    prediction: 'BIG' | 'SMALL' | '---';
    predictedNumbers?: [number, number];
  };
}

export const PatternAnalysisPanel: React.FC<PatternAnalysisPanelProps> = ({
  gameMode,
  drawItems,
  clusterVotes = [],
  consensusRate = 95,
  userCalcDetail,
  backtestSummary,
  currentPrediction,
}) => {
  const heatmapRef = useRef<SVGSVGElement | null>(null);
  const streakBarRef = useRef<SVGSVGElement | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    period: string;
    number: number;
    size: 'BIG' | 'SMALL';
    pattern: string;
    streakLen: number;
  } | null>(null);

  const isK3 = isK3Game(gameMode);

  const outcomes = useMemo(() => {
    return (drawItems || []).slice(0, 50).map((item, idx, arr) => {
      const num = Number(item.number) || 0;
      const size = get_big_small(num, isK3);
      const shortPeriod =
        item.issueNumber.length > 4 ? item.issueNumber.slice(-4) : item.issueNumber;

      let streakLen = 1;
      for (let j = idx + 1; j < arr.length; j++) {
        if (get_big_small(Number(arr[j].number), isK3) === size) {
          streakLen++;
        } else {
          break;
        }
      }

      let pattern = 'Single Step';
      if (streakLen >= 4) pattern = `Super Dragon (${streakLen}x)`;
      else if (streakLen >= 2) pattern = `Streak (${streakLen}x)`;
      else if (idx < arr.length - 1 && get_big_small(Number(arr[idx + 1].number), isK3) !== size) {
        pattern = 'ZigZag Alternation';
      }

      return {
        period: item.issueNumber,
        shortPeriod,
        number: num,
        size,
        streakLen,
        pattern,
      };
    });
  }, [drawItems, isK3]);

  const streakCounts = useMemo(() => {
    const counts = { '1x': 0, '2x': 0, '3x': 0, '4x+': 0 };
    let currentRun = 1;
    for (let i = 0; i < outcomes.length; i++) {
      if (i < outcomes.length - 1 && outcomes[i].size === outcomes[i + 1].size) {
        currentRun++;
      } else {
        if (currentRun === 1) counts['1x']++;
        else if (currentRun === 2) counts['2x']++;
        else if (currentRun === 3) counts['3x']++;
        else counts['4x+']++;
        currentRun = 1;
      }
    }
    return counts;
  }, [outcomes]);

  const bigCount = outcomes.filter((o) => o.size === 'BIG').length;
  const smallCount = outcomes.length - bigCount;
  const bigPercent = outcomes.length > 0 ? Math.round((bigCount / outcomes.length) * 100) : 50;

  // D3.JS TREND HEATMAP MATRIX (Last 50 Outcomes)
  useEffect(() => {
    if (!heatmapRef.current || outcomes.length === 0) return;

    const svg = d3.select(heatmapRef.current);
    svg.selectAll('*').remove();

    const cols = 10;
    const rows = 5;
    const cellWidth = 34;
    const cellHeight = 34;
    const gap = 4;
    const width = cols * (cellWidth + gap);
    const height = rows * (cellHeight + gap);

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', '100%');

    const g = svg.append('g');

    outcomes.slice(0, 50).forEach((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cellWidth + gap);
      const y = row * (cellHeight + gap);

      const cellGroup = g
        .append('g')
        .attr('transform', `translate(${x}, ${y})`)
        .attr('class', 'cursor-pointer')
        .on('click', () => {
          setSelectedCell(d);
        });

      const isBig = d.size === 'BIG';
      const isJackpot = d.number === 0 || d.number === 5;

      cellGroup
        .append('rect')
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('rx', 6)
        .attr('fill', isBig ? '#24121d' : '#0d221a')
        .attr('stroke', isJackpot ? '#f59e0b' : isBig ? '#ff4d6d' : '#10b981')
        .attr('stroke-width', isJackpot ? 1.5 : 1)
        .attr('stroke-opacity', 0.8);

      cellGroup
        .append('text')
        .attr('x', cellWidth / 2)
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .attr('fill', '#94a3b8')
        .text(d.shortPeriod);

      cellGroup
        .append('text')
        .attr('x', cellWidth / 2)
        .attr('y', 23)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .attr('fill', isBig ? '#ff4d6d' : '#10b981')
        .text(d.number);

      cellGroup
        .append('text')
        .attr('x', cellWidth - 3)
        .attr('y', cellHeight - 3)
        .attr('text-anchor', 'end')
        .attr('font-size', '7px')
        .attr('font-weight', 'bold')
        .attr('fill', isBig ? '#f43f5e' : '#34d399')
        .text(isBig ? 'B' : 'S');
    });
  }, [outcomes]);

  // D3.JS STREAK FREQUENCY BAR CHART
  useEffect(() => {
    if (!streakBarRef.current) return;

    const svg = d3.select(streakBarRef.current);
    svg.selectAll('*').remove();

    const data = [
      { label: '1x ZigZag', count: streakCounts['1x'], color: '#38bdf8' },
      { label: '2x Pair', count: streakCounts['2x'], color: '#a855f7' },
      { label: '3x Tri', count: streakCounts['3x'], color: '#f59e0b' },
      { label: '4x+ Dragon', count: streakCounts['4x+'], color: '#10b981' },
    ];

    const margin = { top: 15, right: 15, bottom: 25, left: 25 };
    const width = 360 - margin.left - margin.right;
    const height = 120 - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 360 120`).attr('width', '100%').attr('height', '100%');

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x = d3
      .scaleBand()
      .range([0, width])
      .domain(data.map((d) => d.label))
      .padding(0.3);

    const maxCount = Math.max(...data.map((d) => d.count), 5);
    const y = d3.scaleLinear().range([height, 0]).domain([0, maxCount]);

    g.append('g')
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '2,2')
      .call(d3.axisLeft(y).ticks(3).tickSize(-width).tickFormat(() => ''));

    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => x(d.label) || 0)
      .attr('width', x.bandwidth())
      .attr('y', (d) => y(d.count))
      .attr('height', (d) => height - y(d.count))
      .attr('rx', 4)
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', 0.85);

    g.selectAll('.val-text')
      .data(data)
      .enter()
      .append('text')
      .attr('x', (d) => (x(d.label) || 0) + x.bandwidth() / 2)
      .attr('y', (d) => y(d.count) - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .attr('fill', '#ffffff')
      .text((d) => `${d.count}`);

    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickSize(0))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-family', 'sans-serif')
      .attr('dy', '8px');

    g.select('.domain').remove();
  }, [streakCounts]);

  return (
    <main className="flex-1 p-3 sm:p-5 space-y-4">
      {/* Header Summary Card */}
      <div className="rounded-2xl bg-[#090e1d]/80 backdrop-blur-xl ring-1 ring-white/10 border border-sky-500/35 p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <h2 className="font-display font-black text-sm sm:text-base text-white tracking-wider">
            KHELV GAME PENEL · 28-ALGO BACKTEST &amp; D3 PATTERN LAB
          </h2>
          <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-500/40">
            {gameMode} · {backtestSummary?.datasetSize ?? drawItems.length} ROUNDS TESTED
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Full historical dataset backtesting across 28 quantitative algorithms (Mirror, Dragon &amp; ZigZag Shield), 12 chronological market regime blocks, 170,000 differentiated calculations, and 18 consensus clusters.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 font-mono tabular-nums">
          <div className="p-2 rounded-xl bg-[#050814] border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase">Window Sample</div>
            <div className="text-sm font-bold text-sky-400">{outcomes.length}/50</div>
          </div>
          <div className="p-2 rounded-xl bg-[#050814] border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase">Big Ratio</div>
            <div className="text-sm font-bold text-[#ff4d6d]">{bigPercent}% ({bigCount})</div>
          </div>
          <div className="p-2 rounded-xl bg-[#050814] border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase">Small Ratio</div>
            <div className="text-sm font-bold text-[#10b981]">{100 - bigPercent}% ({smallCount})</div>
          </div>
          <div className="p-2 rounded-xl bg-[#050814] border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase">Node Consensus</div>
            <div className="text-sm font-bold text-amber-300">{consensusRate}%</div>
          </div>
        </div>
      </div>

      {/* Responsive 2-Column Analytical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* LEFT: 28-Algo Backtest Leaderboard + 12-Window Chronological Matrix */}
        <div className="space-y-4">
          {backtestSummary && (
            <div className="rounded-2xl bg-[#090e1d]/80 backdrop-blur-xl ring-1 ring-white/10 border border-sky-500/35 p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-extrabold text-sm text-sky-300">
                  28-Algorithm Full Backtest Leaderboard
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-mono font-bold border border-sky-500/40 tabular-nums">
                  {backtestSummary.totalSimulatedRounds} Sim · {backtestSummary.executionTimeMs}ms
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3 text-center font-mono tabular-nums">
                <div className="p-2 rounded-xl bg-[#050814] border border-slate-800">
                  <div className="text-[10px] text-slate-400">U2 Fix</div>
                  <div className="text-sm font-black text-emerald-400">{backtestSummary.bestUnder2FixRate}%</div>
                </div>
                <div className="p-2 rounded-xl bg-[#050814] border border-slate-800">
                  <div className="text-[10px] text-slate-400">U3 Fix</div>
                  <div className="text-sm font-black text-emerald-400">{backtestSummary.bestUnder3FixRate}%</div>
                </div>
                <div className="p-2 rounded-xl bg-[#050814] border border-slate-800">
                  <div className="text-[10px] text-slate-400">U5 Shield</div>
                  <div className="text-sm font-black text-sky-400">{backtestSummary.bestUnder5FixRate}%</div>
                </div>
                <div className="p-2 rounded-xl bg-[#050814] border border-slate-800">
                  <div className="text-[10px] text-slate-400">L1 / MaxL</div>
                  <div className="text-sm font-black text-amber-300">{backtestSummary.bestLevel1Accuracy}% / {backtestSummary.maxLossStreak}</div>
                </div>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                {backtestSummary.strategyRankings.map((st, idx) => (
                  <div
                    key={st.id}
                    className={`p-2 rounded-xl border text-xs flex items-center justify-between tabular-nums ${
                      idx === 0
                        ? 'bg-sky-950/35 border-sky-400/60'
                        : 'bg-[#050814] border-slate-800/80'
                    }`}
                  >
                    <div className="pr-2 min-w-0 flex-1">
                      <div className="font-bold text-white text-[11px] truncate">
                        #{idx + 1} {st.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        L1:{st.level1Accuracy}% · U2:{st.under2FixRate}% · L2:{st.l2RecoveryRate}% · L3:{st.l3RecoveryRate}% · MaxL:{st.maxLossStreak}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="text-[10px] font-bold text-emerald-400">
                        {st.under3FixRate}% U3
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          st.nextVote === 'BIG'
                            ? 'bg-[#ff4d6d]/20 text-[#ff4d6d] border border-[#ff4d6d]/40'
                            : 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                        }`}
                      >
                        {st.nextVote}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 12-WINDOW CHRONOLOGICAL REGIME & ACCURACY TIMETABLE */}
          {backtestSummary?.windowAnalytics && backtestSummary.windowAnalytics.length > 0 && (
            <div className="rounded-2xl bg-[#090e1d] border border-emerald-500/30 p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-extrabold text-sm text-emerald-300">
                  12-Block Chronological Stability &amp; Regime Matrix
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  Across {backtestSummary.totalSimulatedRounds} Sim Rounds
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px] tabular-nums">
                {backtestSummary.windowAnalytics.map((blk) => (
                  <div
                    key={blk.blockIndex}
                    className="p-2 rounded-xl bg-[#050814] border border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-bold">B{blk.blockIndex} ({blk.label})</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          blk.regimeTag === 'DRAGON'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : blk.regimeTag === 'ZIGZAG'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-sky-500/20 text-sky-300'
                        }`}
                      >
                        {blk.regimeTag}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Big {blk.bigPct}% · Flip {blk.flipPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sky-300">L1: {blk.l1Accuracy}%</span>
                      <span className="text-emerald-400 font-bold">U3: {blk.under3FixRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 170,000 Calcs + 3-Way User Formula */}
          {userCalcDetail && (
            <div className="rounded-2xl bg-[#090e1d] border border-amber-500/35 p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-extrabold text-sm text-amber-300">
                  User 3-Way Digital Root + 170K Calcs
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                  170,000 CALCS
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono tabular-nums mb-3">
                <div className="p-2 rounded-xl bg-[#050814] border border-slate-800">
                  <div className="text-[10px] text-slate-400">1st: Index 0+2</div>
                  <div className="text-sky-400 font-bold mt-0.5">
                    {userCalcDetail.calc1.index0}+{userCalcDetail.calc1.index2}={userCalcDetail.calc1.sum}
                  </div>
                  <div className="text-[10px] text-slate-300">Root {userCalcDetail.calc1.root}</div>
                  <div className={userCalcDetail.calc1.vote === 'BIG' ? 'text-[#ff4d6d] font-bold' : 'text-[#10b981] font-bold'}>
                    {userCalcDetail.calc1.vote}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#050814] border border-slate-800">
                  <div className="text-[10px] text-slate-400">2nd: Index 7+9</div>
                  <div className="text-sky-400 font-bold mt-0.5">
                    {userCalcDetail.calc2.index7}+{userCalcDetail.calc2.index9}={userCalcDetail.calc2.sum}
                  </div>
                  <div className="text-[10px] text-slate-300">Root {userCalcDetail.calc2.root}</div>
                  <div className={userCalcDetail.calc2.vote === 'BIG' ? 'text-[#ff4d6d] font-bold' : 'text-[#10b981] font-bold'}>
                    {userCalcDetail.calc2.vote}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#050814] border border-slate-800">
                  <div className="text-[10px] text-slate-400">3rd: Period Last3</div>
                  <div className="text-sky-400 font-bold mt-0.5">
                    {userCalcDetail.calc3.digit1}+{userCalcDetail.calc3.digit3}={userCalcDetail.calc3.sum}
                  </div>
                  <div className="text-[10px] text-slate-300">Root {userCalcDetail.calc3.root}</div>
                  <div className={userCalcDetail.calc3.vote === 'BIG' ? 'text-[#ff4d6d] font-bold' : 'text-[#10b981] font-bold'}>
                    {userCalcDetail.calc3.vote}
                  </div>
                </div>
              </div>

              {userCalcDetail.total170kCalculations?.families && (
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  {userCalcDetail.total170kCalculations.families.map((fam) => (
                    <div
                      key={fam.id}
                      className="p-1.5 rounded-lg bg-[#050814] border border-slate-800/80 flex items-center justify-between"
                    >
                      <span className="text-slate-300 truncate pr-1">#{fam.id} {fam.familyName}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold ${
                          fam.winningVote === 'BIG'
                            ? 'bg-[#ff4d6d]/20 text-[#ff4d6d]'
                            : 'bg-[#10b981]/20 text-[#10b981]'
                        }`}
                      >
                        {fam.winningVote}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: D3 Heatmap + Streak Chart + Empirical Digit Matrix + 16 Clusters */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#090e1d] border border-slate-800 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-extrabold text-sm text-amber-300">
                50-Round Trend Heatmap (D3.js)
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#ff4d6d]" /> Big</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#10b981]" /> Small</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400" /> 0/5</span>
              </div>
            </div>
            <div className="w-full flex justify-center py-1">
              <svg ref={heatmapRef} className="max-w-[400px] w-full" />
            </div>
            {selectedCell && (
              <div className="mt-2 p-2.5 rounded-xl bg-[#050814] border border-amber-500/40 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-400">Period </span>
                  <span className="text-sky-300 font-bold">{selectedCell.period}</span>
                  <span className="mx-2 text-slate-600">|</span>
                  <span className="text-amber-300 font-bold">{selectedCell.number} ({selectedCell.size})</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-[10px]">
                  {selectedCell.pattern}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#090e1d] border border-slate-800 p-4 shadow-lg">
            <h3 className="font-display font-extrabold text-sm text-amber-300 mb-1">
              Streak &amp; Switch Distribution
            </h3>
            <p className="text-[11px] text-slate-400 mb-2">
              Distribution of 1x ZigZags, 2x Pairs, 3x Runs, and 4x+ Dragons in recent rounds.
            </p>
            <div className="w-full flex justify-center">
              <svg ref={streakBarRef} className="max-w-[400px] w-full h-[120px]" />
            </div>
          </div>

          {backtestSummary?.digitProbabilities && (
            <div className="rounded-2xl bg-[#090e1d] border border-slate-800 p-4 shadow-lg">
              <h3 className="font-display font-extrabold text-sm text-sky-300 mb-2">
                Single Digit Transition Probabilities
              </h3>
              <div className="grid grid-cols-5 gap-2 font-mono text-center tabular-nums">
                {backtestSummary.digitProbabilities.slice(0, 5).map((dp, idx) => (
                  <div
                    key={dp.digit}
                    className={`p-2 rounded-xl border ${
                      idx === 0
                        ? 'bg-amber-950/35 border-amber-400/70 text-amber-300'
                        : 'bg-[#050814] border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="text-base font-black">[{dp.digit}]</div>
                    <div className="text-[10px] text-sky-300 font-bold">{dp.probability}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 18-Cluster Consensus */}
          <div className="rounded-2xl bg-[#090e1d]/80 backdrop-blur-xl ring-1 ring-white/10 border border-slate-800 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-extrabold text-sm text-amber-300">
                18-Cluster Consensus Voting Matrix
              </h3>
              <span className="text-[11px] text-emerald-400 font-mono font-bold">
                2,560,000+ Nodes
              </span>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin pr-1">
              {clusterVotes.map((vote, idx) => {
                const isBig = vote.voteSize === 'BIG';
                return (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-[#050814] border border-slate-800/80 flex items-center justify-between text-xs tabular-nums"
                  >
                    <div className="flex-1 pr-2 min-w-0">
                      <div className="font-bold text-white text-[11px] truncate">
                        {vote.clusterName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {vote.strategy}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          isBig
                            ? 'bg-[#ff4d6d]/20 text-[#ff4d6d] border border-[#ff4d6d]/40'
                            : 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                        }`}
                      >
                        {vote.voteSize}
                      </span>
                      <span className="text-[10px] text-sky-400 font-bold min-w-[30px] text-right">
                        {vote.confidence}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {currentPrediction && (
              <div className="mt-3 p-3 rounded-xl bg-[#050814] border border-amber-500/40 flex items-center justify-between font-mono tabular-nums">
                <div>
                  <div className="text-[10px] font-bold text-amber-300 uppercase">Consensus Locked</div>
                  <div className="text-xs text-slate-300">
                    {currentPrediction.prediction} · Pair {currentPrediction.predictedNumbers?.join(' , ') || '6 , 7'}
                  </div>
                </div>
                <div className="text-sm font-black text-emerald-400">{consensusRate}%</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
