import React, { useState } from 'react';
import { sfx } from '../utils/audio';

interface PandaOverlayProps {
  prediction: 'BIG' | 'SMALL' | null;
  confidence: number;
  remainingSeconds: number;
  totalRoundSeconds: number;
  isPandaVisible?: boolean;
  isThrowing?: boolean;
  targetedBtn?: 'BIG' | 'SMALL' | null;
  pickedBtn?: 'BIG' | 'SMALL' | null;
  nextPeriod: string;
  isVerified?: boolean;
  onOpenVerification?: () => void;
}

export const PandaOverlay: React.FC<PandaOverlayProps> = ({
  prediction,
  confidence,
  remainingSeconds,
  totalRoundSeconds,
  targetedBtn,
  pickedBtn,
  nextPeriod,
  isVerified = false,
  onOpenVerification,
}) => {
  // Minimize state so user can shrink the bar to zero-obstruction while betting
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // If not verified, do not render any blocking overlay on the screen
  if (!isVerified) {
    return null;
  }

  const activeSignal = pickedBtn || targetedBtn || prediction;
  const isBig = activeSignal === 'BIG';
  const isSmall = activeSignal === 'SMALL';

  const progressPercent = totalRoundSeconds > 0
    ? Math.max(0, Math.min(100, (remainingSeconds / totalRoundSeconds) * 100))
    : 0;

  return (
    <>
      {/* 
        COMPACT FLOATING PREDICTION HUD
        Designed specifically to be small and slim so players can easily see and tap 
        all betting buttons (Red, Green, Violet, Numbers 0-9, Big/Small) in the live game.
      */}
      <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[640] pointer-events-auto select-none transition-all duration-200">
        {/* MINIMIZED CAPSULE VIEW (Tiny Floating Pill - 0 Obstruction) */}
        {isMinimized ? (
          <div
            onClick={() => {
              sfx.click();
              setIsMinimized(false);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-[0_8px_25px_rgba(0,0,0,0.6)] cursor-pointer transition-all active:scale-95 ${
              isBig
                ? 'bg-amber-950/90 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                : isSmall
                ? 'bg-sky-950/90 border-sky-400 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.5)]'
                : 'bg-slate-950/90 border-slate-700 text-slate-300'
            }`}
            title="Click to expand prediction HUD"
          >
            <span className="w-2 h-2 rounded-full animate-ping inline-block bg-current" />
            <span className="font-mono font-bold text-xs text-white">
              {nextPeriod ? `#${nextPeriod.slice(-4)}` : 'PRED'}
            </span>
            <span className="font-black text-xs px-2 py-0.5 rounded bg-black/40 tracking-wider">
              {activeSignal || 'WAITING'}
            </span>
            <span className="font-mono text-xs font-bold text-amber-300">
              {remainingSeconds}s
            </span>
            <span className="text-[10px] text-slate-400 pl-1">＋</span>
          </div>
        ) : (
          /* SLIM COMPACT HUD BAR (Horizontal ~38px height, does not block game) */
          <div className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 rounded-2xl backdrop-blur-2xl bg-slate-950/92 border border-slate-700/80 shadow-[0_10px_35px_rgba(0,0,0,0.7)] text-xs text-white">
            {/* Period Badge */}
            <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono font-bold text-[11px] text-slate-300">
                {nextPeriod ? `#${nextPeriod.slice(-4)}` : 'NEXT'}
              </span>
            </div>

            {/* PREDICTION SIGNAL BADGE (Ultra-clear, high-contrast) */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase transition-all duration-300 ${
                isBig
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse'
                  : isSmall
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_0_20px_rgba(14,165,233,0.6)] animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span>{isBig ? '🔥' : isSmall ? '⚡' : '⏳'}</span>
              <span>{activeSignal || 'ANALYZING'}</span>
            </div>

            {/* Confidence Percentage */}
            <div className="hidden xs:flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800 text-[11px] font-mono font-bold text-emerald-400">
              <span>{confidence > 0 ? `${confidence}%` : '95%'}</span>
            </div>

            {/* Live Round Countdown Timer */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-800 font-mono text-[11px]">
              <span className="font-bold text-amber-400">{remainingSeconds}s</span>
              <div className="w-10 sm:w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Quick Minimize Button */}
            <button
              onClick={() => {
                sfx.click();
                setIsMinimized(true);
              }}
              className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
              title="Minimize HUD to small pill"
            >
              −
            </button>
          </div>
        )}
      </div>
    </>
  );
};
