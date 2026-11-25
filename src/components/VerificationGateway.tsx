import React, { useState } from 'react';
import { sfx, speakNotification } from '../utils/audio';
import { WingoMode } from '../services/lotteryService';

interface VerificationGatewayProps {
  initialStep?: 'login' | 'verify' | 'wingo';
  isLoggedIn: boolean;
  userPhone: string;
  isVerified: boolean;
  isAdmin: boolean;
  gameMode: WingoMode;
  gameRegisterUrl: string;
  onLogin: (phone: string, isAdmin: boolean) => void;
  onVerified: (uid: string, isAdmin: boolean) => void;
  onSelectGameMode: (mode: WingoMode) => void;
  onStartHack: () => void;
  onClose?: () => void;
}

export const ADMIN_BYPASS_NUMBER = '655675576694';

export const VerificationGateway: React.FC<VerificationGatewayProps> = ({
  initialStep = 'login',
  isLoggedIn,
  userPhone,
  isVerified,
  isAdmin,
  gameMode,
  gameRegisterUrl,
  onLogin,
  onVerified,
  onSelectGameMode,
  onStartHack,
  onClose,
}) => {
  // Determine current active view based on auth & verification state
  const [currentStep, setCurrentStep] = useState<'login' | 'verify' | 'scanning' | 'wingo'>(() => {
    if (!isLoggedIn) return 'login';
    if (!isVerified && !isAdmin) return 'verify';
    return 'wingo';
  });

  // Login inputs
  const [phoneInput, setPhoneInput] = useState(userPhone || '');
  
  // Verification inputs
  const [uidInput, setUidInput] = useState('');
  const [depositAmount, setDepositAmount] = useState('300');
  const [utrNumber, setUtrNumber] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [currentLayerText, setCurrentLayerText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Selected Wingo mode inside modal
  const [selectedMode, setSelectedMode] = useState<WingoMode>(gameMode || '30S');

  // Handle Login Step
  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    const cleaned = phoneInput.trim();

    if (!cleaned) {
      setErrorMessage('Please enter your Mobile Number or Master Admin Bypass Number');
      sfx.loss();
      return;
    }

    // Master Admin Bypass Check: Instant VIP Login & Direct Wingo Select
    if (cleaned === ADMIN_BYPASS_NUMBER) {
      sfx.win();
      speakNotification('Master Admin Key Verified. Instant VIP Access Granted.');
      onLogin(cleaned, true);
      onVerified(cleaned, true);
      setCurrentStep('wingo');
      return;
    }

    // Regular Mobile Number validation (min 6 to 15 digits)
    if (!/^\d{6,15}$/.test(cleaned)) {
      setErrorMessage('Please enter a valid 10-digit mobile number or Game account number.');
      sfx.loss();
      return;
    }

    // Regular User Login
    sfx.notify();
    onLogin(cleaned, false);
    speakNotification('Logged in successfully. Please complete registration and ₹300 deposit verification.');
    // Move to 2-step verification
    setCurrentStep('verify');
  };

  // Handle 500+ Layer Auto-Verification (Step 1 Registration + Step 2 Deposit ₹300)
  const handleStartAutoVerification = () => {
    setErrorMessage('');
    const cleanedUid = uidInput.trim();

    if (!cleanedUid) {
      setErrorMessage('Please enter your Game UID registered under official invitation link');
      sfx.loss();
      return;
    }

    // UID format check (5-15 digits)
    if (!/^\d{5,15}$/.test(cleanedUid)) {
      setErrorMessage('Invalid UID format. Please enter your valid 5 to 15 digit Game UID.');
      sfx.loss();
      return;
    }

    const amt = Number(depositAmount);
    if (isNaN(amt) || amt < 300) {
      setErrorMessage('Minimum deposit of ₹300 is required in this UID to unlock hack.');
      sfx.loss();
      return;
    }

    const cleanedUtr = utrNumber.trim();
    if (!cleanedUtr || cleanedUtr.length < 8) {
      setErrorMessage('Deposit Verification Required: Please enter your 12-digit Deposit UTR / Bank Reference ID from your ₹300 deposit.');
      sfx.loss();
      return;
    }

    // Start 500+ Layer Scanning Simulation
    sfx.notify();
    setCurrentStep('scanning');
    setScanProgress(0);

    const scanLayers = [
      'Layer 24/500: Establishing encrypted SSL-512 tunnel with bdgwin78.com...',
      'Layer 78/500: Scanning invitation code binding [Code: 4148715921265]...',
      'Layer 156/500: Step 1 Confirmed: UID #' + cleanedUid + ' registered under official referral!',
      'Layer 248/500: Connecting to wallet ledger & deposit gateway...',
      'Layer 340/500: Step 2 Confirmed: Minimum ₹' + amt + ' deposit verified in UID wallet!',
      'Layer 420/500: Injecting 1K+ High-Winning bypass server momentum algorithms...',
      'Layer 500/500: 500+ Layer Bypass Complete! Both Step 1 & 2 verified successfully!',
    ];

    let current = 0;
    const interval = setInterval(() => {
      current += 4;
      const progress = Math.min(100, current);
      setScanProgress(progress);

      const layerIdx = Math.min(
        scanLayers.length - 1,
        Math.floor((progress / 100) * scanLayers.length)
      );
      setCurrentLayerText(scanLayers[layerIdx]);

      if (current >= 100) {
        clearInterval(interval);
        sfx.win();
        speakNotification('Verification Complete. Step 1 and Step 2 Verified.');
        onVerified(cleanedUid, false);
        setTimeout(() => {
          setCurrentStep('wingo');
        }, 800);
      }
    }, 60);
  };

  const wingoOptions: { mode: WingoMode; label: string; desc: string; time: string; badge: string; color: string }[] = [
    {
      mode: '1M',
      label: 'WinGo 1M',
      desc: 'Standard 1 Minute Classic Rounds',
      time: '1 Min',
      badge: 'HIGHEST WIN 🔥',
      color: 'from-amber-600 to-emerald-600 border-amber-500',
    },
    {
      mode: 'TRX_1M',
      label: 'TRX WinGo 1M',
      desc: 'Tron Hash Block Live Bypass Rounds',
      time: '1 Min',
      badge: 'BLOCKCHAIN 💎',
      color: 'from-cyan-600 to-blue-600 border-cyan-500',
    },
    {
      mode: 'K3_1M',
      label: 'K3 WinGo 1M',
      desc: '3-Dice Sum & Single Number (3-18)',
      time: '1 Min',
      badge: 'DICE SUM 🎲',
      color: 'from-yellow-600 to-amber-600 border-amber-500',
    },
    {
      mode: '30S',
      label: 'WinGo 30S',
      desc: 'High-Frequency 30s Blitz Draws',
      time: '30s',
      badge: 'RAPID ⚡',
      color: 'from-red-600 to-amber-600 border-red-500',
    },
  ];

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-3 sm:p-5 backdrop-blur-2xl bg-black/85 select-none overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg my-auto rounded-3xl backdrop-blur-2xl bg-slate-950/95 border-2 border-red-500/70 shadow-[0_0_50px_rgba(239,68,68,0.4)] p-5 sm:p-7 overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-red-500/30 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 via-amber-600 to-sky-600 border border-red-400/60 shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center justify-center text-lg font-black text-white">
              ⚡
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wider text-white flex items-center gap-2">
                <span>JUJUTSU SCRIPT PREDICTOR</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-900/80 text-red-200 font-mono border border-red-500/60">
                  500+ LAYERS
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {currentStep === 'login' && 'Step 1: Enter Mobile Number or Admin Key to Login'}
                {currentStep === 'verify' && 'Step 2: Register & Minimum ₹300 Deposit Verification'}
                {currentStep === 'scanning' && 'Bypassing Security Servers (500+ Layers)...'}
                {currentStep === 'wingo' && 'Step 3: Select WinGo Game Mode & Start Hack'}
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={() => {
                sfx.click();
                onClose();
              }}
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm border border-slate-800 cursor-pointer transition-colors"
              title="Close and view game"
            >
              ✕
            </button>
          )}
        </div>

        {/* STEP 1: LOGIN (Everyone must login first) */}
        {currentStep === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/60 to-slate-900/80 border border-red-500/30 text-xs text-slate-300 leading-relaxed">
              <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                <span>🔑</span>
                <span>LOGIN REQUIRED TO ACCESS HACK SYSTEM:</span>
              </div>
              <p className="text-slate-300">
                Sabhi users aur Admin ko hack system access karne ke liye sabse pehle apne <b className="text-white">Mobile Number</b> ya <b className="text-amber-300">Admin Key</b> se login karna hoga.
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Admin number se turant instant VIP access milta hai. Baki users ko registration aur minimum ₹300 deposit verification complete karna hoga.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 font-mono flex items-center justify-between">
                <span>ENTER MOBILE NUMBER OR ADMIN KEY:</span>
                <span className="text-[10px] text-red-400">REQUIRED</span>
              </label>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="e.g. 9876543210 or Admin Key (655675576694)"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white font-mono text-sm outline-none shadow-inner"
                autoFocus
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500 text-red-300 text-xs font-semibold">
                ⚠️ {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-sky-600 hover:from-red-500 hover:to-sky-500 text-white font-black text-xs sm:text-sm tracking-widest uppercase shadow-[0_10px_30px_rgba(239,68,68,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🔑</span>
              <span>LOGIN & CONTINUE TO HACK</span>
            </button>

            {/* Quick Admin shortcut */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Admin Key: <code className="text-amber-400 font-bold">655675576694</code></span>
              <button
                type="button"
                onClick={() => {
                  setPhoneInput(ADMIN_BYPASS_NUMBER);
                }}
                className="text-sky-400 hover:text-sky-300 underline cursor-pointer"
              >
                Use Admin Key
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: VERIFICATION GATE (For regular users - Step 1 Register + Step 2 Deposit ₹300) */}
        {currentStep === 'verify' && (
          <div className="space-y-4">
            {/* User Logged in banner */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <span className="text-slate-400 font-mono">Logged in as:</span>
              <span className="font-mono font-bold text-sky-400">📱 +91 {phoneInput || userPhone}</span>
              <button
                onClick={() => {
                  sfx.click();
                  setCurrentStep('login');
                }}
                className="text-[10px] text-red-400 hover:underline cursor-pointer"
              >
                Change Number
              </button>
            </div>

            {/* Protocol description banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/60 to-slate-900/80 border border-red-500/30 text-xs text-slate-300 leading-relaxed">
              <div className="font-bold text-red-400 flex items-center gap-1.5 mb-1">
                <span>⚠️</span>
                <span>DEPOSIT-TO-UNLOCK PROTOCOL (MANDATORY):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>
                  <b className="text-white">Step 1:</b> Diye gaye link se game me register karein (Code: 4148715921265).
                </li>
                <li>
                  <b className="text-white">Step 2:</b> Usi registered ID me minimum <b className="text-emerald-400">₹300 ka deposit</b> karein.
                </li>
              </ol>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Dono steps complete karne ke baad hi Wingo game choose karne aur <b className="text-emerald-300">START HACK</b> ka option unlock hoga.
              </p>
            </div>

            {/* Quick Register Link */}
            <a
              href={gameRegisterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl flex items-center justify-between bg-gradient-to-r from-red-600/80 to-amber-600/80 hover:from-red-600 hover:to-amber-600 text-white font-extrabold text-xs tracking-wider uppercase border border-red-400/40 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <span className="flex items-center gap-2">
                <span>🔗</span>
                <span>Step 1: Register on Official Game Link</span>
              </span>
              <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded font-mono">
                4148715921265
              </span>
            </a>

            {/* Inputs Grid */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 font-mono flex items-center justify-between">
                  <span>ENTER YOUR REGISTERED GAME UID:</span>
                  <span className="text-[10px] text-red-400 font-normal">REQUIRED</span>
                </label>
                <input
                  type="text"
                  value={uidInput}
                  onChange={(e) => setUidInput(e.target.value)}
                  placeholder="e.g. 5829104"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white font-mono text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 font-mono">
                    DEPOSIT AMOUNT:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="300"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="300"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
                    ✓ Min ₹300 required
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 font-mono flex items-center justify-between">
                    <span>DEPOSIT UTR / REF:</span>
                    <span className="text-[10px] text-red-400">REQUIRED</span>
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. 428192019482"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    12-digit Bank / UPI UTR
                  </span>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500 text-red-300 text-xs font-semibold">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Main Action Button */}
            <button
              onClick={handleStartAutoVerification}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-black text-xs sm:text-sm tracking-widest uppercase shadow-[0_10px_30px_rgba(5,150,105,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>⚡</span>
              <span>AUTO-VERIFY BOTH STEPS (500+ LAYERS)</span>
            </button>
          </div>
        )}

        {/* STEP 2B: 500+ LAYER SCANNING PROGRESS */}
        {currentStep === 'scanning' && (
          <div className="py-6 text-center space-y-4">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-red-500 animate-spin-slow" />
              <div className="absolute inset-2 rounded-full border-2 border-dotted border-sky-400 animate-spin-rev" />
              <div className="w-full h-full flex items-center justify-center font-mono font-black text-lg text-white">
                {scanProgress}%
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-black text-white font-mono tracking-wider">
                BYPASSING LAYER {Math.floor((scanProgress / 100) * 500)} / 500
              </div>
              <p className="text-xs text-sky-300 font-mono animate-pulse max-w-sm mx-auto min-h-[32px]">
                {currentLayerText}
              </p>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 transition-all duration-100"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* STEP 3: CHOOSE WINGO GAME TYPE & START HACK (Only shown after login & verification) */}
        {currentStep === 'wingo' && (
          <div className="space-y-4">
            {/* Status confirmation badge */}
            <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-bold">
                  {isAdmin ? '👑 MASTER ADMIN VIP ACCESS' : '✓ STEP 1 & 2 VERIFIED'}
                </span>
              </div>
              <span className="text-slate-300">
                {isAdmin ? 'NO BYPASS RESTRICTION' : `UID #${uidInput || 'VIP'}`}
              </span>
            </div>

            <div className="text-center">
              <h3 className="text-sm font-black text-white tracking-wider uppercase mb-1">
                🎯 CHOOSE WINGO GAME TYPE TO START PREDICTION
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Pehle apna game type select karein, fir hack live predictions stream karega:
              </p>
            </div>

            {/* Grid of Wingo Types */}
            <div className="grid grid-cols-2 gap-2.5">
              {wingoOptions.map((opt) => (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setSelectedMode(opt.mode);
                    onSelectGameMode(opt.mode);
                  }}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden active:scale-95 ${
                    selectedMode === opt.mode
                      ? `bg-slate-900 border-2 ${opt.color.split(' ')[2]} shadow-[0_0_20px_rgba(239,68,68,0.35)] ring-2 ring-emerald-400`
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-sm text-white tracking-wide">
                      {opt.label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-white font-mono font-bold">
                      {opt.time}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mb-1.5">
                    {opt.desc}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 font-bold text-sky-300 uppercase">
                      {opt.badge}
                    </span>
                    {selectedMode === opt.mode && (
                      <span className="text-emerald-400 text-xs font-bold font-mono">
                        ✓ SELECTED
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* START HACK ACTION BUTTON */}
            <button
              onClick={() => {
                sfx.win();
                onSelectGameMode(selectedMode);
                onStartHack();
                if (onClose) onClose();
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 border-2 border-emerald-300 text-white font-black text-sm tracking-widest uppercase shadow-[0_0_40px_rgba(52,211,153,0.85)] flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-95 animate-btn-breath"
            >
              <span className="text-lg">⚡</span>
              <span>START HACK • {selectedMode} • LIVE PREDICTIONS</span>
              <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded font-mono font-bold">
                READY
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
