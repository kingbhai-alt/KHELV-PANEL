import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BacktestSummary } from '../logic/backtestEngine';

interface PredictionRevealStageProps {
  period: string;
  prediction: 'BIG' | 'SMALL' | '---';
  singleDigit: number;
  numPair: [number, number];
  confidence: number;
  currentLevel: number;
  isK3: boolean;
  isTrx: boolean;
  rule?: string;
  backtestSummary?: BacktestSummary;
  decodeKey: string;
  isDecodingOverlayActive?: boolean;
  baseStake?: number;
}

export const PredictionRevealStage: React.FC<PredictionRevealStageProps> = ({
  period,
  prediction,
  singleDigit,
  numPair,
  confidence,
  currentLevel,
  isK3,
  isTrx,
  rule,
  backtestSummary,
  isDecodingOverlayActive = false,
  baseStake = 100,
}) => {
  const isMasked = isDecodingOverlayActive || prediction === '---';
  const mult =
    currentLevel >= 5
      ? 19.2
      : currentLevel === 4
      ? 9.2
      : currentLevel === 3
      ? 4.4
      : currentLevel === 2
      ? 2.1
      : 1.0;
  const recommendedStake = Math.round(baseStake * mult);

  return (
    <motion.div
      layout
      data-testid="prediction-hero-card"
      className="relative rounded-2xl bg-[#090e1d]/80 backdrop-blur-xl ring-1 ring-white/10 border border-sky-500/35 shadow-[0_20px_50px_rgba(14,165,233,0.16)] p-3.5 sm:p-4 overflow-hidden"
    >
      {/* Top Laser Accent */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-400" />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded-md bg-sky-950/90 text-sky-300 font-mono text-[10px] font-bold border border-sky-500/30 whitespace-nowrap shrink-0">
            {isK3 ? 'K3 LIVE' : isTrx ? 'TRX LIVE' : '28-ALGO ORACLE'}
          </span>
          <h2 className="font-display text-xs sm:text-sm font-extrabold tracking-wider text-white uppercase truncate">
            {isMasked ? (
              <>
                <span className="sm:hidden">DECODING SIGNAL</span>
                <span className="hidden sm:inline">DECODING NEXT SIGNAL</span>
              </>
            ) : (
              <>
                <span className="sm:hidden">SURESHOT SIGNAL</span>
                <span className="hidden sm:inline">NEXT SURESHOT SIGNAL</span>
              </>
            )}
          </h2>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold border whitespace-nowrap shrink-0 ${
            currentLevel >= 5
              ? 'bg-red-950/90 text-red-200 border-red-400/60'
              : currentLevel === 4
              ? 'bg-orange-950/90 text-orange-200 border-orange-400/60'
              : currentLevel === 3
              ? 'bg-red-950/80 text-red-300 border-red-500/40'
              : currentLevel === 2
              ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
          }`}
        >
          {currentLevel >= 5
            ? 'L5 TITANIUM LOCK'
            : currentLevel === 4
            ? 'L4 ULTRA SHIELD'
            : currentLevel === 3
            ? 'L3 HARDLOCK'
            : currentLevel === 2
            ? 'L2 RECOVERY'
            : 'LEVEL 1'}
        </span>
      </div>

      {/* Masked vs Revealed Framer Motion Transition */}
      <AnimatePresence mode="wait">
        {isMasked ? (
          <motion.div
            key={`masked-${period || 'wait'}`}
            data-testid="prediction-decoding-stage"
            initial={{ opacity: 0.4, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.16 } }}
            className="rounded-xl bg-[#040711]/90 border border-sky-500/35 p-4 text-center space-y-2.5"
          >
            <div className="text-[11px] font-mono text-sky-300 font-bold tracking-wider uppercase">
              {prediction === '---'
                ? 'SYNCING LIVE DRAW STREAM...'
                : `DECODING PERIOD #${period.slice(-6)} · 4.0S CYBER TERMINAL ACTIVE`}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-[#090f22] border border-slate-800 p-3">
                <div className="text-[10px] font-mono text-slate-400">TARGET SIZE</div>
                <div className="font-display text-2xl font-black text-sky-300 tracking-widest mt-1">
                  LOCKED
                </div>
              </div>
              <div className="rounded-xl bg-[#090f22] border border-amber-500/30 p-3">
                <div className="text-[10px] font-mono text-amber-300">9X SINGLE DIGIT</div>
                <div className="font-mono text-2xl font-black text-amber-300 tracking-widest mt-1">
                  [?]
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`revealed-${period}-${prediction}-${singleDigit}`}
            layout
            data-testid="prediction-revealed-stage"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          >
            <div className="grid grid-cols-2 gap-2.5">
              {/* Panel 1: BIG / SMALL */}
              <div className="rounded-xl bg-[#050814]/90 border border-white/10 p-3 text-center flex flex-col justify-between min-h-[112px] backdrop-blur-md">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{isK3 ? 'K3 SUM' : isTrx ? 'TRX SIZE' : 'PRED SIZE'}</span>
                  <span className="text-slate-300 tabular-nums">
                    {isK3
                      ? prediction === 'BIG'
                        ? '11-18'
                        : '3-10'
                      : prediction === 'BIG'
                      ? '5,6,7,8,9'
                      : '0,1,2,3,4'}
                  </span>
                </div>

                <div
                  data-testid="prediction-size-value"
                  className={`font-display text-3xl sm:text-4xl font-black tracking-tight my-1 ${
                    prediction === 'BIG'
                      ? 'text-[#ff4d6d] drop-shadow-[0_0_20px_rgba(255,77,109,0.45)]'
                      : 'text-[#10b981] drop-shadow-[0_0_20px_rgba(16,185,129,0.45)]'
                  }`}
                >
                  {prediction}
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-300 tabular-nums">
                  <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800">
                    Conf {confidence}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-sky-300">
                    Pair {numPair[0]},{numPair[1]}
                  </span>
                </div>
              </div>

              {/* Panel 2: SINGLE JACKPOT DIGIT (9X) */}
              <div className="relative rounded-xl bg-gradient-to-b from-[#171832]/95 to-[#080a18]/95 border border-amber-400/75 p-3 text-center flex flex-col justify-between min-h-[112px] shadow-[0_0_26px_rgba(245,158,11,0.2)]">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-amber-300 font-bold uppercase">SINGLE JACKPOT</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-400/40">
                    9X
                  </span>
                </div>

                <div
                  data-testid="prediction-single-digit"
                  className="font-mono text-4xl sm:text-5xl font-black text-amber-300 tracking-wider tabular-nums drop-shadow-[0_0_22px_rgba(250,204,21,0.55)]"
                >
                  [{singleDigit}]
                </div>

                <div className="text-[10px] font-mono text-amber-200/90 tabular-nums">
                  Suggested L{currentLevel} Stake: <strong className="text-white">₹{recommendedStake}</strong>
                </div>
              </div>
            </div>

            {/* Backtest Verification Strip */}
            {backtestSummary && (
              <div className="mt-2.5 space-y-1.5 font-mono text-[10px] tabular-nums">
                <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#050814]/90 border border-slate-800/90 text-slate-300">
                  <span>
                    Pool: <strong className="text-sky-300">{backtestSummary.datasetSize} Rds</strong>
                  </span>
                  <span>
                    U2: <strong className="text-emerald-400">{backtestSummary.bestUnder2FixRate}%</strong>
                  </span>
                  <span>
                    U3: <strong className="text-emerald-400">{backtestSummary.bestUnder3FixRate}%</strong>
                  </span>
                  <span>
                    U5 Shield: <strong className="text-emerald-300">{backtestSummary.bestUnder5FixRate}%</strong>
                  </span>
                  <span>
                    L1: <strong className="text-amber-300">{backtestSummary.bestLevel1Accuracy}%</strong>
                  </span>
                </div>

                <div
                  className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 ${
                    backtestSummary.entrySignal === 'SURESHOT_LOCK'
                      ? 'bg-emerald-950/50 border-emerald-500/45 text-emerald-300'
                      : backtestSummary.entrySignal === 'STRONG_ENTRY'
                      ? 'bg-sky-950/50 border-sky-500/45 text-sky-300'
                      : 'bg-amber-950/40 border-amber-500/45 text-amber-300'
                  }`}
                >
                  <span className="font-bold truncate">
                    {backtestSummary.entrySignal === 'SURESHOT_LOCK'
                      ? 'SURESHOT LOCK'
                      : backtestSummary.entrySignal === 'STRONG_ENTRY'
                      ? 'STRONG ENTRY'
                      : 'SPLIT WINDOW'}
                    <span className="font-normal opacity-90 ml-1.5">· {backtestSummary.entryReason}</span>
                  </span>
                  <span className="shrink-0 text-slate-300">
                    {backtestSummary.executionTimeMs}ms
                  </span>
                </div>

                {rule && (
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-slate-400">
                    <span className="shrink-0">Engine:</span>
                    <span className="text-slate-200 truncate">{rule}</span>
                    {rule.includes('DTR:') && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded bg-violet-950/80 border border-violet-400/40 text-violet-300 font-bold text-[9px] font-mono">
                        DTR ACTIVE
                      </span>
                    )}
                    {rule.includes('QD:') && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-bold text-[9px] font-mono">
                        QUANTUM DRIFT
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
