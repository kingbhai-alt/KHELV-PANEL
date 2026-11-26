import React, { useState, useEffect } from 'react';
import { BrandLogo } from './BrandLogo';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';
import { verifyLicenseKey, LicenseSession } from '../services/licenseService';
import { useAuth } from '../context/AuthContext';
import { sfx } from '../utils/audio';

interface KeyGateModalProps {
  onUnlocked: (session: LicenseSession) => void;
  initialError?: string;
}

export const KeyGateModal: React.FC<KeyGateModalProps> = ({
  onUnlocked,
  initialError,
}) => {
  const { user, idToken, authError, signInWithGoogle, signOutGoogle } = useAuth();
  const [keyInput, setKeyInput] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<{
    deviceId: string;
    shortId: string;
    deviceLabel: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
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

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    sfx.click();
    await signInWithGoogle();
    setIsSigningIn(false);
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
      const enrichedSession: LicenseSession = {
        ...result.session,
        authToken: idToken || result.session.authToken,
      };
      setStatusStep('ACCESS GRANTED • Initializing KHELV PENEL...');
      sfx.win();
      setTimeout(() => {
        onUnlocked(enrichedSession);
      }, 450);
    } else {
      setIsLoading(false);
      setStatusStep('');
      setErrorMsg(result.message || 'Key verification failed. Access denied.');
      sfx.error();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/95 backdrop-blur-2xl overflow-y-auto">
      {/* Subtle Blue Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.22),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg my-auto rounded-3xl backdrop-blur-3xl bg-slate-900/95 border border-sky-500/40 shadow-[0_0_60px_rgba(14,165,233,0.25)] p-5 sm:p-7 text-slate-100 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600" />

        {/* Clean Header with KHELV PENEL Logo */}
        <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4 mb-4">
          <BrandLogo
            alt="KHELV PENEL Logo"
            className="w-14 h-14 rounded-2xl border border-sky-500/60 shadow-[0_0_20px_rgba(14,165,233,0.45)]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-wider text-white truncate">
                KHELV PENEL
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-mono font-bold border border-sky-500/40 shrink-0">
                VIP PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              500+ History Backtest · 3-Level Fix-Win Engine · 10-Win Target Lock
            </p>
          </div>
        </div>

        {/* Google Account Sign-In Card */}
        <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3.5 mb-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Account Profile
              </div>
              <div className="text-xs text-slate-400 truncate mt-0.5">
                {user ? (
                  <span className="text-emerald-400 font-medium">{user.email || user.displayName}</span>
                ) : (
                  'Sign in with Google to save your prediction history across sessions'
                )}
              </div>
            </div>
            {user ? (
              <button
                type="button"
                onClick={signOutGoogle}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer shrink-0 transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold shadow-sm cursor-pointer shrink-0 flex items-center gap-2 transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
          {authError && (
            <div className="mt-2 text-[11px] text-amber-300 font-mono">
              {authError}
            </div>
          )}
        </div>

        {/* Hardware Device Fingerprint Box */}
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-3.5 mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              Device Hardware ID
            </span>
            <button
              onClick={handleCopyHwId}
              type="button"
              className="text-[11px] text-sky-400 hover:text-sky-300 font-mono underline cursor-pointer"
            >
              {copiedHw ? 'Copied' : 'Copy Device ID'}
            </button>
          </div>
          <div className="font-mono text-sm sm:text-base font-bold text-emerald-400 tracking-wider tabular-nums">
            {deviceInfo ? deviceInfo.deviceId : 'Scanning hardware...'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {deviceInfo?.deviceLabel || 'Terminal'} · Locks automatically upon key activation
          </div>
        </div>

        {/* License Key Form */}
        <form onSubmit={handleAuthenticate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Encrypted License Key
            </label>
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="JUJUTSU-VIP-7D-XXXXXXXX-XXXX..."
              disabled={isLoading}
              className="w-full bg-slate-950/80 border border-sky-500/40 focus:border-sky-400 focus:outline-none rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-600 transition-all uppercase tracking-wider"
            />
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-mono leading-relaxed">
              <div className="font-bold text-red-400 mb-0.5">Authentication Rejected</div>
              <div>{errorMsg}</div>
            </div>
          )}

          {isLoading && (
            <div className="p-3.5 rounded-xl bg-sky-950/60 border border-sky-500/40 text-sky-200 text-xs font-mono">
              {statusStep}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 hover:from-blue-500 hover:via-sky-400 hover:to-blue-500 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(14,165,233,0.45)] transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Verifying License...' : 'Unlock KHELV PENEL'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 gap-2.5 text-[11px] text-slate-400">
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <span className="text-emerald-400 font-bold block mb-0.5">1-Device Lock</span>
            Key binds strictly to this device upon first use.
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <span className="text-sky-400 font-bold block mb-0.5">500+ Round Backtest</span>
            Backtests all strategies before every prediction.
          </div>
        </div>
      </div>
    </div>
  );
};
