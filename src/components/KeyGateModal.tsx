import React, { useState, useEffect } from 'react';
import { BrandLogo } from './BrandLogo';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';
import { verifyLicenseKey, LicenseSession } from '../services/licenseService';
import { sfx } from '../utils/audio';

interface KeyGateModalProps {
  onUnlocked: (session: LicenseSession) => void;
  initialError?: string;
}

export const KeyGateModal: React.FC<KeyGateModalProps> = ({
  onUnlocked,
  initialError,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<{
    deviceId: string;
    shortId: string;
    deviceLabel: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>(initialError || '');
  const [copiedHw, setCopiedHw] = useState(false);

  useEffect(() => {
    getDeviceFingerprint().then((info) => {
      setDeviceInfo(info);
    });
  }, []);

  const handleCopyHwId = () => {
    if (!deviceInfo) return;
    navigator.clipboard.writeText(deviceInfo.deviceId);
    setCopiedHw(true);
    sfx.click();
    setTimeout(() => setCopiedHw(false), 2000);
  };

  const handleAuthenticate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = keyInput.trim();
    if (!clean) {
      setErrorMsg('Please paste or enter your encrypted license key.');
      sfx.error();
      return;
    }

    setErrorMsg('');
    setIsLoading(true);
    sfx.click();

    setStatusStep('1/3 Decrypting license signature...');
    await new Promise((r) => setTimeout(r, 260));

    setStatusStep('2/3 Mounting 1,099+ round historical backtest engine...');
    await new Promise((r) => setTimeout(r, 260));

    setStatusStep('3/3 Binding hardware device fingerprint...');
    await new Promise((r) => setTimeout(r, 240));

    const result = await verifyLicenseKey(clean);

    if (result.valid && result.session) {
      setStatusStep('ACCESS GRANTED · Launching KHELV GAME PENEL...');
      sfx.win();
      setTimeout(() => {
        onUnlocked(result.session!);
      }, 320);
    } else {
      setIsLoading(false);
      setStatusStep('');
      setErrorMsg(result.message || 'Key verification failed. Access denied.');
      sfx.error();
    }
  };

  return (
    <div
      data-testid="key-gate-modal"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-[#040711] overflow-y-auto animate-fade-up"
    >
      {/* Subtle architectural gradient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 75% 55% at 50% 0%, rgba(14,165,233,0.18), transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-lg my-auto rounded-3xl bg-[#090e1d]/95 border border-sky-500/35 shadow-[0_24px_80px_rgba(0,0,0,0.85)] p-5 sm:p-7 text-slate-100 overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-400" />

        {/* Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-800/90 pb-4 mb-5">
          <BrandLogo
            alt="KHELV GAME PENEL"
            className="w-14 h-14 rounded-2xl border border-sky-400/60 shadow-[0_0_20px_rgba(56,189,248,0.3)]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-lg sm:text-xl font-black tracking-wider text-white">
                KHELV GAME PENEL
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                UNLIMITED PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              1,099+ History Backtest · 28 Algos · Unlimited Continuous Wins
            </p>
          </div>
        </div>

        {/* Hardware Device ID */}
        <div className="rounded-2xl bg-[#050814] border border-slate-800/90 p-3.5 mb-5">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              Device Hardware ID
            </span>
            <button
              onClick={handleCopyHwId}
              type="button"
              className="text-[11px] text-sky-400 hover:text-sky-300 font-mono font-semibold cursor-pointer px-2 py-0.5 rounded bg-sky-950/50 border border-sky-500/30"
            >
              {copiedHw ? 'Copied' : 'Copy ID'}
            </button>
          </div>
          <div className="font-mono text-sm sm:text-base font-bold text-emerald-400 tracking-wider tabular-nums break-all">
            {deviceInfo ? deviceInfo.deviceId : 'Scanning hardware...'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {deviceInfo?.deviceLabel || 'Terminal'} · Single-device hardware binding
          </div>
        </div>

        {/* License Key Form */}
        <form onSubmit={handleAuthenticate} className="space-y-4">
          <div>
            <label
              htmlFor="license-key-input"
              className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Encrypted License Key
            </label>
            <input
              id="license-key-input"
              data-testid="license-key-input"
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter License Key (e.g. KHELVPENEL-VIP-...)"
              disabled={isLoading}
              className="w-full min-h-[46px] bg-[#050814] border border-sky-500/40 focus:border-sky-400 focus:outline-none rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-500 transition-colors uppercase tracking-wider"
            />
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-mono leading-relaxed">
              <div className="font-bold text-red-300 mb-0.5">Authentication Rejected</div>
              <div>{errorMsg}</div>
            </div>
          )}

          {isLoading && (
            <div className="p-3.5 rounded-xl bg-sky-950/55 border border-sky-500/40 text-sky-200 text-xs font-mono">
              {statusStep}
            </div>
          )}

          <button
            type="submit"
            data-testid="unlock-panel-btn"
            disabled={isLoading}
            className="w-full min-h-[48px] py-3.5 rounded-xl bg-gradient-to-r from-sky-600 via-sky-500 to-emerald-500 hover:from-sky-500 hover:to-emerald-400 text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-[0_10px_30px_rgba(14,165,233,0.35)] transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Verifying Access...' : 'Unlock KHELV GAME PENEL'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2.5 text-[11px] text-slate-300">
          <div className="p-2.5 rounded-xl bg-[#050814] border border-slate-800/80">
            <span className="text-emerald-400 font-bold block mb-0.5">Unlimited Win Engine</span>
            Continuous signals with zero 10-win cap lockouts.
          </div>
          <div className="p-2.5 rounded-xl bg-[#050814] border border-slate-800/80">
            <span className="text-sky-400 font-bold block mb-0.5">4s Quantum Decoder</span>
            Pre-signal backtest verification before every call.
          </div>
        </div>
      </div>
    </div>
  );
};
