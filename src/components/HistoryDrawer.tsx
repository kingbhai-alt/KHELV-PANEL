import React, { useState } from 'react';
import { HistoryLogRow } from '../services/lotteryService';
import { sfx } from '../utils/audio';

interface HistoryDrawerProps {
  history: HistoryLogRow[];
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onResetStats?: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  isOpen,
  onClose,
  onOpen,
  onResetStats,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'JACKPOT' | 'LOSS'>('ALL');

  const winsCount = history.filter((r) => r.outcome === 'WIN' || r.outcome === 'JACKPOT').length;
  const jackpotCount = history.filter((r) => r.outcome === 'JACKPOT').length;
  const lossCount = history.filter((r) => r.outcome === 'LOSS').length;
  const total = winsCount + lossCount;
  const winRate = total > 0 ? ((winsCount / total) * 100).toFixed(1) : '100.0';

  const l1Wins = history.filter((r) => (r.outcome === 'WIN' || r.outcome === 'JACKPOT') && (r.level === 1 || !r.level)).length;
  const l2Wins = history.filter((r) => (r.outcome === 'WIN' || r.outcome === 'JACKPOT') && r.level === 2).length;
  const l3Wins = history.filter((r) => (r.outcome === 'WIN' || r.outcome === 'JACKPOT') && r.level === 3).length;

  const filteredHistory = history.filter((r) => {
    if (filter === 'WIN') return r.outcome === 'WIN' || r.outcome === 'JACKPOT';
    if (filter === 'JACKPOT') return r.outcome === 'JACKPOT';
    if (filter === 'LOSS') return r.outcome === 'LOSS';
    return true;
  });

  return (
    <>
      {/* Floating Bottom Pill Button */}
      <button
        onClick={() => {
          sfx.click();
          onOpen();
        }}
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[660] flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl bg-slate-900/90 hover:bg-slate-800/95 border border-sky-400/50 shadow-[0_10px_35px_rgba(2,132,199,0.4)] active:scale-95 transition-all text-xs font-bold text-white cursor-pointer"
      >
        <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-[10px] shadow-sm animate-pulse">
          🕘
        </span>
        <span className="tracking-wide">AJAY Live History</span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono font-black text-[10px]">
          {winsCount}W / {lossCount}L
        </span>
      </button>

      {/* Slide-up Bottom Panel */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[680] h-[70vh] max-h-[70vh] flex flex-col rounded-t-3xl backdrop-blur-2xl bg-[#090b17]/98 border-t border-sky-400/50 shadow-[0_-25px_70px_rgba(0,0,0,0.9)] transition-transform duration-500 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
      >
        {/* Handle Bar & Header */}
        <div className="p-3.5 pb-2 border-b border-slate-800 relative bg-gradient-to-b from-[#10132b]/80 to-transparent">
          <div className="w-12 h-1 rounded-full bg-slate-700 mx-auto mb-2.5" />

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 tracking-wider">
              <span>📜 AJAY Prediction Command History</span>
            </h3>

            <div className="flex items-center gap-2">
              {onResetStats && (
                <button
                  onClick={() => {
                    sfx.click();
                    onResetStats();
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold border border-slate-700 cursor-pointer transition-colors"
                >
                  ⟲ Reset
                </button>
              )}
              <button
                onClick={() => {
                  sfx.click();
                  onClose();
                }}
                className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Win/Loss Metric Hub */}
          <div className="grid grid-cols-4 gap-1.5 mb-2 font-mono text-center">
            <div className="p-1.5 rounded-xl bg-[#060812] border border-emerald-500/40">
              <div className="text-[9px] text-slate-400 uppercase">Total Wins</div>
              <div className="text-xs font-black text-emerald-400 flex items-center justify-center gap-1">
                <span>{winsCount}</span>
                <span className="text-[9px] text-emerald-500 font-normal">({winRate}%)</span>
              </div>
            </div>
            <div className="p-1.5 rounded-xl bg-[#060812] border border-red-500/40">
              <div className="text-[9px] text-slate-400 uppercase">Losses</div>
              <div className="text-xs font-black text-red-400">{lossCount}</div>
            </div>
            <div className="p-1.5 rounded-xl bg-[#060812] border border-amber-500/40">
              <div className="text-[9px] text-slate-400 uppercase">Jackpots</div>
              <div className="text-xs font-black text-amber-400">{jackpotCount}</div>
            </div>
            <div className="p-1.5 rounded-xl bg-[#060812] border border-sky-500/40">
              <div className="text-[9px] text-slate-400 uppercase">Under 3 Fix</div>
              <div className="text-[10px] font-black text-sky-400">
                L1:{l1Wins} | L2:{l2Wins} | L3:{l3Wins}
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-mono font-bold">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filter === 'ALL'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              ALL ({history.length})
            </button>
            <button
              onClick={() => setFilter('WIN')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filter === 'WIN'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              WINS ({winsCount})
            </button>
            <button
              onClick={() => setFilter('JACKPOT')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filter === 'JACKPOT'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              JACKPOTS ({jackpotCount})
            </button>
            <button
              onClick={() => setFilter('LOSS')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filter === 'LOSS'
                  ? 'bg-red-500/20 text-red-300 border border-red-400/50'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              LOSSES ({lossCount})
            </button>
          </div>
        </div>

        {/* History Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-14 text-slate-500 text-xs font-mono">
              No matching records for filter &ldquo;{filter}&rdquo;
            </div>
          ) : (
            filteredHistory.map((row, index) => {
              const isJackpot = row.outcome === 'JACKPOT';
              const isWin = row.outcome === 'WIN';
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border backdrop-blur-md transition-all ${
                    isJackpot
                      ? 'border-amber-400/60 bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-slate-900/70 shadow-[0_4px_20px_rgba(245,158,11,0.2)]'
                      : isWin
                      ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 to-slate-900/60 shadow-[0_4px_18px_rgba(16,185,129,0.12)]'
                      : 'border-red-500/40 bg-gradient-to-r from-red-950/30 to-slate-900/60 shadow-[0_4px_18px_rgba(239,68,68,0.12)]'
                  }`}
                >
                  {/* Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold shadow-md shrink-0 ${
                      isJackpot
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                        : isWin
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
                        : 'bg-gradient-to-br from-red-500 to-red-700 text-white'
                    }`}
                  >
                    {isJackpot ? '🔥' : isWin ? '🏆' : '⚔️'}
                  </div>

                  {/* Mid info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white">
                        {row.pred}
                      </span>
                      {row.singleJackpotDigit !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 font-mono font-bold border border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                          🎯 Single [{row.singleJackpotDigit}]
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({row.confidence}%)
                      </span>
                      {row.level && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-amber-300 font-mono">
                          L{row.level}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-sky-400 font-bold">
                      #{row.period}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                      <span>Drawn: {row.result} ({row.number})</span>
                      <span>•</span>
                      <span>{row.time}</span>
                    </div>
                  </div>

                  {/* Outcome tag */}
                  <div
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-sm whitespace-nowrap ${
                      isJackpot
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-amber-300 font-extrabold shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                        : isWin
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/50'
                        : 'bg-red-500/20 text-red-400 border-red-400/50'
                    }`}
                  >
                    {row.outcome}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
