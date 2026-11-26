import React, { useState } from 'react';
import { WinGoMode } from '../services/lotteryService';
import { LicenseSession } from '../services/licenseService';
import { BrandLogo } from './BrandLogo';

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
      color: 'border-emerald-500/60 bg-emerald-950/20 text-emerald-400',
    },
    {
      id: 'TRX_1M',
      title: 'TRX WinGo 1M',
      interval: '1 MINUTE BLOCK ROUND',
      tag: '💎 TRX BLOCKCHAIN LIVE',
      desc: 'Tron Hash Block Verification • 0-4 Small | 5-9 Big Single Sureshot',
      highlight: true,
      color: 'border-cyan-400/80 bg-cyan-950/30 text-cyan-300',
    },
    {
      id: 'K3_1M',
      title: 'K3 WinGo 1M',
      interval: '1 MINUTE DICE ROUND',
      tag: '🎲 K3 LIVE API (3-18)',
      desc: '3-10 Small | 11-18 Big • 3-Dice Sum & Single Number Sureshot',
      highlight: true,
      color: 'border-amber-400/70 bg-amber-950/30 text-amber-300',
    },
    {
      id: '30S',
      title: 'WinGo 30S',
      interval: '30 SECONDS RAPID',
      tag: '⚡ ULTRA FAST BYPASS',
      desc: 'High Frequency Scalping • Sub-10ms 500-Round Backtest Routing',
      color: 'border-sky-500/50 bg-sky-950/20 text-sky-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/95 backdrop-blur-2xl overflow-y-auto">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(14,165,233,0.22),rgba(0,0,0,0))] pointer-events-none" />

      <div className="relative w-full max-w-md my-auto rounded-3xl bg-[#090d16] border-2 border-sky-500/40 shadow-[0_0_50px_rgba(14,165,233,0.25)] p-5 text-white overflow-hidden">
        {/* Top Iridescent Glow line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400" />

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
          <BrandLogo
            alt="KHELV GAME PENEL Logo"
            className="w-11 h-11 rounded-xl border border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.4)]"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-wider text-white">
                KHELV GAME PENEL
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-mono font-bold border border-sky-500/40">
                500+ BACKTEST
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              License: {licenseSession.tier} • 3-Level Fix-Win Engine Armed
            </p>
          </div>
        </div>

        {/* Subtitle instructions */}
        <div className="mb-4">
          <p className="text-xs text-slate-300 font-medium">
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
                    ? 'ring-2 ring-sky-400 scale-[1.01]'
                    : 'hover:border-sky-400/80 hover:bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{m.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/50 border border-white/10 font-bold">
                      {m.interval}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    {m.desc}
                  </div>
                </div>

                <div className="text-right pl-2">
                  <span className="text-[10px] font-extrabold font-mono block">
                    {m.tag}
                  </span>
                  <span className="text-xs text-slate-400 group-hover:text-sky-400 font-bold">
                    SELECT →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Loading status banner */}
        {isConnecting && (
          <div className="p-3 rounded-xl bg-[#071926] border border-sky-500/60 text-sky-300 text-xs font-mono flex items-center gap-2 animate-pulse mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping inline-block" />
            <span>{statusText}</span>
          </div>
        )}

        {/* Device Lock Info */}
        <div className="text-[10px] text-slate-500 font-mono text-center pt-2 border-t border-slate-800">
          Hardware Locked: {licenseSession.deviceId.slice(0, 16)}...
        </div>
      </div>
    </div>
  );
};
