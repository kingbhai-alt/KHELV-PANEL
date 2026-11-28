import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface PredictionDecoderOverlayProps {
  isOpen: boolean;
  period: string;
  gameMode: string;
  currentLevel: number;
  isK3: boolean;
  datasetSize: number;
  bestUnder2Rate?: number;
  bestUnder3Rate?: number;
  bestUnder5Rate?: number;
  durationMs?: number;
  onComplete: () => void;
}

const GLYPHS = '0123456789ABCDEF#$%&*+=?░▒▓';

const TERMINAL_STAGES = [
  {
    atPct: 0,
    code: '0x01',
    title: 'MOUNTING 1,099+ HISTORICAL MATRIX',
    resolvedText: 'BUFFER LOCKED · FULL REGIME MEMORY',
  },
  {
    atPct: 24,
    code: '0x02',
    title: 'EXECUTING 28 QUANTITATIVE ALGORITHMS',
    resolvedText: 'MIRROR + DRAGON + ZIGZAG SHIELDED',
  },
  {
    atPct: 52,
    code: '0x03',
    title: 'SOLVING 170,000 REAL CALCULATIONS',
    resolvedText: '18 CLUSTERS · 2,560,000 NODES CONVERGED',
  },
  {
    atPct: 78,
    code: '0x04',
    title: 'CALIBRATING UNDER-LEVEL FIX & 9X DIGIT',
    resolvedText: 'HIGH-CONFIDENCE SIGNAL ARMING...',
  },
];

function scrambleString(target: string, progressRatio: number): string {
  const lockedCount = Math.floor(target.length * Math.min(1, Math.max(0, progressRatio)));
  let out = '';
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    if (ch === ' ' || ch === '·' || ch === '-' || ch === '.') {
      out += ch;
    } else if (i < lockedCount) {
      out += ch;
    } else {
      out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
  }
  return out;
}

export const PredictionDecoderOverlay: React.FC<PredictionDecoderOverlayProps> = ({
  isOpen,
  period,
  gameMode,
  currentLevel,
  isK3,
  datasetSize,
  bestUnder2Rate = 79,
  bestUnder3Rate = 90,
  bestUnder5Rate = 98,
  durationMs = 4000,
  onComplete,
}) => {
  const [progressPct, setProgressPct] = useState(0);
  const [remainingSec, setRemainingSec] = useState(durationMs / 1000);
  const [scrambleSize, setScrambleSize] = useState('SCAN');
  const [scrambleDigit, setScrambleDigit] = useState(7);
  const [decodedHeader, setDecodedHeader] = useState('QUANTUM BACKTEST DECODER');
  const [decodedSubline, setDecodedSubline] = useState('28 ALGOS + 170K MATRIX SOLVING');
  const [tickFrame, setTickFrame] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isOpen) return;

    setProgressPct(0);
    setRemainingSec(durationMs / 1000);
    setTickFrame(0);

    const startTime = performance.now();
    let rafId = 0;
    let completed = false;

    const rafLoop = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / durationMs);
      setProgressPct(ratio * 100);
      setRemainingSec(Math.max(0, (durationMs - elapsed) / 1000));

      if (ratio >= 1 && !completed) {
        completed = true;
        onCompleteRef.current();
        return;
      }
      rafId = requestAnimationFrame(rafLoop);
    };

    rafId = requestAnimationFrame(rafLoop);

    const scrambleTimer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const ratio = Math.min(1, elapsed / durationMs);
      setTickFrame((f) => f + 1);
      setScrambleSize(['BIG', 'SMALL', 'HASH', 'SYNC'][Math.floor(Math.random() * 4)]);
      setScrambleDigit(isK3 ? 3 + Math.floor(Math.random() * 16) : Math.floor(Math.random() * 10));
      setDecodedHeader(scrambleString('QUANTUM BACKTEST DECODER', ratio * 1.15));
      setDecodedSubline(scrambleString('28 ALGOS · 170K REAL CALCS · U5 SHIELD', ratio * 1.05));
    }, 65);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(scrambleTimer);
    };
  }, [isOpen, period, durationMs, isK3]);

  const activeStageIdx = Math.min(
    TERMINAL_STAGES.length - 1,
    TERMINAL_STAGES.reduce((acc, st, i) => (progressPct >= st.atPct ? i : acc), 0)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={`decoder-overlay-${period}`}
          data-testid="prediction-decoder-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] } }}
          className="fixed inset-0 z-[720] flex items-center justify-center p-3 sm:p-6 bg-[#03060f]/75 backdrop-blur-xl select-none"
        >
          {/* Ambient radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 40%, rgba(14, 165, 233, 0.20), rgba(16, 185, 129, 0.08) 45%, transparent 72%)',
            }}
          />

          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-xl rounded-3xl bg-[#070c1a]/88 backdrop-blur-2xl border border-sky-400/40 shadow-[0_32px_96px_rgba(2,132,199,0.28)] p-4 sm:p-6 text-slate-100 overflow-hidden ring-1 ring-white/10"
          >
            {/* Top Laser Horizon */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400" />
            {/* Scanning Horizontal Light */}
            <div className="absolute inset-x-0 h-14 bg-gradient-to-b from-transparent via-sky-400/12 to-transparent animate-scan-beam pointer-events-none" />

            {/* Top Header Row */}
            <div className="relative flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800/80">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-mono text-[10px] text-sky-300 font-bold tracking-widest">
                  <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-400/40 whitespace-nowrap">
                    {gameMode} · PERIOD #{period.slice(-6)}
                  </span>
                  <span className="text-emerald-300 whitespace-nowrap">
                    {currentLevel >= 2 ? `L${currentLevel} UNDER-2 RECOVERY` : 'LEVEL 1 SURESHOT'}
                  </span>
                </div>
                <h2 className="font-display text-sm sm:text-lg font-black tracking-wider text-white mt-1.5 truncate">
                  {decodedHeader}
                </h2>
                <p className="font-mono text-[10px] text-slate-400 truncate">
                  {decodedSubline}
                </p>
              </div>

              <div className="shrink-0 text-right font-mono tabular-nums">
                <div
                  data-testid="decoder-countdown-timer"
                  className="px-3 py-1.5 rounded-xl bg-[#040711]/90 border border-sky-400/50 text-sky-300 text-base sm:text-lg font-black shadow-inner"
                >
                  {remainingSec.toFixed(1)}s
                </div>
                <div className="text-[9px] text-slate-400 mt-1">
                  {Math.round(progressPct)}% SYNC
                </div>
              </div>
            </div>

            {/* Scrambling Prediction Matrix Dual Preview */}
            <div className="relative grid grid-cols-2 gap-3 mb-4">
              <motion.div
                layout
                className="rounded-2xl bg-[#040814]/85 border border-sky-500/30 p-3.5 text-center backdrop-blur-md"
              >
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  TARGET SIZE STREAM
                </div>
                <div className="font-display text-2xl sm:text-3xl font-black tracking-widest text-sky-300 my-1.5 tabular-nums">
                  {scrambleSize}
                </div>
                <div className="text-[10px] font-mono text-emerald-300/85">
                  {datasetSize || 1109} Rds Backtested
                </div>
              </motion.div>

              <motion.div
                layout
                className="rounded-2xl bg-[#040814]/85 border border-amber-400/35 p-3.5 text-center backdrop-blur-md"
              >
                <div className="text-[10px] font-mono text-amber-300 uppercase tracking-wider">
                  9X DIGIT CONVERGENCE
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-amber-300 my-1.5 tabular-nums">
                  [{scrambleDigit}]
                </div>
                <div className="text-[10px] font-mono text-amber-200/80">
                  U2: {bestUnder2Rate}% · U3: {bestUnder3Rate}% · U5: {bestUnder5Rate}%
                </div>
              </motion.div>
            </div>

            {/* Real-Time Progress Sweep */}
            <div className="w-full h-2 rounded-full bg-slate-900/90 border border-slate-800 overflow-hidden mb-4">
              <div
                className="h-full w-full origin-left bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-400 transition-transform duration-75"
                style={{ transform: `scaleX(${Math.min(1, progressPct / 100)})` }}
              />
            </div>

            {/* Real-Time Cyber Terminal Stream */}
            <div className="space-y-1.5 font-mono text-[11px] tabular-nums">
              {TERMINAL_STAGES.map((stage, idx) => {
                const isDone = idx < activeStageIdx || progressPct >= 98;
                const isActive = idx === activeStageIdx && progressPct < 98;
                const stageProgress = isDone
                  ? 1
                  : isActive
                  ? Math.min(1, (progressPct - stage.atPct) / 26)
                  : 0;
                const shownRight = isDone
                  ? stage.resolvedText
                  : isActive
                  ? scrambleString(stage.resolvedText, stageProgress + (tickFrame % 3) * 0.05)
                  : 'QUEUED';

                return (
                  <motion.div
                    key={stage.code}
                    layout
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors ${
                      isDone
                        ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-200'
                        : isActive
                        ? 'bg-sky-950/50 border-sky-400/50 text-sky-200'
                        : 'bg-[#040711]/70 border-slate-800/80 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold opacity-80 shrink-0">
                        [{stage.code}]
                      </span>
                      <span className="truncate font-semibold">{stage.title}</span>
                    </div>
                    <span className="text-[10px] shrink-0 font-bold max-w-[46%] truncate">
                      {isDone ? '✓ ' : isActive ? '› ' : ''}
                      {shownRight}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
