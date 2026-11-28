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
    setStatusText(`Loading 1,099+ Round Historical DB for WinGo ${mode}...`);
    await new Promise((r) => setTimeout(r, 300));
    setStatusText(`Arming 28 Algorithms & Unlimited Under-Level Shield Engine...`);
    await new Promise((r) => setTimeout(r, 260));
    onSelectMode(mode);
  };

  const modes: {
    id: WinGoMode;
    title: string;
    interval: string;
    tag: string;
    desc: string;
    accent: string;
  }[] = [
    {
      id: '1M',
      title: 'WinGo 1M',
      interval: '60s ROUND',
      tag: '1,099+ DB BACKTESTED',
      desc: 'Anti-Bust Oracle + CTW-5 + 170K Calcs · Unlimited Continuous Flow',
      accent: 'border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/15 text-emerald-300',
    },
    {
      id: 'TRX_1M',
      title: 'TRX WinGo 1M',
      interval: '60s BLOCK',
      tag: 'TRON BLOCKCHAIN',
      desc: 'TRX Hash Live Sync · 0-4 Small | 5-9 Big + 9X Single Jackpot',
      accent: 'border-sky-500/50 hover:border-sky-400 bg-sky-950/15 text-sky-300',
    },
    {
      id: 'K3_1M',
      title: 'K3 WinGo 1M',
      interval: '60s DICE',
      tag: 'K3 SUM 3-18 LIVE',
      desc: '3-10 Small | 11-18 Big · Bell-Curve Sum & Single Jackpot Routing',
      accent: 'border-amber-500/50 hover:border-amber-400 bg-amber-950/15 text-amber-300',
    },
    {
      id: '30S',
      title: 'WinGo 30S',
      interval: '30s RAPID',
      tag: 'HIGH FREQUENCY',
      desc: 'Rapid Scalping Mode · Real-Time 28-Algo Anti-Bust Consensus',
      accent: 'border-violet-500/50 hover:border-violet-400 bg-violet-950/15 text-violet-300',
    },
  ];

  return (
    <div
      data-testid="mode-selection-modal"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-[#040711] overflow-y-auto animate-fade-up"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(14,165,233,0.18), transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-2xl my-auto rounded-3xl bg-[#090e1d]/95 border border-sky-500/35 shadow-[0_24px_80px_rgba(0,0,0,0.85)] p-5 sm:p-7 text-white overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-400" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <BrandLogo
              alt="KHELV GAME PENEL"
              className="w-12 h-12 rounded-2xl border border-sky-500/50"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-lg sm:text-xl font-black tracking-wider text-white">
                  KHELV GAME PENEL
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-950 text-sky-300 font-mono font-bold border border-sky-500/40">
                  UNLIMITED ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                License: {licenseSession.tier} · Select Market Feed to Launch Command Desk
              </p>
            </div>
          </div>
        </div>

        {/* Responsive 2x2 Mode Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {modes.map((m) => {
            const isThisSelected = selected === m.id;
            return (
              <button
                key={m.id}
                data-testid={`mode-card-${m.id}`}
                onClick={() => handleSelect(m.id)}
                disabled={isConnecting}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  m.accent
                } ${
                  isThisSelected
                    ? 'ring-2 ring-sky-400 bg-sky-950/40'
                    : 'hover:bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-display text-base font-black text-white">{m.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/50 border border-white/10 font-bold tabular-nums">
                      {m.interval}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                    {m.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono font-bold">
                  <span>{m.tag}</span>
                  <span className="text-white">LAUNCH &rarr;</span>
                </div>
              </button>
            );
          })}
        </div>

        {isConnecting && (
          <div className="p-3.5 rounded-xl bg-sky-950/60 border border-sky-500/50 text-sky-200 text-xs font-mono flex items-center gap-2.5 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse inline-block" />
            <span>{statusText}</span>
          </div>
        )}

        <div className="text-[11px] text-slate-400 font-mono text-center pt-3 border-t border-slate-800/80">
          Hardware Bound: {licenseSession.deviceId.slice(0, 18)}... · 28 Algorithms &amp; 18 Clusters Armed
        </div>
      </div>
    </div>
  );
};
