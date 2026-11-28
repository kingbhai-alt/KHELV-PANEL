import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DrawItem, WinGoMode } from '../services/lotteryService';
import { DynamicTrendRecognitionResult, ClusterVote } from '../logic/jujutsuEngine';
import { BacktestSummary } from '../logic/backtestEngine';
import {
  calculatePatternMomentumData,
  PatternClusterMomentum,
  PatternMomentumDashboardData,
} from '../logic/patternMomentumCalculator';

interface PatternMomentumWidgetProps {
  drawItems: DrawItem[];
  gameMode: WinGoMode;
  dtrAnalysis?: DynamicTrendRecognitionResult;
  backtestSummary?: BacktestSummary;
  clusterVotes?: ClusterVote[];
  className?: string;
  defaultExpanded?: boolean;
}

export const PatternMomentumWidget: React.FC<PatternMomentumWidgetProps> = ({
  drawItems,
  gameMode,
  dtrAnalysis,
  backtestSummary,
  clusterVotes = [],
  className = '',
  defaultExpanded = true,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Filter & Horizon states
  const [horizonSlices, setHorizonSlices] = useState<number>(12);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCell, setSelectedCell] = useState<{
    clusterName: string;
    category: string;
    sliceLabel: string;
    period: string;
    stability: number;
    dominantSize: 'BIG' | 'SMALL';
    details: string;
    status: string;
  } | null>(null);

  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  // Compute live pattern momentum data
  const data: PatternMomentumDashboardData = useMemo(() => {
    return calculatePatternMomentumData(
      drawItems,
      gameMode,
      horizonSlices,
      dtrAnalysis,
      backtestSummary,
      clusterVotes
    );
  }, [drawItems, gameMode, horizonSlices, dtrAnalysis, backtestSummary, clusterVotes]);

  // Filter clusters if category filter is active
  const filteredClusters = useMemo(() => {
    if (selectedCategory === 'ALL') return data.clusters;
    return data.clusters.filter((c) => c.category === selectedCategory);
  }, [data.clusters, selectedCategory]);

  // Color interpolator for D3 heatmap
  const getCellColor = (stability: number, status: string, dominantSize: 'BIG' | 'SMALL') => {
    if (status === 'PEAK') {
      return dominantSize === 'BIG' ? '#be123c' : '#047857';
    }
    if (stability >= 90) return '#059669'; // Emerald
    if (stability >= 75) return '#0284c7'; // Sky / Cyan
    if (stability >= 60) return '#d97706'; // Amber
    return '#1e293b'; // Slate dormant
  };

  const getCellStroke = (stability: number, status: string, dominantSize: 'BIG' | 'SMALL') => {
    if (status === 'PEAK') {
      return dominantSize === 'BIG' ? '#fb7185' : '#34d399';
    }
    if (stability >= 90) return '#34d399';
    if (stability >= 75) return '#38bdf8';
    if (stability >= 60) return '#fbbf24';
    return '#334155';
  };

  // Render D3 Heatmap
  useEffect(() => {
    if (!svgRef.current || filteredClusters.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const numCols = data.timeSliceLabels.length;
    const numRows = filteredClusters.length;

    // Layout dimensions
    const labelWidth = 110;
    const cellWidth = 36;
    const cellHeight = 32;
    const gap = 4;
    const margin = { top: 28, right: 14, bottom: 12, left: labelWidth };

    const totalWidth = margin.left + numCols * (cellWidth + gap) + margin.right;
    const totalHeight = margin.top + numRows * (cellHeight + gap) + margin.bottom;

    svg
      .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
      .attr('width', '100%')
      .attr('height', '100%');

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Top X-Axis: Time Slice Labels
    data.timeSliceLabels.forEach((label, colIdx) => {
      const x = colIdx * (cellWidth + gap) + cellWidth / 2;
      g.append('text')
        .attr('x', x)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .attr('fill', colIdx === 0 ? '#38bdf8' : '#94a3b8')
        .attr('font-weight', colIdx === 0 ? 'bold' : 'normal')
        .text(label);
    });

    // Rows and Cells
    filteredClusters.forEach((cluster, rowIdx) => {
      const y = rowIdx * (cellHeight + gap);

      // Y-Axis: Cluster Name Label (on the left)
      svg
        .append('text')
        .attr('x', margin.left - 8)
        .attr('y', margin.top + y + cellHeight / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('font-family', 'sans-serif')
        .attr('font-weight', '600')
        .attr('fill', '#e2e8f0')
        .text(cluster.shortLabel);

      // Heatmap Cells for this cluster
      cluster.timeSeries.forEach((slice, colIdx) => {
        const x = colIdx * (cellWidth + gap);
        const cellGroup = g
          .append('g')
          .attr('transform', `translate(${x}, ${y})`)
          .attr('class', 'cursor-pointer transition-transform duration-150 hover:scale-105')
          .on('click', () => {
            setSelectedCell({
              clusterName: cluster.name,
              category: cluster.category,
              sliceLabel: slice.label,
              period: slice.period,
              stability: slice.stability,
              dominantSize: slice.dominantSize,
              details: slice.details,
              status: slice.status,
            });
          });

        const isSelected =
          selectedCell &&
          selectedCell.clusterName === cluster.name &&
          selectedCell.period === slice.period;

        const fillColor = getCellColor(slice.stability, slice.status, slice.dominantSize);
        const strokeColor = isSelected ? '#ffffff' : getCellStroke(slice.stability, slice.status, slice.dominantSize);

        // Background Cell Rect
        cellGroup
          .append('rect')
          .attr('width', cellWidth)
          .attr('height', cellHeight)
          .attr('rx', 5)
          .attr('fill', fillColor)
          .attr('fill-opacity', isSelected ? 1 : 0.88)
          .attr('stroke', strokeColor)
          .attr('stroke-width', isSelected ? 2 : 1)
          .attr('stroke-opacity', isSelected ? 1 : 0.6);

        // Dominant Size badge (Top Left)
        cellGroup
          .append('text')
          .attr('x', 4)
          .attr('y', 10)
          .attr('font-size', '8px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .attr('fill', slice.dominantSize === 'BIG' ? '#fecdd3' : '#a7f3d0')
          .text(slice.dominantSize === 'BIG' ? 'B' : 'S');

        // Stability Value % (Center)
        cellGroup
          .append('text')
          .attr('x', cellWidth / 2)
          .attr('y', cellHeight / 2 + 5)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .attr('fill', '#ffffff')
          .text(`${slice.stability}%`);
      });
    });
  }, [filteredClusters, data.timeSliceLabels, selectedCell]);

  // Auto-select latest live cell on initial mount if none selected
  useEffect(() => {
    if (!selectedCell && filteredClusters[0]?.timeSeries[0]) {
      const topCluster = filteredClusters[0];
      const liveSlice = topCluster.timeSeries[0];
      setSelectedCell({
        clusterName: topCluster.name,
        category: topCluster.category,
        sliceLabel: liveSlice.label,
        period: liveSlice.period,
        stability: liveSlice.stability,
        dominantSize: liveSlice.dominantSize,
        details: liveSlice.details,
        status: liveSlice.status,
      });
    }
  }, [filteredClusters, selectedCell]);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl bg-[#090e1d]/90 backdrop-blur-xl ring-1 ring-white/10 border border-sky-500/30 p-3.5 sm:p-4 shadow-xl ${className}`}
    >
      {/* 1. Header Bar: Title, Live Stability Gauge & Collapsible Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-extrabold text-sm sm:text-base text-white tracking-wide">
              Pattern Momentum · Cluster Stability
            </h2>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums border ${
                data.overallStability >= 85
                  ? 'bg-emerald-950/80 border-emerald-400/40 text-emerald-300'
                  : data.overallStability >= 70
                  ? 'bg-amber-950/80 border-amber-400/40 text-amber-300'
                  : 'bg-red-950/80 border-red-400/40 text-red-300'
              }`}
            >
              {data.overallStability}% STABILITY
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              U2 Armed {data.under2RecoveryReadiness}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            D3 multi-horizon mapping of Dragon, Mirror, ZigZag &amp; Quantum Drift cluster resonance
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand Matrix'}
          </button>
        </div>
      </div>

      {/* 2. Interactive Horizon & Category Filter Toolbar */}
      {isExpanded && (
        <div className="pt-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Cluster Category Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#050814] rounded-xl border border-slate-800">
              {[
                { id: 'ALL', label: 'All Clusters' },
                { id: 'DRAGON', label: 'Dragon' },
                { id: 'MIRROR', label: 'Mirror' },
                { id: 'ZIGZAG', label: 'ZigZag' },
                { id: 'QUANTUM_DRIFT', label: 'Quantum Drift' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === tab.id
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Time Horizon Selector */}
            <div className="flex items-center gap-1 p-1 bg-[#050814] rounded-xl border border-slate-800 font-mono text-[11px] tabular-nums">
              <span className="text-slate-400 text-[10px] px-1.5">Horizon:</span>
              {[
                { val: 8, label: '8R' },
                { val: 12, label: '12R' },
                { val: 16, label: '16R' },
              ].map((h) => (
                <button
                  key={h.val}
                  type="button"
                  onClick={() => setHorizonSlices(h.val)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                    horizonSlices === h.val
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. D3 SVG Heatmap Canvas */}
          <div className="w-full overflow-x-auto scrollbar-thin py-1 bg-[#050814] rounded-xl border border-slate-800/80 p-2">
            <div className="min-w-[500px] flex justify-center">
              <svg ref={svgRef} className="w-full h-auto max-h-[220px]" />
            </div>
          </div>

          {/* 4. Interactive Cell Inspector Panel */}
          {selectedCell && (
            <div className="p-3 rounded-xl bg-[#050814] border border-sky-500/35 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono tabular-nums">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-[12px]">
                    {selectedCell.clusterName}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-sky-300">{selectedCell.sliceLabel}</span>
                  <span className="text-slate-500 text-[10px]">(Period #{selectedCell.period})</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {selectedCell.details} · Dominant:{' '}
                  <strong
                    className={
                      selectedCell.dominantSize === 'BIG' ? 'text-[#ff4d6d]' : 'text-[#10b981]'
                    }
                  >
                    {selectedCell.dominantSize}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedCell.status === 'PEAK'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-400/40'
                      : selectedCell.status === 'STABLE'
                      ? 'bg-sky-950 text-sky-300 border border-sky-400/40'
                      : 'bg-amber-950 text-amber-300 border border-amber-400/40'
                  }`}
                >
                  {selectedCell.status}
                </span>
                <span className="text-sm font-black text-white">
                  {selectedCell.stability}%
                </span>
              </div>
            </div>
          )}

          {/* 5. Key Cluster Momentum Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono tabular-nums">
            {/* Dragon Cluster */}
            <div className="p-2.5 rounded-xl bg-[#050814] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold text-[11px]">Dragon Streak</span>
                <span className="text-emerald-400 font-bold">
                  {data.clusters.find((c) => c.category === 'DRAGON')?.currentStability}%
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {data.clusters.find((c) => c.category === 'DRAGON')?.trendState}
              </div>
            </div>

            {/* Mirror Cluster */}
            <div className="p-2.5 rounded-xl bg-[#050814] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold text-[11px]">Mirror Symmetry</span>
                <span className="text-sky-400 font-bold">
                  {data.clusters.find((c) => c.category === 'MIRROR')?.currentStability}%
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {data.clusters.find((c) => c.category === 'MIRROR')?.trendState}
              </div>
            </div>

            {/* ZigZag Cluster */}
            <div className="p-2.5 rounded-xl bg-[#050814] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold text-[11px]">ZigZag Oscillation</span>
                <span className="text-amber-400 font-bold">
                  {data.clusters.find((c) => c.category === 'ZIGZAG')?.currentStability}%
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {data.clusters.find((c) => c.category === 'ZIGZAG')?.trendState}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
