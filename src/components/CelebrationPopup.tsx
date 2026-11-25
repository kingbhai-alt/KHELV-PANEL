import React from 'react';
import { HistoryLogRow } from '../services/lotteryService';

interface CelebrationPopupProps {
  result: HistoryLogRow | null;
  onClose: () => void;
}

export const CelebrationPopup: React.FC<CelebrationPopupProps> = ({
  result,
  onClose,
}) => {
  // Automatically dismiss popup after 3 seconds without needing any tap/click
  React.useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [result, onClose]);

  if (!result) return null;

  const isWin = result.outcome === 'WIN';

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-[750] flex items-center justify-center p-4 backdrop-blur-md cursor-pointer select-none transition-opacity duration-300 ${
        isWin
          ? 'bg-radial from-emerald-600/40 via-emerald-950/70 to-slate-950/95'
          : 'bg-radial from-red-700/40 via-red-950/80 to-slate-950/95'
      }`}
    >
      {/* WIN PARTICLES / CONFETTI */}
      {isWin && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 28 }).map((_, i) => (
            <i
              key={i}
              className="absolute w-2 h-4 rounded-sm bg-gradient-to-b from-emerald-200 to-emerald-500 shadow-[0_0_12px_rgba(167,243,208,0.9)]"
              style={{
                left: `${(i * 3.6 + Math.random() * 5).toFixed(1)}%`,
                top: '-5%',
                animation: `particleFall 3s cubic-bezier(0.2, 0.7, 0.2, 1) both`,
                animationDelay: `${(Math.random() * 0.9).toFixed(2)}s`,
                transform: `rotate(${Math.floor(Math.random() * 360)}deg)`,
                ['--drift' as any]: `${(Math.random() * 60 - 30).toFixed(0)}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* LOSS KNIVES EFFECT */}
      {!isWin && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-3 h-24 bg-gradient-to-b from-slate-200 to-slate-500 rotate-45 animate-pulse shadow-[0_0_20px_rgba(248,113,113,0.8)]" />
          <div className="absolute top-1/3 right-1/4 w-3 h-24 bg-gradient-to-b from-slate-200 to-slate-500 -rotate-45 animate-pulse shadow-[0_0_20px_rgba(248,113,113,0.8)]" />
        </div>
      )}

      {/* RESULT CARD */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm p-6 sm:p-7 rounded-3xl text-center shadow-[0_25px_60px_rgba(0,0,0,0.8)] border backdrop-blur-2xl transform transition-transform duration-300 ${
          isWin
            ? 'border-emerald-400/60 bg-gradient-to-b from-emerald-950/90 to-slate-950/95'
            : 'border-red-500/60 bg-gradient-to-b from-red-950/90 to-slate-950/95'
        }`}
      >
        {/* Top Symbol Emblem */}
        <div
          className={`w-20 h-20 mx-auto -mt-12 mb-4 rounded-3xl flex items-center justify-center text-4xl shadow-2xl border ${
            isWin
              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-emerald-300 shadow-emerald-500/50'
              : 'bg-gradient-to-br from-red-500 to-red-700 text-white border-red-300 shadow-red-500/50'
          }`}
        >
          {isWin ? '🏆' : '⚔️'}
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-white drop-shadow-md">
          {isWin ? 'PREDICTION HIT!' : 'STREAK MISSED'}
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-slate-300">
          Period <span className="font-mono font-bold text-sky-300">#{result.period}</span>
        </p>

        {/* Breakdown comparison */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="bg-black/50 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">
              Prediction
            </div>
            <div
              className={`text-xl font-black ${
                result.pred === 'BIG' ? 'text-emerald-400' : 'text-sky-400'
              }`}
            >
              {result.pred}
            </div>
          </div>

          <div className="bg-black/50 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">
              Actual Result
            </div>
            <div className="text-xl font-black text-amber-300">
              {result.result}{' '}
              <span className="text-sm font-normal text-slate-400">
                ({result.number})
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`inline-block px-5 py-2 rounded-xl font-extrabold text-sm tracking-wider uppercase border shadow-md ${
            isWin
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
              : 'bg-red-500/20 text-red-300 border-red-400/50'
          }`}
        >
          {isWin ? '✨ + WIN CONFIRMED ✨' : '⚡ NEXT ROUND RELOAD ⚡'}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors"
        >
          Continue Predictor
        </button>
      </div>
    </div>
  );
};
