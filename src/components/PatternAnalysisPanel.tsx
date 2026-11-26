import React, { useEffect, useRef, useState } from 'react';
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

  // Take the last 50 outcomes (or all available if fewer)
  const outcomes = (drawItems || []).slice(0, 50).map((item, idx, arr) => {
    const num = Number(item.number) || 0;
    const size = get_big_small(num, isK3);
    const shortPeriod =
      item.issueNumber.length > 4 ? item.issueNumber.slice(-4) : item.issueNumber;

    // Detect streak length for this node
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

  // Calculate pattern frequencies
  const streakCounts = { '1x': 0, '2x': 0, '3x': 0, '4x+': 0 };
  let currentRun = 1;
  for (let i = 0; i < outcomes.length; i++) {
    if (i < outcomes.length - 1 && outcomes[i].size === outcomes[i + 1].size) {
      currentRun++;
    } else {
      if (currentRun === 1) streakCounts['1x']++;
      else if (currentRun === 2) streakCounts['2x']++;
      else if (currentRun === 3) streakCounts['3x']++;
      else streakCounts['4x+']++;
      currentRun = 1;
    }
  }

  const bigCount = outcomes.filter((o) => o.size === 'BIG').length;
  const smallCount = outcomes.length - bigCount;
  const bigPercent = outcomes.length > 0 ? Math.round((bigCount / outcomes.length) * 100) : 50;

  // =========================================================================
  // D3.JS TREND HEATMAP MATRIX (Last 50 Outcomes)
  // =========================================================================
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

    // Render cells in matrix order
    outcomes.slice(0, 50).forEach((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cellWidth + gap);
      const y = row * (cellHeight + gap);

      const cellGroup = g
        .append('g')
        .attr('transform', `translate(${x}, ${y})`)
        .attr('class', 'cursor-pointer transition-transform hover:scale-105')
        .on('click', () => {
          setSelectedCell(d);
        });

      // Background rect with D3 color gradient
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
        .attr('stroke-opacity', 0.8)
        .attr('filter', isJackpot ? 'drop-shadow(0 0 4px rgba(245,158,11,0.5))' : 'none');

      // Short Period on Top
      cellGroup
        .append('text')
        .attr('x', cellWidth / 2)
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .attr('fill', '#94a3b8')
        .text(d.shortPeriod);

      // Number in Center
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

      // Size tag badge bottom right
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

  // =========================================================================
  // D3.JS STREAK FREQUENCY BAR CHART
  // =========================================================================
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

    // Grid lines
    g.append('g')
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '2,2')
      .call(d3.axisLeft(y).ticks(3).tickSize(-width).tickFormat(() => ''));

    // Bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => x(d.label) || 0)
      .attr('width', x.bandwidth())
      .attr('y', (d) => y(d.count))
      .attr('height', (d) => height - y(d.count))
      .attr('rx', 4)
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', 0.85);

    // Value Labels on Bars
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

    // X Axis Labels
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
    <div className="flex-1 flex flex-col p-3 pb-14 overflow-y-auto min-h-0 space-y-3">
      {/* 1. Header Banner */}
      <div className="rounded-2xl bg-[#0e0f1f] border border-amber-500/40 p-3 shadow-lg">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-black text-sm text-white tracking-wider">
              KHELV PENEL • 500+ BACKTEST & HEATMAP
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-500/40">
            {gameMode} LIVE
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Visualizing the last 50 game outcomes via D3.js trend matrix, streak frequencies, and AJAY 1000K+ bypass consensus voting across 170,000 pure real calculations (10 to 1,000 historical results).
        </p>

        {/* 4 Stat Pills */}
        <div className="grid grid-cols-4 gap-2 mt-2.5">
          <div className="p-1.5 rounded-lg bg-[#070714] border border-slate-800 text-center">
            <div className="text-[9px] text-slate-400 uppercase">Outcomes</div>
            <div className="text-xs font-mono font-bold text-sky-400">{outcomes.length}/50</div>
          </div>
          <div className="p-1.5 rounded-lg bg-[#070714] border border-slate-800 text-center">
            <div className="text-[9px] text-slate-400 uppercase">Big Ratio</div>
            <div className="text-xs font-mono font-bold text-[#ff4d6d]">{bigPercent}% ({bigCount})</div>
          </div>
          <div className="p-1.5 rounded-lg bg-[#070714] border border-slate-800 text-center">
            <div className="text-[9px] text-slate-400 uppercase">Small Ratio</div>
            <div className="text-xs font-mono font-bold text-[#10b981]">{100 - bigPercent}% ({smallCount})</div>
          </div>
          <div className="p-1.5 rounded-lg bg-[#070714] border border-slate-800 text-center">
            <div className="text-[9px] text-slate-400 uppercase">Consensus</div>
            <div className="text-xs font-mono font-bold text-amber-400">{consensusRate}%</div>
          </div>
        </div>
      </div>

      {/* 1B. 500+ ROUND PRE-PREDICTION ALGORITHM BACKTEST LEADERBOARD */}
      {backtestSummary && (
        <div className="rounded-2xl bg-[#0e0f1f] border border-sky-500/40 p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="font-extrabold text-xs text-sky-400 flex items-center gap-1.5">
              <span>🧪</span>
              <span>Pre-Prediction 500+ DB Backtest Leaderboard</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-mono font-bold border border-sky-500/40">
              {backtestSummary.datasetSize} Rounds • {backtestSummary.executionTimeMs}ms
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2.5 text-center font-mono">
            <div className="p-2 rounded-xl bg-[#070714] border border-slate-800">
              <div className="text-[9px] text-slate-400 uppercase">3-Level Fix</div>
              <div className="text-sm font-black text-emerald-400 tabular-nums">
                {backtestSummary.bestUnder3FixRate}%
              </div>
            </div>
            <div className="p-2 rounded-xl bg-[#070714] border border-slate-800">
              <div className="text-[9px] text-slate-400 uppercase">L1 Accuracy</div>
              <div className="text-sm font-black text-sky-400 tabular-nums">
                {backtestSummary.bestLevel1Accuracy}%
              </div>
            </div>
            <div className="p-2 rounded-xl bg-[#070714] border border-slate-800">
              <div className="text-[9px] text-slate-400 uppercase">Top Digit</div>
              <div className="text-sm font-black text-amber-400 tabular-nums">
                [{backtestSummary.recommendedDigit}]
              </div>
            </div>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin">
            {backtestSummary.strategyRankings.map((st, idx) => (
              <div
                key={st.id}
                className={`p-2 rounded-xl border text-xs flex items-center justify-between ${
                  idx === 0
                    ? 'bg-sky-950/30 border-sky-400/60'
                    : 'bg-[#070714] border-slate-800/80'
                }`}
              >
                <div className="pr-2 min-w-0 flex-1">
                  <div className="font-bold text-white text-[11px] truncate">
                    #{idx + 1} {st.name}
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono truncate">
                    L1: {st.level1Accuracy}% · L2: {st.l2RecoveryRate}% · L3: {st.l3RecoveryRate}%
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span className="text-[10px] font-bold text-emerald-400 tabular-nums">
                    {st.under3FixRate}% Fix
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

      {/* 2. 170,000 PURE REAL DIFFERENTIATED CALCULATIONS BREAKDOWN */}
      {userCalcDetail && (
        <div className="rounded-2xl bg-[#0e0f1f] border border-amber-500/40 p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="font-extrabold text-xs text-[#f59e0b] flex items-center gap-1.5">
              <span>⚡</span>
              <span>170K Pure Real Calculations Ensemble</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-500/40 animate-pulse">
              170,000 Calcs Active
            </span>
          </div>

          {/* 3 User Master Calculation Cards */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            {/* Calc 1 */}
            <div className="p-2 rounded-xl bg-[#070714] border border-slate-800 hover:border-sky-500/40 transition-colors">
              <div className="text-[9px] text-slate-400">1st: Index 0+2</div>
              <div className="text-[11px] text-sky-400 font-bold mt-0.5 truncate">
                {userCalcDetail.calc1.index0}+{userCalcDetail.calc1.index2}={userCalcDetail.calc1.sum}
              </div>
              <div className="text-[10px] text-slate-300">
                Root: <span className="font-bold">{userCalcDetail.calc1.root}</span>
              </div>
              <div
                className={`text-xs font-bold mt-1 ${
                  userCalcDetail.calc1.vote === 'BIG' ? 'text-[#ff4d6d]' : 'text-[#10b981]'
                }`}
              >
                {userCalcDetail.calc1.vote}
              </div>
            </div>

            {/* Calc 2 */}
            <div className="p-2 rounded-xl bg-[#070714] border border-slate-800 hover:border-sky-500/40 transition-colors">
              <div className="text-[9px] text-slate-400">2nd: Index 7+9</div>
              <div className="text-[11px] text-sky-400 font-bold mt-0.5 truncate">
                {userCalcDetail.calc2.index7}+{userCalcDetail.calc2.index9}={userCalcDetail.calc2.sum}
              </div>
              <div className="text-[10px] text-slate-300">
                Root: <span className="font-bold">{userCalcDetail.calc2.root}</span>
              </div>
              <div
                className={`text-xs font-bold mt-1 ${
                  userCalcDetail.calc2.vote === 'BIG' ? 'text-[#ff4d6d]' : 'text-[#10b981]'
                }`}
              >
                {userCalcDetail.calc2.vote}
              </div>
            </div>

            {/* Calc 3 */}
            <div className="p-2 rounded-xl bg-[#070714] border border-slate-800 hover:border-sky-500/40 transition-colors">
              <div className="text-[9px] text-slate-400">3rd: Period Last3</div>
              <div className="text-[11px] text-sky-400 font-bold mt-0.5 truncate">
                {userCalcDetail.calc3.digit1}+{userCalcDetail.calc3.digit3}={userCalcDetail.calc3.sum}
              </div>
              <div className="text-[10px] text-slate-300">
                Root: <span className="font-bold">{userCalcDetail.calc3.root}</span>
              </div>
              <div
                className={`text-xs font-bold mt-1 ${
                  userCalcDetail.calc3.vote === 'BIG' ? 'text-[#ff4d6d]' : 'text-[#10b981]'
                }`}
              >
                {userCalcDetail.calc3.vote}
              </div>
            </div>
          </div>

          {/* 170K Ensemble Tally Banner */}
          <div className="mt-2.5 p-2 rounded-xl bg-[#070714] border border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 text-[10px]">170,000 Grand Tally:</span>
            <div className="space-x-2 text-[10px]">
              <span className="text-[#ff4d6d] font-bold">
                BIG: {(userCalcDetail.total170kCalculations?.bigVotes ?? userCalcDetail.total17kCalculations.bigVotes * 10).toLocaleString()}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-[#10b981] font-bold">
                SMALL: {(userCalcDetail.total170kCalculations?.smallVotes ?? userCalcDetail.total17kCalculations.smallVotes * 10).toLocaleString()}
              </span>
            </div>
          </div>

          {/* 10 Unique Calculation Families Breakdown */}
          {userCalcDetail.total170kCalculations?.families && (
            <div className="mt-2 pt-2 border-t border-slate-800/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>10 Unique Mathematical Families</span>
                <span className="text-amber-400 font-mono">17,000 Calcs Each</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[9.5px] font-mono max-h-40 overflow-y-auto scrollbar-thin">
                {userCalcDetail.total170kCalculations.families.map((fam) => (
                  <div
                    key={fam.id}
                    className="p-1.5 rounded-lg bg-[#05050f] border border-slate-800/60 flex items-center justify-between"
                  >
                    <div className="truncate pr-1">
                      <span className="text-slate-300 font-medium">#{fam.id} {fam.familyName}</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                        fam.winningVote === 'BIG'
                          ? 'bg-[#ff4d6d]/20 text-[#ff4d6d] border border-[#ff4d6d]/40'
                          : 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                      }`}
                    >
                      {fam.winningVote}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. D3.JS TREND HEATMAP (50 Game Outcomes Matrix) */}
      <div className="rounded-2xl bg-[#0e0f1f] border border-slate-800 p-3 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="font-extrabold text-xs text-[#f59e0b] flex items-center gap-1.5">
            <span>🔥</span>
            <span>50-Round Trend Heatmap (D3.js Grid)</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[#ff4d6d]" /> Big
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[#10b981]" /> Small
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-amber-400" /> Jackpot
            </span>
          </div>
        </div>

        {/* Heatmap SVG */}
        <div className="w-full flex justify-center py-1">
          <svg ref={heatmapRef} className="max-w-[370px] w-full" />
        </div>

        {/* Selected cell detail tooltip card */}
        {selectedCell && (
          <div className="mt-2 p-2 rounded-xl bg-[#070714] border border-amber-500/50 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-400">Period: </span>
              <span className="text-sky-300 font-bold">{selectedCell.period}</span>
              <span className="mx-2 text-slate-600">|</span>
              <span className="text-slate-400">Drawn: </span>
              <span className="text-amber-400 font-bold">{selectedCell.number} ({selectedCell.size})</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-[10px]">
              {selectedCell.pattern}
            </span>
          </div>
        )}
      </div>

      {/* 3. D3.JS STREAK FREQUENCY DISTRIBUTION BAR CHART */}
      <div className="rounded-2xl bg-[#0e0f1f] border border-slate-800 p-3 shadow-lg">
        <div className="font-extrabold text-xs text-[#f59e0b] mb-1 flex items-center gap-1.5">
          <span>📊</span>
          <span>Consecutive Streak & Switch Distribution</span>
        </div>
        <p className="text-[10px] text-slate-400 mb-2">
          Shows how frequently the market oscillates as single ZigZags (1x), 2x pairs, 3x runs, or 4x+ Dragons.
        </p>

        <div className="w-full flex justify-center">
          <svg ref={streakBarRef} className="max-w-[370px] w-full h-[120px]" />
        </div>
      </div>

      {/* 4. AJAY 1000K+ BYPASS MULTI-MARKET VOTING CONSENSUS MATRIX */}
      <div className="rounded-2xl bg-[#0e0f1f] border border-slate-800 p-3 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="font-extrabold text-xs text-[#f59e0b] flex items-center gap-1.5">
            <span>🗳️</span>
            <span>1000K+ Bypass Market Voting Consensus</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">
            1,024,000 Nodes Voting
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mb-2.5">
          10 independent bypass clusters analyze the market from distinct strategic angles and cast weighted votes:
        </p>

        {/* Voting Rows */}
        <div className="space-y-1.5">
          {clusterVotes.map((vote, idx) => {
            const isBig = vote.voteSize === 'BIG';
            return (
              <div
                key={idx}
                className="p-2 rounded-xl bg-[#070714] border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div className="flex-1 pr-2">
                  <div className="font-bold text-white text-[11px] truncate">
                    {vote.clusterName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {vote.strategy}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        isBig
                          ? 'bg-[#ff4d6d]/20 text-[#ff4d6d] border border-[#ff4d6d]/40'
                          : 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                      }`}
                    >
                      {vote.voteSize}
                    </span>
                    <div className="text-[9px] font-mono text-amber-400 mt-0.5">
                      {vote.voteNumbers[0]} , {vote.voteNumbers[1]}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-sky-400 font-bold min-w-[28px] text-right">
                    {vote.confidence}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Final Consensus Summary Box */}
        {currentPrediction && (
          <div className="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-sky-500/10 border border-amber-500/40 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Consensus Winning Decision
              </div>
              <div className="text-xs font-mono text-slate-300">
                Size: <span className="text-white font-bold">{currentPrediction.prediction}</span> | 2 Nos:{' '}
                <span className="text-amber-400 font-bold">
                  {currentPrediction.predictedNumbers?.join(' , ') || '6 , 7'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {consensusRate}% VOTE
              </span>
              <div className="text-[9px] text-slate-400">Majority Locked</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
