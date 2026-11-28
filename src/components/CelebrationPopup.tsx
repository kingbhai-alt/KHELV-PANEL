import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HistoryLogRow } from '../services/lotteryService';

interface CelebrationPopupProps {
  result: HistoryLogRow | null;
  baseStake?: number;
  onClose: () => void;
}

const AUTO_DISMISS_MS = 2800;

export const CelebrationPopup: React.FC<CelebrationPopupProps> = ({
  result,
  baseStake = 100,
  onClose,
}) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const resultKey = result ? `${result.period}-${result.outcome}-${result.number}` : '';

  // Auto-dismiss reliably after 2.8s without tapping (unaffected by parent 500ms timer ticks)
  useEffect(() => {
    if (!resultKey) return;
    const timer = setTimeout(() => {
      onCloseRef.current();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [resultKey]);

  const isJackpot = result?.outcome === 'JACKPOT' || Boolean(result?.isSingleHit);
  const isWin = result?.outcome === 'WIN' || isJackpot;
  const lvl = result?.level || 1;
  const mult =
    lvl >= 5 ? 19.2 : lvl === 4 ? 9.2 : lvl === 3 ? 4.4 : lvl === 2 ? 2.1 : 1.0;
  const stake = Math.round(baseStake * mult);
  const estPnl = result
    ? isJackpot
      ? Math.round(stake * 1.96)
      : isWin
      ? Math.round(stake * 0.96)
      : -stake
    : 0;

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          key={`outcome-${result.period}-${result.outcome}`}
          data-testid="outcome-celebration-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          onClick={onClose}
          className="fixed inset-0 z-[780] flex items-center justify-center p-4 bg-[#03060f]/70 backdrop-blur-xl cursor-pointer select-none overflow-hidden"
        >
          {/* Ambient Glassmorphic Backlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isJackpot
                ? 'radial-gradient(circle at 50% 45%, rgba(245, 158, 11, 0.28), rgba(251, 191, 36, 0.08) 45%, transparent 72%)'
                : isWin
                ? 'radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.26), rgba(56, 189, 248, 0.08) 45%, transparent 72%)'
                : 'radial-gradient(circle at 50% 45%, rgba(239, 68, 68, 0.24), rgba(15, 23, 42, 0.2) 50%, transparent 75%)',
            }}
          />

          {/* Animated Shockwave Ring */}
          <motion.div
            initial={{ scale: 0.55, opacity: 0.85 }}
            animate={{ scale: 2.3, opacity: 0 }}
            transition={{ duration: 1.25, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute w-56 h-56 rounded-full border-2 pointer-events-none ${
              isJackpot
                ? 'border-amber-300/70'
                : isWin
                ? 'border-emerald-400/70'
                : 'border-red-400/60'
            }`}
          />

          {/* Win & 9X Jackpot Confetti / Gold Shards */}
          {isWin && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: isJackpot ? 32 : 20 }).map((_, i) => (
                <i
                  key={i}
                  className={`absolute rounded-sm ${
                    isJackpot
                      ? i % 2 === 0
                        ? 'w-2.5 h-5 bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.7)]'
                        : 'w-2 h-4 bg-sky-300'
                      : i % 2 === 0
                      ? 'w-2 h-4 bg-emerald-400'
                      : 'w-2 h-3 bg-sky-400'
                  }`}
                  style={{
                    left: `${(i * (isJackpot ? 3.1 : 4.8) + 2).toFixed(1)}%`,
                    top: '-6%',
                    animation: `particleFall 3s cubic-bezier(0.2, 0.7, 0.2, 1) both`,
                    animationDelay: `${((i % 7) * 0.1).toFixed(2)}s`,
                    ['--drift' as any]: `${((i % 2 === 0 ? 1 : -1) * 32).toFixed(0)}px`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Frosted Glass Result Card */}
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.84, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -14 }}
            transition={{ type: 'spring', stiffness: 360, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-sm p-6 sm:p-7 rounded-3xl text-center bg-[#080d1d]/82 backdrop-blur-2xl ring-1 ring-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.88)] border ${
              isJackpot
                ? 'border-amber-400/75'
                : isWin
                ? 'border-emerald-400/70'
                : 'border-red-500/65'
            }`}
          >
            {/* Top Glass Specular Highlight */}
            <div
              className={`absolute top-0 inset-x-8 h-[2px] rounded-full ${
                isJackpot
                  ? 'bg-gradient-to-r from-transparent via-amber-300 to-transparent'
                  : isWin
                  ? 'bg-gradient-to-r from-transparent via-emerald-300 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-red-400 to-transparent'
              }`}
            />

            {/* Floating Emblem */}
            <motion.div
              initial={{ scale: 0.5, rotate: -14 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.06 }}
              className={`w-20 h-20 mx-auto -mt-12 mb-4 rounded-3xl flex items-center justify-center font-display text-2xl sm:text-3xl font-black shadow-2xl border backdrop-blur-xl ${
                isJackpot
                  ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 border-amber-200 shadow-[0_0_32px_rgba(245,158,11,0.55)]'
                  : isWin
                  ? 'bg-gradient-to-br from-emerald-300 via-emerald-400 to-emerald-600 text-slate-950 border-emerald-200 shadow-[0_0_28px_rgba(16,185,129,0.5)]'
                  : 'bg-gradient-to-br from-red-500 via-rose-600 to-red-800 text-white border-red-300/70 shadow-[0_0_24px_rgba(239,68,68,0.45)]'
              }`}
            >
              {isJackpot ? '9X' : isWin ? `L${lvl}` : 'FIX'}
            </motion.div>

            {/* Title */}
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-wider text-white">
              {isJackpot
                ? '9X JACKPOT HIT!'
                : isWin
                ? lvl <= 2
                  ? 'UNDER-2 WIN HIT!'
                  : lvl === 3
                  ? 'L3 FIX CONFIRMED!'
                  : `L${lvl} SHIELD SAVED!`
                : lvl >= 5
                ? 'SHIELD CYCLE RESET'
                : `ARMING L${lvl + 1} FIX`}
            </h2>

            <p className="mt-1.5 text-xs font-mono text-slate-300 tabular-nums">
              Period <span className="font-bold text-sky-300">#{result.period.slice(-6)}</span> ·{' '}
              <span className={estPnl >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {estPnl >= 0 ? '+' : '-'}₹{Math.abs(estPnl)}
              </span>
            </p>

            {/* Glass Comparison Grid */}
            <div className="grid grid-cols-2 gap-2.5 my-4 font-mono tabular-nums">
              <div className="bg-white/[0.04] backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Predicted
                </div>
                <div
                  className={`text-lg font-black ${
                    result.pred === 'BIG' ? 'text-[#ff4d6d]' : 'text-[#10b981]'
                  }`}
                >
                  {result.pred}
                  {result.singleJackpotDigit !== undefined ? ` [${result.singleJackpotDigit}]` : ''}
                </div>
              </div>

              <div className="bg-white/[0.04] backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Official Draw
                </div>
                <div className="text-lg font-black text-amber-300">
                  {result.result}{' '}
                  <span className="text-sm font-bold text-slate-300">({result.number})</span>
                </div>
              </div>
            </div>

            <div
              className={`inline-block px-4 py-1.5 rounded-xl font-mono font-black text-xs tracking-wider uppercase border ${
                isJackpot
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                  : isWin
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
                  : 'bg-red-500/20 text-red-200 border-red-400/50'
              }`}
            >
              {isJackpot
                ? '9X SINGLE DIGIT + SIZE LOCK'
                : isWin
                ? `LEVEL ${lvl} UNDER-LIMIT WIN`
                : 'REGIME ORACLE RECALIBRATING'}
            </div>

            {/* Auto-dismiss countdown sweep bar */}
            <div className="mt-4 w-full h-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                key={`bar-${resultKey}`}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
                className={`h-full w-full origin-left ${
                  isJackpot
                    ? 'bg-amber-400'
                    : isWin
                    ? 'bg-emerald-400'
                    : 'bg-red-400'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-2.5 w-full min-h-[42px] py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 transition-colors cursor-pointer"
            >
              Auto-Closing · Tap to Skip
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
