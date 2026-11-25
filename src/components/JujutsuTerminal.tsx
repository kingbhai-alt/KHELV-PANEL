import React, { useState, useEffect, useRef } from 'react';
import {
  LotteryStats,
  HistoryLogRow,
  LastResultInfo,
  WinGoMode,
  DrawItem,
  isK3Game,
  isTrxGame,
} from '../services/lotteryService';
import { LicenseSession, formatRemainingTime } from '../services/licenseService';
import { PatternAnalysisPanel } from './PatternAnalysisPanel';
import { ClusterVote, UserCalculationDetail } from '../logic/jujutsuEngine';
import { BacktestSummary } from '../logic/backtestEngine';
import { BrandLogo } from './BrandLogo';
import { ThemeSwitcher } from './ThemeSwitcher';

interface JujutsuTerminalProps {
  stats: LotteryStats;
  currentPrediction: {
    period: string;
    prediction: 'BIG' | 'SMALL' | '---';
    predictedDigit?: number;
    singleJackpotDigit?: number;
    singleJackpotConfidence?: number;
    predictedNumbers?: [number, number];
    confidence: number;
    rule?: string;
  };
  lastResult: LastResultInfo;
  history: HistoryLogRow[];
  drawItems?: DrawItem[];
  clusterVotes?: ClusterVote[];
  consensusRate?: number;
  userCalcDetail?: UserCalculationDetail;
  backtestSummary?: BacktestSummary;
  gameMode: WinGoMode;
  onSwitchMode: (mode: WinGoMode) => void;
  isApiLive: boolean;
  licenseSession: LicenseSession | null;
  onLogoutKey: () => void;
  remainingSeconds: number;
  totalRoundSeconds: number;
  onResetStats?: () => void;
  onResetTargetRun?: () => void;
  isTargetLocked?: boolean;
}

export const JujutsuTerminal: React.FC<JujutsuTerminalProps> = ({
  stats,
  currentPrediction,
  history,
  drawItems = [],
  clusterVotes = [],
  consensusRate = 95,
  userCalcDetail,
  backtestSummary,
  gameMode,
  onSwitchMode,
  licenseSession,
  onLogoutKey,
  remainingSeconds,
  onResetStats,
  onResetTargetRun,
  isTargetLocked = false,
}) => {
  const [activeTab, setActiveTab] = useState<'hack' | 'pattern' | 'my'>('hack');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [remainingTimeStr, setRemainingTimeStr] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'WIN' | 'JACKPOT' | 'LOSS'>('ALL');
  const historyContainerRef = useRef<HTMLDivElement>(null);

  // Expiry countdown calculation
  useEffect(() => {
    if (licenseSession && licenseSession.expiresAt) {
      setRemainingTimeStr(formatRemainingTime(licenseSession.expiresAt));
      const interval = setInterval(() => {
        setRemainingTimeStr(formatRemainingTime(licenseSession.expiresAt));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [licenseSession]);

  // Format countdown mm:ss
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Single Number Jackpot (#1 exact single number prediction for 9x payout)
  const singleDigit =
    currentPrediction.singleJackpotDigit !== undefined
      ? currentPrediction.singleJackpotDigit
      : currentPrediction.predictedDigit !== undefined
      ? currentPrediction.predictedDigit
      : currentPrediction.prediction === 'BIG'
      ? 7
      : 2;

  const isK3 = isK3Game(gameMode);
  const isTrx = isTrxGame(gameMode);
  const formatModeTitle = (m: WinGoMode) => {
    if (m === 'TRX_1M') return 'TRX WinGo 1M';
    if (m === 'K3_1M') return 'K3 WinGo 1M';
    if (m === '30S') return 'WinGo 30S';
    return 'WinGo 1M';
  };

  const availableModes: WinGoMode[] = ['1M', 'TRX_1M', 'K3_1M', '30S'];

  // Filtered History
  const filteredHistory = history.filter((row) => {
    if (historyFilter === 'WIN') return row.outcome === 'WIN' || row.outcome === 'JACKPOT';
    if (historyFilter === 'JACKPOT') return row.outcome === 'JACKPOT';
    if (historyFilter === 'LOSS') return row.outcome === 'LOSS';
    return true;
  });

  const targetProgress = Math.min(10, Math.max(0, stats.targetWins || 0));
  const isLocked = isTargetLocked || targetProgress >= 10;

  return (
    <div className="w-full max-w-md mx-auto h-[100dvh] flex flex-col justify-between text-[var(--kp-text)] select-none overflow-hidden bg-[var(--kp-bg)] transition-colors duration-200">
      {/* =========================================================================
          VIEW TAB: HACK / PREDICT
         ========================================================================= */}
      {activeTab === 'hack' && (
        <div className="flex-1 flex flex-col p-2.5 pb-13 overflow-hidden min-h-0">
          {/* Top Control Bar: Mode Switcher | KHELV PENEL | Theme & Key */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--kp-muted)] px-1 mb-1 shrink-0 gap-1">
            {/* Mode selector */}
            <div className="relative">
              <button
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="text-[var(--kp-text)] font-bold flex items-center gap-1 cursor-pointer bg-[var(--kp-surface)] px-2 py-0.5 rounded-lg border border-[var(--kp-border)] hover:border-[var(--kp-accent)]"
              >
                <span className="text-amber-600 dark:text-amber-400">{formatModeTitle(gameMode)}</span>
                <span className="text-[10px] text-[var(--kp-muted)]">▼</span>
              </button>

              {showModeDropdown && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--kp-card)] border border-amber-500/50 rounded-xl p-1 shadow-2xl min-w-[140px] space-y-1 backdrop-blur-xl">
                  {availableModes.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        onSwitchMode(m);
                        setShowModeDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                        gameMode === m
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40'
                          : 'text-[var(--kp-text)] hover:bg-[var(--kp-surface)]'
                      }`}
                    >
                      {formatModeTitle(m)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Panel Title: KHELV PENEL with Brand Logo */}
            <div className="flex items-center gap-1.5 min-w-0">
              <BrandLogo
                alt="KHELV PENEL"
                className="w-5 h-5 rounded-md border border-[var(--kp-accent)]/60 shadow-sm shrink-0"
              />
              <span className="font-black tracking-widest text-xs text-[var(--kp-accent-text)] truncate">
                KHELV PENEL
              </span>
            </div>

            {/* Theme Quick Switcher & Key Info */}
            <div className="flex items-center gap-1 shrink-0">
              <ThemeSwitcher compact />
              <button
                onClick={() => setShowKeyModal(!showKeyModal)}
                title="License Key Details"
                className="text-[10px] text-[var(--kp-accent-text)] font-mono px-1.5 py-1 rounded-lg bg-[var(--kp-surface)] border border-[var(--kp-border)] hover:border-[var(--kp-accent)] cursor-pointer flex items-center gap-0.5"
              >
                <span className="hidden xs:inline">{remainingTimeStr || 'VIP'}</span>
                <span>🔒</span>
              </button>
            </div>
          </div>

          {/* Key Quick Info Dropdown if opened */}
          {showKeyModal && (
            <div className="mb-2 p-2.5 rounded-xl bg-[var(--kp-card)] border border-[var(--kp-border)] text-xs font-mono flex items-center justify-between shrink-0 shadow-xl">
              <div>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">AJAY HARDWARE LOCK: </span>
                <span className="text-[var(--kp-text)]">{licenseSession?.deviceId?.slice(0, 12)}...</span>
                <div className="text-[10px] text-[var(--kp-muted)]">Validity: {remainingTimeStr}</div>
              </div>
              <button
                onClick={onLogoutKey}
                className="px-2.5 py-1 bg-red-50 dark:bg-red-950/80 hover:bg-red-100 dark:hover:bg-red-900 border border-red-400 dark:border-red-500/40 text-red-700 dark:text-red-300 text-[10px] rounded-lg cursor-pointer transition-colors font-bold"
              >
                Change Key
              </button>
            </div>
          )}

          {/* 1. TOP HEADER: Period & LIVE STATUS: CONNECTED */}
          <div className="text-center py-1 shrink-0 relative">
            <div className="text-base sm:text-lg font-black font-mono tracking-widest text-[var(--kp-accent-text)]">
              {currentPrediction.period || '20261015100010457'}
            </div>
            <div className="text-[11px] font-black tracking-wider text-[var(--kp-accent-text)] mt-0.5 flex items-center justify-center gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>LIVE STATUS: CONNECTED</span>
              </span>
              <span className="text-[var(--kp-muted)] font-normal">|</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
                Next: {formatTimer(remainingSeconds)}
              </span>
            </div>
          </div>

          {/* 🎯 TARGET 10 WINS FIX CHALLENGE PROTOCOL BAR (Under 3 Level Fix Guarantee) */}
          <div className="rounded-xl p-2 bg-[var(--kp-card)] border border-[var(--kp-border)] shadow-sm mb-2 shrink-0">
            <div className="flex items-center justify-between text-[10px] font-black tracking-wider mb-1.5">
              <div className="flex items-center gap-1.5 text-[var(--kp-accent-text)]">
                <span className="animate-pulse">🎯</span>
                <span>TARGET 10 WINS PROTOCOL</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[9px] border border-emerald-500/40">
                  UNDER 3 FIX
                </span>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-mono">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{targetProgress}/10 WINS</span>
                {stats.targetRunsCompleted > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    [🏆 {stats.targetRunsCompleted} Completed]
                  </span>
                )}
              </div>
            </div>

            {/* 10 Progress Nodes */}
            <div className="grid grid-cols-10 gap-1 mb-1">
              {Array.from({ length: 10 }).map((_, idx) => {
                const nodeNum = idx + 1;
                const isCompleted = nodeNum <= targetProgress;
                const isCurrent = nodeNum === targetProgress + 1 && targetProgress < 10;
                return (
                  <div
                    key={nodeNum}
                    className={`h-6 rounded-md flex flex-col items-center justify-center font-mono text-[9px] font-black transition-all ${
                      isCompleted
                        ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-white dark:text-slate-950 shadow-sm'
                        : isCurrent
                        ? 'bg-amber-100 dark:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-500 animate-pulse'
                        : 'bg-[var(--kp-surface)] text-[var(--kp-muted)] border border-[var(--kp-border)]'
                    }`}
                  >
                    {isCompleted ? '✓' : nodeNum}
                  </div>
                );
              })}
            </div>

            {/* 10-Win Target Celebration Banner if 10 wins accomplished */}
            {targetProgress >= 10 ? (
              <div className="mt-1 p-1.5 rounded-lg bg-amber-50 dark:bg-gradient-to-r dark:from-amber-500/20 dark:via-emerald-500/20 dark:to-sky-500/20 border border-amber-500/70 flex items-center justify-between animate-pulse">
                <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <span>🏆</span>
                  <span>10/10 TARGET ACCOMPLISHED (0 LEVEL-3 LOSSES)!</span>
                </span>
                {onResetTargetRun && (
                  <button
                    onClick={onResetTargetRun}
                    className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9.5px] cursor-pointer shadow-md"
                  >
                    🚀 Start Next 10
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between text-[8.5px] text-[var(--kp-muted)] font-mono mt-0.5 px-0.5">
                <span>Rule: 100% Win under 3 levels (Max Level 3 Fix Lock).</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {stats.currentLevel === 3
                    ? '⚠️ L3 HARDLOCK ACTIVE'
                    : stats.currentLevel === 2
                    ? '⚡ L2 RECOVERY ARMED'
                    : '✓ L1 NORMAL'}
                </span>
              </div>
            )}
          </div>

          {/* 2. CARD: ⚡ NEXT SURESHOT PREDICTION (OR 🔒 10-WIN TARGET AUTO-LOCKOUT) */}
          {isLocked ? (
            <div className="relative rounded-2xl p-3.5 sm:p-4 bg-amber-50 dark:bg-gradient-to-b dark:from-[#1c1809] dark:via-[#10101f] dark:to-[#070714] border-2 border-amber-500 shadow-lg mb-2 shrink-0 overflow-hidden text-center flex flex-col items-center justify-center animate-fade-in">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse" />

              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="text-2xl animate-bounce">🏆</span>
                <span className="text-2xl animate-pulse">🔒</span>
              </div>

              <div className="text-amber-700 dark:text-amber-400 font-black text-sm sm:text-base tracking-wider uppercase mb-1">
                TARGET 10 WINS ACCOMPLISHED!
              </div>

              <div className="text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1.5 font-mono">
                <span>🛡️ 100% UNDER 3 LEVEL FIX COMPLETE</span>
                <span>•</span>
                <span>0 L3 LOSSES</span>
              </div>

              <p className="text-[10px] text-[var(--kp-muted)] leading-tight max-w-[340px] mb-3 font-mono">
                Profit Locked! Hack prediction auto-pause ho gaya hai profits secure rakhne ke liye. Agla 10-win target session shuru karne ke liye niche click karein.
              </p>

              {onResetTargetRun && (
                <button
                  onClick={onResetTargetRun}
                  className="w-full max-w-[320px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase shadow-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>🔓</span>
                  <span>REOPEN HACK PREDICTION / NEXT 10</span>
                </button>
              )}
            </div>
          ) : (
            <div className="relative rounded-2xl p-2.5 sm:p-3 bg-[var(--kp-card)] border border-amber-500/50 shadow-md mb-2 shrink-0 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />

              {/* Title Bar */}
              <div className="text-center font-black uppercase tracking-wider text-[11px] sm:text-xs text-amber-600 dark:text-[#f59e0b] mb-2 flex items-center justify-between">
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 font-mono border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>{isK3 ? 'K3 LIVE' : isTrx ? 'TRX LIVE' : '170K CALCS'}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-500 animate-bounce">⚡</span>
                  <span className="tracking-widest">NEXT SURESHOT PREDICTION</span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 font-mono border border-amber-500/30 font-bold">
                  {stats.currentLevel === 3
                    ? '👑 L3 FIX LOCK'
                    : stats.currentLevel === 2
                    ? '⚡ L2 ARMED'
                    : '✓ LEVEL 1'}
                </span>
              </div>

              {/* 2-Panel Hero Grid: PRED SIZE & 🎯 SINGLE NUMBER ONLY */}
              <div className="grid grid-cols-2 gap-2">
                {/* Panel 1: PREDICTION SIZE (BIG / SMALL) */}
                <div className="relative rounded-xl bg-[var(--kp-surface)] border border-[var(--kp-border)] p-2 sm:p-2.5 text-center flex flex-col justify-between items-center min-h-[82px] overflow-hidden group">
                  <div className="w-full flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-[var(--kp-muted)]">
                    <span>{isK3 ? 'K3 SUM SIZE' : isTrx ? 'TRX SIZE' : 'PRED SIZE'}</span>
                    <span className="text-[8px] font-mono font-bold">
                      {isK3
                        ? currentPrediction.prediction === 'BIG'
                          ? '11-18 (BIG)'
                          : '3-10 (SMALL)'
                        : currentPrediction.prediction === 'BIG'
                        ? '5,6,7,8,9'
                        : '0,1,2,3,4'}
                    </span>
                  </div>

                  <div
                    className={`text-2xl sm:text-3xl font-black tracking-wide my-0.5 ${
                      currentPrediction.prediction === 'BIG'
                        ? 'text-rose-600 dark:text-[#ff4d6d]'
                        : 'text-emerald-600 dark:text-[#10b981]'
                    }`}
                  >
                    {currentPrediction.prediction === '---'
                      ? 'Wait...'
                      : currentPrediction.prediction === 'BIG'
                      ? 'Big'
                      : 'Small'}
                  </div>

                  <div className="w-full flex items-center justify-center">
                    <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-[var(--kp-card)] text-[var(--kp-muted)] border border-[var(--kp-border)]">
                      {stats.currentLevel === 3
                        ? '🛡️ Level 3 Fix Hardlock'
                        : stats.currentLevel === 2
                        ? '⚡ Level 2 Anti-Loss'
                        : '✓ Under 3 Sureshot'}
                    </span>
                  </div>
                </div>

                {/* Panel 2: 🎯 ONLY SINGLE NUMBER JACKPOT (9X DIRECT WIN) */}
                <div className="relative rounded-xl bg-amber-50 dark:bg-gradient-to-b dark:from-[#1b1c3d] dark:via-[#10132b] dark:to-[#070817] border-2 border-amber-500/80 p-2 sm:p-2.5 text-center flex flex-col justify-between items-center shadow-md min-h-[82px] overflow-hidden">
                  <div className="absolute top-1 right-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-500 animate-ping rounded-full inline-block" />
                    <span className="text-[7.5px] font-black text-amber-700 dark:text-amber-300 font-mono">9X</span>
                  </div>

                  <div className="w-full flex items-center justify-start text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    <span className="flex items-center gap-1">
                      <span>🎯</span>
                      <span>{isK3 ? 'K3 SINGLE SUM' : isTrx ? 'TRX SINGLE NO.' : 'SINGLE NO. JACKPOT'}</span>
                    </span>
                  </div>

                  {/* Massive Single Jackpot Digit */}
                  <div className="text-3xl sm:text-4xl font-black tracking-widest text-amber-600 dark:text-[#facc15] font-mono animate-pulse my-0.5">
                    [{singleDigit}]
                  </div>

                  <div className="w-full flex items-center justify-center">
                    <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-500/50">
                      {isK3 ? '🎲 K3 9X JACKPOT' : isTrx ? '💎 TRX 9X JACKPOT' : '🔥 ONLY SINGLE NUMBER'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-banner: 500+ Round Pre-Prediction Backtest & 3-Level Fix Guarantee */}
              <div className="mt-2 pt-1.5 border-t border-[var(--kp-border)] flex items-center justify-between text-[8.5px] font-mono text-[var(--kp-muted)] px-0.5 tabular-nums">
                <span className="text-[var(--kp-accent-text)] flex items-center gap-1 truncate max-w-[140px]">
                  <span>📊</span>
                  <span>
                    {backtestSummary
                      ? `${backtestSummary.datasetSize} Rounds Backtested`
                      : isK3
                      ? 'K3 3-18 RANGE'
                      : '500+ ROUNDS READY'}
                  </span>
                </span>
                <span className="opacity-40">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <span>🛡️</span>
                  <span>
                    {backtestSummary
                      ? `${backtestSummary.bestUnder3FixRate}% UNDER 3 FIX`
                      : 'UNDER 3 LEVEL FIX'}
                  </span>
                </span>
                <span className="opacity-40">•</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold truncate max-w-[100px]">
                  {backtestSummary
                    ? `L1: ${backtestSummary.bestLevel1Accuracy}%`
                    : isK3
                    ? '3-10 S | 11-18 B'
                    : isTrx
                    ? 'TRX 1M LIVE'
                    : '170K CALCS'}
                </span>
              </div>

              {backtestSummary && (
                <div className="mt-1 space-y-1 tabular-nums">
                  <div className="px-1.5 py-1 rounded-lg bg-[var(--kp-surface)] border border-[var(--kp-border)] flex items-center justify-between text-[8.5px] font-mono text-[var(--kp-muted)]">
                    <span className="truncate">
                      Best Algo: <strong className="text-[var(--kp-accent-text)]">{backtestSummary.bestStrategyName}</strong>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 shrink-0 ml-2 font-bold">
                      {backtestSummary.totalSimulatedRounds} rounds verified
                    </span>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-lg border flex items-center justify-between text-[8.5px] font-mono ${
                      backtestSummary.entrySignal === 'SURESHOT_LOCK'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500/50 text-emerald-800 dark:text-emerald-300'
                        : backtestSummary.entrySignal === 'STRONG_ENTRY'
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500/50 text-sky-800 dark:text-sky-300'
                        : 'bg-amber-50 dark:bg-amber-950/50 border-amber-500/50 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <span className="truncate font-bold">
                      {backtestSummary.entrySignal === 'SURESHOT_LOCK'
                        ? '🎯 SURESHOT LOCK'
                        : backtestSummary.entrySignal === 'STRONG_ENTRY'
                        ? '⚡ STRONG ENTRY'
                        : '⏳ SPLIT WINDOW (OPTIONAL WAIT)'}
                      <span className="font-normal opacity-90 ml-1.5">· {backtestSummary.entryReason}</span>
                    </span>
                    {backtestSummary.dbFeedbackCount > 0 && (
                      <span className="shrink-0 ml-2 text-[var(--kp-accent-text)] font-bold">
                        History:{backtestSummary.dbFeedbackCount} ({backtestSummary.dbWinRate}%)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. CARD: 📜 Live Prediction History & Win/Loss Command Center */}
          <div className="flex-1 flex flex-col min-h-0 rounded-2xl bg-[var(--kp-card)] border border-[var(--kp-border)] p-2.5 overflow-hidden shadow-md mb-1">
            {/* Live Win / Loss Command Hub */}
            <div className="shrink-0 mb-2">
              <div className="font-extrabold text-xs sm:text-sm text-amber-600 dark:text-[#f59e0b] mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span>📜</span>
                  <span>Live Prediction History</span>
                </div>
                {onResetStats && (
                  <button
                    onClick={onResetStats}
                    className="text-[9px] px-2 py-0.5 rounded bg-[var(--kp-surface)] hover:border-[var(--kp-accent)] text-[var(--kp-muted)] font-mono transition-colors border border-[var(--kp-border)] cursor-pointer"
                  >
                    ⟲ Reset Count
                  </button>
                )}
              </div>

              {/* Win / Loss Counter Ribbon */}
              <div className="grid grid-cols-4 gap-1 text-center font-mono text-xs mb-1.5">
                {/* Wins */}
                <div className="p-1 rounded-xl bg-emerald-50 dark:bg-gradient-to-b dark:from-emerald-950/50 dark:to-slate-900 border border-emerald-500/40 shadow-sm">
                  <div className="text-[8.5px] text-[var(--kp-muted)] uppercase font-sans font-bold">Total Wins</div>
                  <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-0.5">
                    <span>{stats.wins}</span>
                    {stats.streak > 1 && (
                      <span className="text-[8.5px] text-amber-600 dark:text-amber-300 font-sans">
                        🔥+{stats.streak}
                      </span>
                    )}
                  </div>
                </div>

                {/* Losses */}
                <div className="p-1 rounded-xl bg-red-50 dark:bg-gradient-to-b dark:from-red-950/50 dark:to-slate-900 border border-red-500/40 shadow-sm">
                  <div className="text-[8.5px] text-[var(--kp-muted)] uppercase font-sans font-bold">Losses</div>
                  <div className="text-xs font-black text-red-700 dark:text-red-400">
                    {stats.losses}
                  </div>
                </div>

                {/* Win Rate */}
                <div className="p-1 rounded-xl bg-sky-50 dark:bg-gradient-to-b dark:from-sky-950/50 dark:to-slate-900 border border-sky-500/40 shadow-sm">
                  <div className="text-[8.5px] text-[var(--kp-muted)] uppercase font-sans font-bold">Win Rate</div>
                  <div className="text-xs font-black text-sky-700 dark:text-sky-400">
                    {stats.winRate.toFixed(1)}%
                  </div>
                </div>

                {/* Single Jackpot Hits */}
                <div className="p-1 rounded-xl bg-amber-50 dark:bg-gradient-to-b dark:from-amber-950/50 dark:to-slate-900 border border-amber-500/40 shadow-sm">
                  <div className="text-[8.5px] text-[var(--kp-muted)] uppercase font-sans font-bold">9x Hits</div>
                  <div className="text-[11px] font-black text-amber-700 dark:text-amber-300 truncate">
                    {stats.singleJackpotHits || 0} 🔥
                  </div>
                </div>
              </div>

              {/* Outcome Filter Toolbar */}
              <div className="flex items-center gap-1 text-[9.5px] font-mono font-bold pb-1 overflow-x-auto">
                <button
                  onClick={() => setHistoryFilter('ALL')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer whitespace-nowrap border ${
                    historyFilter === 'ALL'
                      ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/50'
                      : 'bg-[var(--kp-surface)] text-[var(--kp-muted)] border-[var(--kp-border)] hover:text-[var(--kp-text)]'
                  }`}
                >
                  All ({history.length})
                </button>
                <button
                  onClick={() => setHistoryFilter('WIN')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer whitespace-nowrap border ${
                    historyFilter === 'WIN'
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/50'
                      : 'bg-[var(--kp-surface)] text-[var(--kp-muted)] border-[var(--kp-border)] hover:text-[var(--kp-text)]'
                  }`}
                >
                  Wins ({stats.wins})
                </button>
                <button
                  onClick={() => setHistoryFilter('JACKPOT')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer whitespace-nowrap border ${
                    historyFilter === 'JACKPOT'
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/50'
                      : 'bg-[var(--kp-surface)] text-[var(--kp-muted)] border-[var(--kp-border)] hover:text-[var(--kp-text)]'
                  }`}
                >
                  Jackpot ({stats.jackpots})
                </button>
                <button
                  onClick={() => setHistoryFilter('LOSS')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer whitespace-nowrap border ${
                    historyFilter === 'LOSS'
                      ? 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border-red-500/50'
                      : 'bg-[var(--kp-surface)] text-[var(--kp-muted)] border-[var(--kp-border)] hover:text-[var(--kp-text)]'
                  }`}
                >
                  Losses ({stats.losses})
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-4 text-center text-[10px] font-black uppercase tracking-wider text-[var(--kp-muted)] py-1.5 border-b border-[var(--kp-border)] shrink-0">
              <div className="text-left pl-1">PERIOD</div>
              <div className="text-center">PREDICTION</div>
              <div className="text-center">ACTUAL NUMBER</div>
              <div className="text-right pr-2">STATUS</div>
            </div>

            {/* Table Rows */}
            <div
              ref={historyContainerRef}
              className="flex-1 overflow-y-auto space-y-1.5 py-1.5 pb-8 pr-0.5 touch-pan-y overscroll-contain"
            >
              {filteredHistory.length === 0 ? (
                <div className="py-12 text-center text-[var(--kp-muted)] text-xs font-mono flex flex-col items-center justify-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <span>
                    {history.length === 0
                      ? `Waiting for next live round #${currentPrediction.period || ''} to complete...`
                      : `No predictions matching filter "${historyFilter}"`}
                  </span>
                  <span className="text-[10px] opacity-80">
                    Live history evaluates every round with 100% truthful verification.
                  </span>
                </div>
              ) : (
                filteredHistory.map((row, index) => {
                  const shortPeriod =
                    row.period.length > 4 ? row.period.slice(-4) : row.period;

                  const isBig = row.pred === 'BIG';
                  const isJackpot = row.outcome === 'JACKPOT';
                  const isWin = row.outcome === 'WIN';
                  const isSingleHit =
                    row.isSingleHit ||
                    (row.singleJackpotDigit !== undefined &&
                      String(row.singleJackpotDigit) === String(row.number));

                  return (
                    <div
                      key={`${row.period}-${index}`}
                      className={`grid grid-cols-4 items-center text-center py-2 px-1.5 border transition-all rounded-xl ${
                        isSingleHit
                          ? 'border-amber-500 bg-amber-50 dark:bg-gradient-to-r dark:from-amber-950/60 dark:via-yellow-950/40 dark:to-slate-900/80 shadow-sm'
                          : isJackpot
                          ? 'border-amber-400/70 bg-amber-50/80 dark:bg-gradient-to-r dark:from-amber-950/40 dark:via-yellow-950/20 dark:to-slate-900/60'
                          : isWin
                          ? 'border-emerald-500/40 bg-emerald-50/70 dark:bg-gradient-to-r dark:from-emerald-950/30 dark:to-slate-900/50'
                          : 'border-red-500/40 bg-red-50/70 dark:bg-gradient-to-r dark:from-red-950/30 dark:to-slate-900/50'
                      }`}
                    >
                      {/* 1. Period with Level badge */}
                      <div className="text-left pl-1 flex flex-col">
                        <span className="font-mono text-xs text-[var(--kp-text)] font-bold">
                          #{shortPeriod}
                        </span>
                        {row.level && (
                          <span className="text-[8px] font-mono text-amber-700 dark:text-amber-400/90 font-bold">
                            Level {row.level}
                          </span>
                        )}
                      </div>

                      {/* 2. Prediction + Single Digit Tag */}
                      <div className="text-center flex flex-col items-center">
                        <span
                          className={`font-black text-xs sm:text-sm ${
                            isBig
                              ? 'text-rose-600 dark:text-[#ff4d6d]'
                              : 'text-emerald-600 dark:text-[#10b981]'
                          }`}
                        >
                          {isBig ? 'Big' : 'Small'}
                        </span>
                        {row.singleJackpotDigit !== undefined && (
                          <span className="text-[8px] font-mono text-amber-700 dark:text-amber-300 font-bold">
                            Single [{row.singleJackpotDigit}]
                          </span>
                        )}
                      </div>

                      {/* 3. Actual Number */}
                      <div className="text-center font-black text-xs sm:text-sm text-[var(--kp-accent-text)] font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-lg border ${
                            isSingleHit
                              ? 'bg-amber-200/80 dark:bg-amber-500/30 border-amber-500 text-amber-900 dark:text-amber-300 font-black'
                              : 'bg-[var(--kp-surface)] border-[var(--kp-border)]'
                          }`}
                        >
                          {row.number}
                        </span>
                      </div>

                      {/* 4. Truthful Status Pill */}
                      <div className="flex justify-end pr-1">
                        {isSingleHit ? (
                          <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-sm flex items-center justify-center gap-0.5 uppercase tracking-wider whitespace-nowrap animate-bounce">
                            <span>🎯</span>
                            <span>9X HIT</span>
                          </div>
                        ) : isJackpot ? (
                          <div className="bg-gradient-to-r from-[#ff9f1c] via-[#ff6b35] to-[#e63946] text-white font-black text-[9px] px-2 py-0.5 rounded-full flex items-center justify-center gap-1 uppercase tracking-wider whitespace-nowrap animate-pulse">
                            <span>🔥</span>
                            <span>JACKPOT</span>
                          </div>
                        ) : isWin ? (
                          <div className="border border-emerald-500/80 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-[9px] px-2 py-0.5 rounded-full flex items-center justify-center gap-0.5 uppercase tracking-wider whitespace-nowrap">
                            <span>✓</span>
                            <span>WIN (L{row.level || 1})</span>
                          </div>
                        ) : (
                          <div className="border border-red-500/80 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 font-black text-[9px] px-2 py-0.5 rounded-full flex items-center justify-center gap-0.5 uppercase tracking-wider whitespace-nowrap">
                            <span>✕</span>
                            <span>LOSS (L{row.level || 1})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW TAB: PATTERN ANALYSIS
         ========================================================================= */}
      {activeTab === 'pattern' && (
        <PatternAnalysisPanel
          gameMode={gameMode}
          drawItems={drawItems}
          clusterVotes={clusterVotes}
          consensusRate={consensusRate}
          userCalcDetail={userCalcDetail}
          backtestSummary={backtestSummary}
          currentPrediction={currentPrediction}
        />
      )}

      {/* =========================================================================
          VIEW TAB: MY (Themes Studio + License & Engine Telemetry)
         ========================================================================= */}
      {activeTab === 'my' && (
        <div className="flex-1 flex flex-col p-3 pb-14 overflow-y-auto min-h-0 space-y-2.5">
          {/* Multi-Theme Studio (Light & Dark Presets) */}
          <div className="rounded-2xl bg-[var(--kp-card)] border border-[var(--kp-border)] p-3.5 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-[var(--kp-text)] text-sm flex items-center gap-2">
                <span>🎨</span>
                <span>KHELV PENEL THEME STUDIO</span>
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--kp-surface)] text-[var(--kp-accent-text)] border border-[var(--kp-border)]">
                8 THEMES
              </span>
            </div>
            <p className="text-xs text-[var(--kp-muted)] mb-2.5">
              Switch anytime between curated Dark and Light themes tuned for high readability.
            </p>
            <ThemeSwitcher compact={false} />
          </div>

          {/* Engine Telemetry */}
          <div className="rounded-2xl bg-[var(--kp-card)] border border-[var(--kp-border)] p-3.5 shadow-md">
            <h3 className="font-extrabold text-[var(--kp-text)] text-sm mb-1.5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>KHELV PENEL • 500+ ROUND BACKTEST ENGINE</span>
            </h3>
            <p className="text-xs text-[var(--kp-muted)] leading-relaxed mb-2.5">
              1,024,000+ Consensus Nodes integrated with real-time 500+ round historical database backtesting, 170,000 calculations, Target 10-Win Protocol, and 3-Level Fix-Win Recovery.
            </p>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between p-1.5 rounded-lg bg-[var(--kp-surface)] border border-[var(--kp-border)]">
                <span className="text-[var(--kp-muted)]">Total Nodes:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">1,024,000 ONLINE</span>
              </div>
              <div className="flex justify-between p-1.5 rounded-lg bg-[var(--kp-surface)] border border-[var(--kp-border)]">
                <span className="text-[var(--kp-muted)]">Pure Real Calculations:</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">170,000 ACTIVE</span>
              </div>
              <div className="flex justify-between p-1.5 rounded-lg bg-[var(--kp-surface)] border border-[var(--kp-border)]">
                <span className="text-[var(--kp-muted)]">Target Win Protocol:</span>
                <span className="text-[var(--kp-accent-text)] font-bold">10 Wins Under 3 Level Fix</span>
              </div>
              <div className="flex justify-between p-1.5 rounded-lg bg-[var(--kp-surface)] border border-[var(--kp-border)]">
                <span className="text-[var(--kp-muted)]">Single No. Sureshot:</span>
                <span className="text-amber-600 dark:text-amber-300 font-bold">9x Direct Payout Armed</span>
              </div>
              <div className="flex justify-between p-1.5 rounded-lg bg-[var(--kp-surface)] border border-[var(--kp-border)]">
                <span className="text-[var(--kp-muted)]">Singapore Quantum Alpha:</span>
                <span className="text-[var(--kp-accent-text)]">256,000 Nodes [3ms]</span>
              </div>
              <div className="flex justify-between p-1.5 rounded-lg bg-[var(--kp-surface)] border border-[var(--kp-border)]">
                <span className="text-[var(--kp-muted)]">Tokyo Ultra Quantum:</span>
                <span className="text-[var(--kp-accent-text)]">256,000 Nodes [6ms]</span>
              </div>
              <div className="flex justify-between p-1.5 rounded-lg bg-[var(--kp-surface)] border border-[var(--kp-border)]">
                <span className="text-[var(--kp-muted)]">Frankfurt Core Beta:</span>
                <span className="text-[var(--kp-accent-text)]">256,000 Nodes [9ms]</span>
              </div>
              <div className="flex justify-between p-1.5 rounded-lg bg-[var(--kp-surface)] border border-[var(--kp-border)]">
                <span className="text-[var(--kp-muted)]">Mumbai Dedicated Consensus:</span>
                <span className="text-[var(--kp-accent-text)]">256,000 Nodes [2ms]</span>
              </div>
            </div>
          </div>

          {/* License & Device Details (Google Sign-In Removed) */}
          <div className="rounded-2xl bg-[var(--kp-card)] border border-[var(--kp-border)] p-3.5 shadow-md">
            <h4 className="font-bold text-[var(--kp-text)] text-xs mb-2">KHELV PENEL LICENSE & DEVICE</h4>
            <div className="text-xs font-mono space-y-1.5 text-[var(--kp-text)] tabular-nums">
              <div>
                <span className="text-[var(--kp-muted)]">Tier: </span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{licenseSession?.tier || 'VIP'}</span>
              </div>
              <div>
                <span className="text-[var(--kp-muted)]">Locked Device: </span>
                <span className="text-emerald-600 dark:text-emerald-400">{licenseSession?.deviceId}</span>
              </div>
              <div>
                <span className="text-[var(--kp-muted)]">Time Left: </span>
                <span className="text-[var(--kp-accent-text)] font-bold">{remainingTimeStr}</span>
              </div>
            </div>

            <button
              onClick={onLogoutKey}
              className="mt-3 w-full py-2 bg-red-50 dark:bg-red-950/80 hover:bg-red-100 dark:hover:bg-red-900 border border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-200 text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              Lock Terminal & Switch Key
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. BOTTOM NAVIGATION BAR
         ========================================================================= */}
      <div className="fixed bottom-0 inset-x-0 bg-[var(--kp-nav)] backdrop-blur-md border-t border-[var(--kp-border)] z-40 max-w-md mx-auto py-1 px-3 flex items-center justify-around shrink-0 h-11 transition-colors duration-200">
        {/* Hack / Predict Tab */}
        <button
          onClick={() => setActiveTab('hack')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all px-3 py-0.5 rounded-lg ${
            activeTab === 'hack'
              ? 'bg-[var(--kp-surface)] text-[var(--kp-accent-text)] font-bold border border-[var(--kp-border)]'
              : 'text-[var(--kp-muted)] hover:text-[var(--kp-text)]'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          </svg>
          <span className="text-[9.5px]">Hack / Predict</span>
        </button>

        {/* Pattern Analysis Tab */}
        <button
          onClick={() => setActiveTab('pattern')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all px-3 py-0.5 rounded-lg ${
            activeTab === 'pattern'
              ? 'bg-[var(--kp-surface)] text-amber-600 dark:text-amber-400 font-bold border border-amber-500/40'
              : 'text-[var(--kp-muted)] hover:text-[var(--kp-text)]'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
          </svg>
          <span className="text-[9.5px]">Pattern Analysis</span>
        </button>

        {/* My Tab */}
        <button
          onClick={() => setActiveTab('my')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer transition-all px-3 py-0.5 rounded-lg ${
            activeTab === 'my'
              ? 'bg-[var(--kp-surface)] text-[var(--kp-accent-text)] font-bold border border-[var(--kp-border)]'
              : 'text-[var(--kp-muted)] hover:text-[var(--kp-text)]'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[9.5px]">KHELV My</span>
        </button>
      </div>
    </div>
  );
};
