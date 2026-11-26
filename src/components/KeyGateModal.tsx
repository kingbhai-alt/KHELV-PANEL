import React, { useState, useEffect } from 'react';
import { BrandLogo } from './BrandLogo';
import { ThemeSwitcher } from './ThemeSwitcher';
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
      setErrorMsg('Please paste or type your encrypted license key.');
      sfx.error();
      return;
    }

    setErrorMsg('');
    setIsLoading(true);
    sfx.click();

    setStatusStep('1/3: Decrypting License Key Signature...');
    await new Promise((r) => setTimeout(r, 380));

    setStatusStep('2/3: Loading 500+ Round Historical Backtest Engine...');
    await new Promise((r) => setTimeout(r, 380));

    setStatusStep('3/3: Verifying Hardware Fingerprint & Device Binding...');
    await new Promise((r) => setTimeout(r, 340));

    const result = await verifyLicenseKey(clean);

    if (result.valid && result.session) {
      setStatusStep('ACCESS GRANTED • Initializing KHELV PENEL...');
      sfx.win();
      setTimeout(() => {
        onUnlocked(result.session!);
      }, 450);
    } else {
      setIsLoading(false);
      setStatusStep('');
      setErrorMsg(result.message || 'Key verification failed. Access denied.');
      sfx.error();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-[var(--kp-bg)]/95 backdrop-blur-2xl overflow-y-auto transition-colors duration-200">
      {/* Subtle Ambient Theme Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 80% at 50% -20%, var(--kp-glow), transparent)',
        }}
      />

      <div className="relative w-full max-w-lg my-auto rounded-3xl backdrop-blur-3xl bg-[var(--kp-card)] border border-[var(--kp-border)] shadow-2xl p-5 sm:p-7 text-[var(--kp-text)] overflow-hidden transition-colors duration-200">
        <div
          className="absolute top-0 inset-x-0 h-1"
          style={{
            background: 'linear-gradient(90deg, var(--kp-accent-2), var(--kp-accent), var(--kp-accent-2))',
          }}
        />

        {/* Header with KHELV PENEL Logo & Theme Switcher */}
        <div className="flex items-start justify-between gap-2.5 border-b border-[var(--kp-border)] pb-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo
              alt="KHELV PENEL Logo"
              className="w-13 h-13 rounded-2xl border border-[var(--kp-accent)]/60 shadow-md shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-wider text-[var(--kp-text)] truncate">
                  KHELV PENEL
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--kp-surface)] text-[var(--kp-accent-text)] font-mono font-bold border border-[var(--kp-border)] shrink-0">
                  VIP PRO
                </span>
              </div>
              <p className="text-xs text-[var(--kp-muted)] mt-0.5">
                500+ History Backtest · 3-Level Fix-Win · 10-Win Lock
              </p>
            </div>
          </div>

          <ThemeSwitcher compact />
        </div>

        {/* Hardware Device Fingerprint Box */}
        <div className="rounded-2xl bg-[var(--kp-surface)] border border-[var(--kp-border)] p-3.5 mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--kp-muted)] font-mono text-[11px] uppercase tracking-wider">
              Device Hardware ID
            </span>
            <button
              onClick={handleCopyHwId}
              type="button"
              className="text-[11px] text-[var(--kp-accent-text)] hover:opacity-80 font-mono underline cursor-pointer"
            >
              {copiedHw ? 'Copied' : 'Copy Device ID'}
            </button>
          </div>
          <div className="font-mono text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tracking-wider tabular-nums">
            {deviceInfo ? deviceInfo.deviceId : 'Scanning hardware...'}
          </div>
          <div className="text-[10px] text-[var(--kp-muted)] font-mono mt-1">
            {deviceInfo?.deviceLabel || 'Terminal'} · Locks automatically upon key activation
          </div>
        </div>

        {/* License Key Form */}
        <form onSubmit={handleAuthenticate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--kp-text)] uppercase tracking-wider mb-1.5">
              Encrypted License Key
            </label>
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="KHELV-PENEL-VIP-7D-XXXXXXXX-XXXX..."
              disabled={isLoading}
              className="w-full bg-[var(--kp-surface)] border border-[var(--kp-border)] focus:border-[var(--kp-accent)] focus:outline-none rounded-xl px-4 py-3 text-sm font-mono text-[var(--kp-text)] placeholder:text-[var(--kp-muted)]/60 transition-all uppercase tracking-wider"
            />
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-400 dark:border-red-500/60 text-red-700 dark:text-red-200 text-xs font-mono leading-relaxed">
              <div className="font-bold text-red-600 dark:text-red-400 mb-0.5">Authentication Rejected</div>
              <div>{errorMsg}</div>
            </div>
          )}

          {isLoading && (
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-400/60 text-sky-800 dark:text-sky-200 text-xs font-mono">
              {statusStep}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 hover:from-blue-500 hover:via-sky-400 hover:to-blue-500 text-white font-black text-sm uppercase tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Verifying License...' : 'Unlock KHELV PENEL'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[var(--kp-border)] grid grid-cols-2 gap-2.5 text-[11px] text-[var(--kp-muted)]">
          <div className="p-2.5 rounded-xl bg-[var(--kp-surface)] border border-[var(--kp-border)]">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold block mb-0.5">1-Device Lock</span>
            Key binds strictly to this device upon first use.
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--kp-surface)] border border-[var(--kp-border)]">
            <span className="text-[var(--kp-accent-text)] font-bold block mb-0.5">500+ Round Backtest</span>
            Backtests all strategies before every prediction.
          </div>
        </div>
      </div>
    </div>
  );
};
