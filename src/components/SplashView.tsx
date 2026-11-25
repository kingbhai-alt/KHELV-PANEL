import React from 'react';
import { BrandLogo } from './BrandLogo';
import { ThemeSwitcher } from './ThemeSwitcher';
import { sfx } from '../utils/audio';

interface SplashViewProps {
  onStart: () => void;
}

export const SplashView: React.FC<SplashViewProps> = ({ onStart }) => {
  const handleStart = () => {
    sfx.click();
    onStart();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--kp-bg)] text-[var(--kp-text)] p-6 text-center select-none transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher compact />
      </div>

      {/* Background ambient lighting */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: 'var(--kp-glow)' }}
      />

      {/* Rotating Mascot Ring */}
      <div className="relative w-44 h-44 flex items-center justify-center mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-dashed border-[var(--kp-accent)]/40 animate-spin-slow pointer-events-none" />
        <div className="absolute -inset-3 rounded-full border-2 border-dotted border-red-500/30 animate-spin-rev pointer-events-none" />
        <BrandLogo
          alt="KHELV PENEL Mascot"
          className="w-32 h-32 rounded-full shadow-2xl animate-logo-pulse"
        />
      </div>

      {/* Titles */}
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wider bg-gradient-to-r from-sky-600 via-blue-600 to-emerald-600 dark:from-sky-400 dark:via-blue-400 dark:to-emerald-400 bg-clip-text text-transparent drop-shadow-md">
        KHELV PENEL
      </h1>
      <div className="mt-2 text-xs font-mono tracking-widest text-[var(--kp-accent-text)] uppercase px-3 py-1 bg-[var(--kp-surface)] border border-[var(--kp-border)] rounded-full">
        500+ HISTORY BACKTEST • 3-LEVEL FIX WIN
      </div>

      <p className="mt-4 max-w-sm text-sm text-[var(--kp-muted)] leading-relaxed font-sans">
        Powered by exact 5-method master calculation, hybrid chaos logic, and strict streak trend momentum filters.
      </p>

      {/* Start Button */}
      <button
        onClick={handleStart}
        className="mt-8 px-9 py-4 rounded-2xl text-base sm:text-lg font-black tracking-widest text-white uppercase bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 hover:brightness-110 border border-sky-400/40 shadow-xl active:scale-95 transition-all duration-150 animate-btn-breath cursor-pointer"
      >
        START PREDICTOR
      </button>

      <div className="mt-6 flex items-center gap-3 text-xs text-[var(--kp-muted)] font-mono">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        Live WinGo 30S & 1M Synchronizer
      </div>
    </div>
  );
};
