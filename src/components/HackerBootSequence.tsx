import React, { useEffect, useRef, useState } from 'react';
import { BrandLogo } from './BrandLogo';

interface HackerBootSequenceProps {
  durationMs?: number;
  onComplete: () => void;
}

const BOOT_STAGES = [
  {
    atPct: 0,
    code: '0x01',
    title: 'INITIALIZING KHELV QUANTUM KERNEL',
    detail: 'Mounting encrypted cyber-quant runtime & memory ring...',
  },
  {
    atPct: 16,
    code: '0x02',
    title: 'LOADING 1,099+ ROUND DATASET BUFFER',
    detail: 'Indexing JaiClub + Kurma + live draws across chronological blocks...',
  },
  {
    atPct: 34,
    code: '0x03',
    title: 'CALIBRATING 28 ALGORITHMS & MIRROR/DRAGON SHIELD',
    detail: 'Synchronizing Under-2 Quantum Shield, Mirror/ZigZag & CTW-5...',
  },
  {
    atPct: 54,
    code: '0x04',
    title: 'EXECUTING 170,000 MATHEMATICAL MATRIX CALCS',
    detail: 'Compiling 10 differentiated families + 3-Way Digital Root...',
  },
  {
    atPct: 74,
    code: '0x05',
    title: 'ARMING 18-CLUSTER 2,560,000 NODE ORACLE',
    detail: 'Verifying Under-2 Fix & Deep L1-L5 Titanium Shield routing...',
  },
  {
    atPct: 90,
    code: '0x06',
    title: 'UNLIMITED ENGINE VERIFIED • LAUNCHING LOGIN VAULT',
    detail: 'Zero-cap continuous stream ready. Transferring to Key Gate...',
  },
];

const HEX_GLYPHS = '0123456789ABCDEFKHELVΔΩΣΨλπ';

export const HackerBootSequence: React.FC<HackerBootSequenceProps> = ({
  durationMs = 10000,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [progress, setProgress] = useState(0);
  const [remainingSec, setRemainingSec] = useState(durationMs / 1000);
  const [cipherStream, setCipherStream] = useState('A9F4·7E1C·99B0·KHELV');

  // 60fps Matrix / Hex Cipher Canvas Backdrop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const fontSize = 14;
    let columns = Math.max(12, Math.floor(canvas.width / fontSize));
    let drops = new Array(columns).fill(0).map(() => Math.floor(Math.random() * -30));

    let lastDraw = 0;
    const draw = (ts: number) => {
      animId = requestAnimationFrame(draw);
      if (ts - lastDraw < 42) return;
      lastDraw = ts;

      if (Math.floor(canvas.width / fontSize) !== columns) {
        columns = Math.max(12, Math.floor(canvas.width / fontSize));
        drops = new Array(columns).fill(0).map(() => Math.floor(Math.random() * 20));
      }

      ctx.fillStyle = 'rgba(4, 7, 17, 0.16)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const ch = HEX_GLYPHS[Math.floor(Math.random() * HEX_GLYPHS.length)];
        const isHead = drops[i] % 7 === 0;
        ctx.fillStyle = isHead
          ? 'rgba(16, 185, 129, 0.85)'
          : i % 3 === 0
          ? 'rgba(56, 189, 248, 0.36)'
          : 'rgba(14, 165, 233, 0.18)';
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.965) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Deterministic 10.0-second timeline
  useEffect(() => {
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      const rem = Math.max(0, (durationMs - elapsed) / 1000);
      setProgress(pct);
      setRemainingSec(rem);

      if (elapsed >= durationMs) {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const cipherInterval = setInterval(() => {
      const seg = () =>
        Array.from({ length: 4 }, () => HEX_GLYPHS[Math.floor(Math.random() * 16)]).join('');
      setCipherStream(`${seg()}·${seg()}·${seg()}·${seg()}`);
    }, 95);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(cipherInterval);
    };
  }, [durationMs]);

  const activeStageIndex = BOOT_STAGES.reduce(
    (acc, stage, idx) => (progress >= stage.atPct ? idx : acc),
    0
  );
  const activeStage = BOOT_STAGES[activeStageIndex];

  return (
    <div
      data-testid="hacker-boot-sequence"
      className="fixed inset-0 z-[1200] bg-[#040711] text-slate-100 flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
    >
      {/* 60fps Matrix/Hex Stream Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-75 pointer-events-none"
      />

      {/* Ambient cyber vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(14,165,233,0.16) 0%, rgba(4,7,17,0.78) 55%, rgba(4,7,17,0.96) 100%)',
        }}
      />

      {/* Central Decoding Terminal Shell */}
      <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-[#070c1a]/92 border border-sky-500/35 shadow-[0_0_90px_rgba(14,165,233,0.22)] backdrop-blur-xl overflow-hidden">
        {/* Top laser progress beam */}
        <div className="h-1 w-full bg-slate-900 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400 transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Terminal Window Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-[#050914]/80 font-mono text-[11px] tabular-nums">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sky-300 font-bold tracking-widest uppercase">
              KHELV_OS // QUANTUM DECODER BOOT
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-slate-400">{cipherStream}</span>
            <span
              data-testid="boot-countdown"
              className="px-2.5 py-0.5 rounded-md bg-sky-950/90 border border-sky-400/40 text-sky-300 font-bold"
            >
              {remainingSec.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Core Hero Reticle + Brand Identity */}
        <div className="p-5 sm:p-7 flex flex-col items-center text-center">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center mb-5">
            {/* Outer clockwise segmented ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-sky-400/55 animate-spin-slow" />
            {/* Inner counter-clockwise precision ring */}
            <div className="absolute inset-2.5 rounded-full border-2 border-emerald-400/45 border-t-amber-400 border-b-transparent animate-spin-rev" />
            {/* Static halo */}
            <div className="absolute inset-5 rounded-full bg-sky-500/10 blur-md" />
            <BrandLogo
              alt="KHELV GAME PENEL"
              className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl border-2 border-sky-400/80 shadow-[0_0_28px_rgba(56,189,248,0.45)]"
            />
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-[0.14em] text-white">
            KHELV GAME PENEL
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-mono text-sky-300/90 tracking-wider uppercase">
            25-Algo Backtest · 170K Pure Calculations · Unlimited Free Wins
          </p>

          {/* Progress Telemetry Readout */}
          <div className="w-full mt-5 mb-4">
            <div className="flex items-center justify-between text-xs font-mono mb-1.5 tabular-nums">
              <span className="text-emerald-400 font-bold">
                DECODING STAGE {activeStageIndex + 1}/{BOOT_STAGES.length}
              </span>
              <span className="text-white font-extrabold">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-900/95 border border-slate-800 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-400 shadow-[0_0_14px_rgba(56,189,248,0.65)] transition-[width] duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 6-Stage Hacker Log Matrix */}
          <div className="w-full rounded-2xl bg-[#040711]/90 border border-slate-800/90 p-3.5 text-left font-mono text-[11px] space-y-1.5">
            {BOOT_STAGES.map((stage, idx) => {
              const isDone = idx < activeStageIndex || progress >= 99.5;
              const isCurrent = idx === activeStageIndex && progress < 99.5;
              return (
                <div
                  key={stage.code}
                  className={`flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-sky-950/60 border border-sky-500/40 text-sky-200'
                      : isDone
                      ? 'bg-emerald-950/25 text-emerald-300/90'
                      : 'text-slate-600'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] opacity-80">[{stage.code}]</span>
                      <span className="font-bold truncate">{stage.title}</span>
                    </div>
                    {isCurrent && (
                      <div className="text-[10px] text-sky-300/80 mt-0.5 truncate">
                        &gt; {activeStage.detail}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] font-bold">
                    {isDone ? 'OK' : isCurrent ? 'SYNC...' : 'WAIT'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
