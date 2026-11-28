import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BacktestSummary } from '../logic/backtestEngine';
import { sfx } from '../utils/audio';

interface PredictionDecodingOverlayProps {
  visible: boolean;
  period: string;
  currentLevel: number;
  isK3: boolean;
  isTrx: boolean;
  backtestSummary?: BacktestSummary;
  durationMs?: number;
  onComplete: () => void;
}

const SCRAMBLE_SIZES = ['BIG', 'SMALL', 'SCAN', 'LOCK'];

export const PredictionDecodingOverlay: React.FC<PredictionDecodingOverlayProps> = ({
  visible,
  period,
  currentLevel,
  isK3,
  isTrx,
  backtestSummary,
  durationMs = 4000,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [remSec, setRemSec] = useState(durationMs / 1000);
  const [scrambleSize, setScrambleSize] = useState('SCAN');
  const [scrambleDigit, setScrambleDigit] = useState(7);
  const [hashStream, setHashStream] = useState('9F3A·KHELV·1099·SHIELD');

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  const terminalLogs = useMemo(() => {
    const ds = backtestSummary?.datasetSize ?? 1100;
    const best = backtestSummary?.bestStrategyName ?? 'Under-2 Quantum Pattern Shield';
    const u2 = backtestSummary?.bestUnder2FixRate ?? 79;
    const u3 = backtestSummary?.bestUnder3FixRate ?? 90;
    return [
      {
        pct: 0,
        tag: 'SYNC_DB',
        text: `Loading ${ds.toLocaleString()}+ historical rounds & Markov state vector...`,
      },
      {
        pct: 22,
        tag: '25_ALGOS',
        text: `Backtesting 25 algorithms + Under-2 Pattern Shield (${u2}% U2 · ${u3}% U3)...`,
      },
      {
        pct: 48,
        tag: '170K_MAT',
        text: `Executing 170,000 calcs · 17 clusters · Top oracle: ${best}`,
      },
      {
        pct: 74,
        tag: `L${currentLevel}_GUARD`,
        text:
          currentLevel >= 2
            ? `Level-${currentLevel} Under-2 Fix Recovery Shield locked — calibrating 9X digit...`
            : `Consensus locked for Period #${period.slice(-6) || '------'} — finalizing signal...`,
      },
    ];
  }, [backtestSummary, currentLevel, period]);

  useEffect(() => {
    if (!visible) return;
    completedRef.current = false;
    setProgress(0);
    setRemSec(durationMs / 1000);

    const start = performance.now();
    let rafId = 0;

    const frame = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      const rem = Math.max(0, (durationMs - elapsed) / 1000);
      setProgress(pct);
      setRemSec(rem);

      if (elapsed >= durationMs) {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
        return;
      }
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    const scrambleId = setInterval(() => {
      setScrambleSize(SCRAMBLE_SIZES[Math.floor(Math.random() * SCRAMBLE_SIZES.length)]);
      setScrambleDigit(isK3 ? 3 + Math.floor(Math.random() * 16) : Math.floor(Math.random() * 10));
      const hex = () => Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0');
      setHashStream(`${hex()}·${hex()}·L${currentLevel}·U2FIX`);
    }, 80);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(scrambleId);
    };
  }, [visible, durationMs, isK3, currentLevel]);

  if (!visible) return null;

  const activeStep = Math.min(3, Math.floor((progress / 100) * 4));

  const handleSkip = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    sfx.click();
    onCompleteRef.current();
  };

  return (
    <div
      data-testid="prediction-decoding-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Prediction Decoding Overlay"
      className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-[#030612]/78 backdrop-blur-2xl select-none animate-fade-up"
    >
      {/* Ambient cyber vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(14,165,233,0.20) 0%, rgba(16,185,129,0.08) 38%, rgba(3,6,18,0.88) 80%)',
        }}
      />

      <div className="relative z-10 w-full max-w-lg rounded-3xl glass-panel-elevated border border-sky-400/45 overflow-hidden">
        {/* Sweeping laser beam */}
        <div className="absolute inset-x-0 h-14 bg-gradient-to-b from-transparent via-sky-400/18 to-transparent animate-scan-beam pointer-events-none" />

        {/* Top hairline progress bar */}
        <div className="h-1.5 w-full bg-slate-950/90 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400 transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Cyber Terminal Bar */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-white/10 bg-black/35 font-mono text-[11px] tabular-nums">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-sky-300 font-extrabold tracking-widest uppercase truncate">
              PREDICTION DECODING · {isK3 ? 'K3' : isTrx ? 'TRX' : 'WINGO'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-slate-400 text-[10px]">{hashStream}</span>
            <span
              data-testid="prediction-overlay-timer"
              className="px-2.5 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/50 text-sky-200 font-black"
            >
              {remSec.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Reticle + Period Target */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                TARGET PERIOD SIGNAL
              </div>
              <div className="font-display text-lg sm:text-xl font-black text-white tabular-nums">
                #{period.slice(-8) || '------'}
              </div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <span
                className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                  currentLevel >= 3
                    ? 'bg-red-950/75 border-red-400/50 text-red-300'
                    : currentLevel === 2
                    ? 'bg-amber-950/75 border-amber-400/50 text-amber-300'
                    : 'bg-emerald-950/75 border-emerald-400/50 text-emerald-300'
                }`}
              >
                {currentLevel >= 3
                  ? 'L3 ANTI-BUST SHIELD'
                  : currentLevel === 2
                  ? 'L2 UNDER-2 FIX LOCK'
                  : 'L1 QUANTUM LOCK'}
              </span>
            </div>
          </div>

          {/* Dual Scrambling Cipher Matrices */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl glass-inset border border-sky-400/25 p-3.5 text-center relative overflow-hidden">
              <div className="text-[10px] font-mono text-sky-300/80 uppercase tracking-wider mb-1">
                25-ALGO SIZE LOCK
              </div>
              <div className="font-display text-3xl sm:text-4xl font-black tracking-widest text-white tabular-nums">
                {scrambleSize}
              </div>
              <div className="text-[10px] font-mono text-emerald-400/90 mt-1">
                {Math.round(progress)}% VERIFIED
              </div>
            </div>

            <div className="rounded-2xl glass-inset border border-amber-400/35 p-3.5 text-center relative overflow-hidden">
              <div className="text-[10px] font-mono text-amber-300/90 uppercase tracking-wider mb-1">
                9X JACKPOT DIGIT
              </div>
              <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-amber-300 tabular-nums">
                [{scrambleDigit}]
              </div>
              <div className="text-[10px] font-mono text-amber-200/80 mt-1">
                MARKOV RESIDUE
              </div>
            </div>
          </div>

          {/* Real-Time Backtest Console Stream */}
          <div className="rounded-2xl glass-inset border border-white/10 p-3 space-y-1.5 font-mono text-[10px] sm:text-[11px]">
            {terminalLogs.map((item, idx) => {
              const done = idx < activeStep;
              const current = idx === activeStep;
              return (
                <div
                  key={item.tag}
                  className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
                    current
                      ? 'bg-sky-500/15 border border-sky-400/40 text-sky-100'
                      : done
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'text-slate-500'
                  }`}
                >
                  <span className="shrink-0 font-bold">
                    {done ? '[OK]' : current ? '[>>]' : '[..]'}
                  </span>
                  <span className="flex-1 min-w-0 leading-snug">
                    <strong className="text-white/90 mr-1.5">{item.tag}</strong>
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
              17 Clusters · 2.3M+ Nodes · Unlimited Engine
            </div>
            <button
              type="button"
              data-testid="skip-decode-btn"
              onClick={handleSkip}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-xs font-mono font-bold text-sky-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Reveal Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
