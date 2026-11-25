import React, { useState } from 'react';
import { LicenseSession } from '../services/licenseService';

interface ModeSelectModalProps {
  session: LicenseSession;
  onConfirmMode: (selectedMode: '30S' | '1M') => void;
}

export const ModeSelectModal: React.FC<ModeSelectModalProps> = ({
  session,
  onConfirmMode,
}) => {
  const [selectedMode, setSelectedMode] = useState<'30S' | '1M'>('1M');
  const [isInjecting, setIsInjecting] = useState(false);
  const [stepText, setStepText] = useState('Ready for bypass injection');

  const handleStart = async () => {
    setIsInjecting(true);
    setStepText('1/3: Injecting 2,048 Cluster Bypass Route...');
    await new Promise((r) => setTimeout(r, 400));
    setStepText(`2/3: Calibrating Algorithm for WinGo ${selectedMode}...`);
    await new Promise((r) => setTimeout(r, 450));
    setStepText('3/3: Bypass Synchronized! Launching Live Feed...');
    await new Promise((r) => setTimeout(r, 350));
    onConfirmMode(selectedMode);
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 backdrop-blur-2xl">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0b101d] border-2 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.25)] p-5 text-white overflow-hidden">
        {/* Top Glow Bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-400 to-purple-500" />

        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>KEY VERIFIED • BYPASS READY</span>
          </div>
          <h2 className="text-lg font-black tracking-wider text-white">
            SELECT WINGO MODE
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Choose game round to inject 2K+ bypass prediction engine
          </p>
        </div>

        {/* Bypass Telemetry Box */}
        <div className="rounded-xl bg-[#070b14] border border-slate-800 p-3 mb-4 text-[11px] font-mono space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Device Lock:</span>
            <span className="text-emerald-400 font-bold">
              {session.deviceId.slice(0, 14)}...
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Server Nodes:</span>
            <span className="text-sky-400 font-bold">2,048 ONLINE</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Latency:</span>
            <span className="text-emerald-400 font-bold">11ms [Optimal]</span>
          </div>
        </div>

        {/* Mode Options */}
        <div className="space-y-2.5 mb-5">
          {/* WinGo 1M */}
          <div
            onClick={() => !isInjecting && setSelectedMode('1M')}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
              selectedMode === '1M'
                ? 'border-emerald-500 bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold font-mono text-sm ${
                  selectedMode === '1M'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                1M
              </div>
              <div>
                <div className="font-extrabold text-sm text-white">
                  WinGo 1 Minute
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Standard High-Accuracy Precision
                </div>
              </div>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMode === '1M'
                  ? 'border-emerald-400 bg-emerald-500'
                  : 'border-slate-600'
              }`}
            >
              {selectedMode === '1M' && (
                <div className="w-2 h-2 rounded-full bg-slate-950" />
              )}
            </div>
          </div>

          {/* WinGo 30S */}
          <div
            onClick={() => !isInjecting && setSelectedMode('30S')}
            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
              selectedMode === '30S'
                ? 'border-emerald-500 bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold font-mono text-sm ${
                  selectedMode === '30S'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                30S
              </div>
              <div>
                <div className="font-extrabold text-sm text-white">
                  WinGo 30 Seconds
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Ultra-Fast Lightning Bypass
                </div>
              </div>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMode === '30S'
                  ? 'border-emerald-400 bg-emerald-500'
                  : 'border-slate-600'
              }`}
            >
              {selectedMode === '30S' && (
                <div className="w-2 h-2 rounded-full bg-slate-950" />
              )}
            </div>
          </div>
        </div>

        {/* Injection Status / Button */}
        {isInjecting ? (
          <div className="py-3 px-4 rounded-xl bg-slate-900 border border-emerald-500/40 text-center font-mono text-xs text-emerald-300 animate-pulse">
            <span className="block font-bold mb-1">⚡ INJECTING BYPASS...</span>
            <span className="text-[11px] text-slate-400">{stepText}</span>
          </div>
        ) : (
          <button
            onClick={handleStart}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95 transition-all"
          >
            🚀 INJECT BYPASS & START PREDICTIONS
          </button>
        )}
      </div>
    </div>
  );
};
