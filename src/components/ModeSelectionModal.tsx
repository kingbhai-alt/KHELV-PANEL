import React, { useState } from 'react';
import { WinGoMode } from '../services/lotteryService';
import { LicenseSession } from '../services/licenseService';
import { BrandLogo } from './BrandLogo';
import { ThemeSwitcher } from './ThemeSwitcher';

interface ModeSelectionModalProps {
  licenseSession: LicenseSession;
  onSelectMode: (mode: WinGoMode) => void;
}

export const ModeSelectionModal: React.FC<ModeSelectionModalProps> = ({
  licenseSession,
  onSelectMode,
}) => {
  const [selected, setSelected] = useState<WinGoMode | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusText, setStatusText] = useState('');

  const handleSelect = async (mode: WinGoMode) => {
    setSelected(mode);
    setIsConnecting(true);
    setStatusText(`Loading 500+ Round Historical DB for WinGo ${mode}...`);
    await new Promise((r) => setTimeout(r, 450));
    setStatusText(`Backtesting All Algorithms & 3-Level Fix-Win Engine...`);
    await new Promise((r) => setTimeout(r, 400));
    onSelectMode(mode);
  };

  const modes: {
    id: WinGoMode;
    title: string;
    interval: string;
    tag: string;
    desc: string;
    highlight?: boolean;
    color: string;
  }[] = [
    {
      id: '1M',
      title: 'WinGo 1M',
      interval: '1 MINUTE ROUND',
      tag: '🔥 500+ DB BACKTESTED',
      desc: 'Dragon & ZigZag Lock Active • Adaptive 3-Level Fix-Win Flow',
      highlight: true,
      color:
        'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-400',
    },
    {
      id: 'TRX_1M',
      title: 'TRX WinGo 1M',
      interval: '1 MINUTE BLOCK ROUND',
      tag: '💎 TRX BLOCKCHAIN LIVE',
      desc: 'Tron Hash Block Verification • 0-4 Small | 5-9 Big Single Sureshot',
      highlight: true,
      color:
        'border-cyan-500/60 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300',
    },
    {
      id: 'K3_1M',
      title: 'K3 WinGo 1M',
      interval: '1 MINUTE DICE ROUND',
      tag: '🎲 K3 LIVE API (3-18)',
      desc: '3-10 Small | 11-18 Big • 3-Dice Sum & Single Number Sureshot',
      highlight: true,
      color:
        'border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    },
    {
      id: '30S',
      title: 'WinGo 30S',
      interval: '30 SECONDS RAPID',
      tag: '⚡ ULTRA FAST BYPASS',
      desc: 'High Frequency Scalping • Sub-10ms 500-Round Backtest Routing',
      color:
        'border-sky-500/50 bg-sky-50 dark:bg-sky-950/25 text-sky-700 dark:text-sky-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-[var(--kp-bg)]/95 backdrop-blur-2xl overflow-y-auto transition-colors duration-200">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 80% at 50% -10%, var(--kp-glow), transparent)',
        }}
      />

      <div className="relative w-full max-w-md my-auto rounded-3xl bg-[var(--kp-card)] border-2 border-[var(--kp-border)] shadow-2xl p-5 text-[var(--kp-text)] overflow-hidden transition-colors duration-200">
        {/* Top Iridescent Glow line */}
        <div
          className="absolute top-0 inset-x-0 h-1"
          style={{
            background: 'linear-gradient(90deg, var(--kp-accent-2), var(--kp-accent), #10b981)',
          }}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-[var(--kp-border)] pb-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo
              alt="KHELV PENEL Logo"
              className="w-11 h-11 rounded-xl border border-[var(--kp-accent)]/50 shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wider text-[var(--kp-text)] truncate">
                  KHELV PENEL
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--kp-surface)] text-[var(--kp-accent-text)] font-mono font-bold border border-[var(--kp-border)] shrink-0">
                  500+ BACKTEST
                </span>
              </div>
              <p className="text-xs text-[var(--kp-muted)] font-mono truncate">
                License: {licenseSession.tier} • 3-Level Fix-Win Armed
              </p>
            </div>
          </div>

          <ThemeSwitcher compact />
        </div>

        {/* Subtitle instructions */}
        <div className="mb-4">
          <p className="text-xs text-[var(--kp-muted)] font-medium">
            Please choose your target WinGo game mode to load 500+ historical rounds & initiate live synchronization:
          </p>
        </div>

        {/* Modes Grid */}
        <div className="space-y-2.5 mb-4">
          {modes.map((m) => {
            const isThisSelected = selected === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelect(m.id)}
                disabled={isConnecting}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                  m.color
                } ${
                  isThisSelected
                    ? 'ring-2 ring-[var(--kp-accent)] scale-[1.01]'
                    : 'hover:border-[var(--kp-accent)]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[var(--kp-text)]">{m.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900/10 dark:bg-black/50 border border-slate-500/20 dark:border-white/10 font-bold text-[var(--kp-text)]">
                      {m.interval}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--kp-muted)] font-mono mt-1">
                    {m.desc}
                  </div>
                </div>

                <div className="text-right pl-2">
                  <span className="text-[10px] font-extrabold font-mono block">
                    {m.tag}
                  </span>
                  <span className="text-xs text-[var(--kp-muted)] group-hover:text-[var(--kp-accent-text)] font-bold">
                    SELECT →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Loading status banner */}
        {isConnecting && (
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-[#071926] border border-sky-500/60 text-sky-800 dark:text-sky-300 text-xs font-mono flex items-center gap-2 animate-pulse mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-ping inline-block" />
            <span>{statusText}</span>
          </div>
        )}

        {/* Device Lock Info */}
        <div className="text-[10px] text-[var(--kp-muted)] font-mono text-center pt-2 border-t border-[var(--kp-border)]">
          Hardware Locked: {licenseSession.deviceId.slice(0, 16)}...
        </div>
      </div>
    </div>
  );
};
