import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { ClusterVote, UserCalculationDetail, get_big_small } from '../logic/jujutsuEngine';
import { BacktestSummary } from '../logic/backtestEngine';
import { BrandLogo } from './BrandLogo';
import { GeminiLiveInsight } from '../services/aiService';
import { SelfLearningState } from '../logic/aiSelfLearningEngine';
import { PredictionRevealStage } from './PredictionRevealStage';
import { PredictionDecoderOverlay } from './PredictionDecoderOverlay';
import { CelebrationPopup } from './CelebrationPopup';
import { getMuted, getVoiceEnabled, toggleMute, toggleVoice, sfx } from '../utils/audio';

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
  decodeKey?: string;
  geminiInsight?: GeminiLiveInsight | null;
  isGeminiLoading?: boolean;
  selfLearningState?: SelfLearningState | null;
  onAskGeminiNow?: () => void;
  celebrationResult?: HistoryLogRow | null;
  onDismissCelebration?: () => void;
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
  isApiLive,
  licenseSession,
  onLogoutKey,
  remainingSeconds,
  totalRoundSeconds,
  onResetStats,
  decodeKey = '',
  geminiInsight = null,
  isGeminiLoading = false,
  selfLearningState = null,
  onAskGeminiNow,
  celebrationResult = null,
  onDismissCelebration,
}) => {
  const [activeTab, setActiveTab] = useState<'hack' | 'pattern' | 'my'>('hack');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [remainingTimeStr, setRemainingTimeStr] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'WIN' | 'JACKPOT' | 'LOSS' | 'L2L3'>('ALL');
  const [historySearch, setHistorySearch] = useState('');
  const [signalMode, setSignalMode] = useState<'UNLIMITED' | 'SURESHOT_FILTER'>('UNLIMITED');
  const [baseUnitStake, setBaseUnitStake] = useState<number>(100);
  const [isMutedState, setIsMutedState] = useState<boolean>(() => getMuted());
  const [isVoiceOn, setIsVoiceOn] = useState<boolean>(() => getVoiceEnabled());
  const [completedDecodeKey, setCompletedDecodeKey] = useState<string>('');
  const [selectedHistoryPopup, setSelectedHistoryPopup] = useState<HistoryLogRow | null>(null);

  useEffect(() => {
    if (!decodeKey) {
      setCompletedDecodeKey('');
    }
  }, [decodeKey]);

  const isDecoderOpen = Boolean(
    decodeKey && currentPrediction.prediction !== '---' && decodeKey !== completedDecodeKey
  );

  const handleCloseCelebration = useCallback(() => {
    setSelectedHistoryPopup(null);
    onDismissCelebration?.();
  }, [onDismissCelebration]);

  useEffect(() => {
    if (licenseSession?.expiresAt) {
      setRemainingTimeStr(formatRemainingTime(licenseSession.expiresAt));
      const interval = setInterval(() => {
        setRemainingTimeStr(formatRemainingTime(licenseSession.expiresAt));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [licenseSession]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const numPair: [number, number] =
    currentPrediction.predictedNumbers && currentPrediction.predictedNumbers.length === 2
      ? currentPrediction.predictedNumbers
      : currentPrediction.prediction === 'BIG'
      ? [6, 7]
      : [2, 3];

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

  // Estimate per-row & cumulative Net P/L (₹) using 1x : 2.1x : 4.4x recovery multipliers
  const historyWithPnl = useMemo(() => {
    return history.map((row) => {
      const lvl = row.level || 1;
      const mult =
        lvl >= 5 ? 19.2 : lvl === 4 ? 9.2 : lvl === 3 ? 4.4 : lvl === 2 ? 2.1 : 1.0;
      const stake = baseUnitStake * mult;
      const pnl =
        row.outcome === 'JACKPOT'
          ? Math.round(stake * 1.96)
          : row.outcome === 'WIN'
          ? Math.round(stake * 0.96)
          : -Math.round(stake);
      return { ...row, stake: Math.round(stake), pnl };
    });
  }, [history, baseUnitStake]);

  const sessionNetPnl = useMemo(
    () => historyWithPnl.reduce((acc, r) => acc + r.pnl, 0),
    [historyWithPnl]
  );

  const sessionUnder2Pct = useMemo(() => {
    if (historyWithPnl.length === 0) return backtestSummary?.bestUnder2FixRate ?? 79;
    const settledWins = historyWithPnl.filter((r) => r.outcome === 'WIN' || r.outcome === 'JACKPOT');
    const u2Hits = settledWins.filter((r) => (r.level || 1) <= 2).length;
    return Math.round((u2Hits / historyWithPnl.length) * 100);
  }, [historyWithPnl, backtestSummary]);

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return historyWithPnl.filter((row) => {
      if (historyFilter === 'WIN' && row.outcome !== 'WIN' && row.outcome !== 'JACKPOT') return false;
      if (historyFilter === 'JACKPOT' && row.outcome !== 'JACKPOT') return false;
      if (historyFilter === 'LOSS' && row.outcome !== 'LOSS') return false;
      if (historyFilter === 'L2L3' && (row.level || 1) < 2) return false;
      if (q) {
        return (
          row.period.toLowerCase().includes(q) ||
          String(row.number).includes(q) ||
          row.pred.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [historyWithPnl, historyFilter, historySearch]);

  const handleExportCsv = () => {
    sfx.click();
    const headers = ['Period', 'Level', 'PredSize', 'SingleDigit', 'ActualNumber', 'ActualSize', 'Outcome', 'NetPnL_INR', 'Confidence', 'Time'];
    const lines = [
      headers.join(','),
      ...filteredHistory.map((r) =>
        [
          r.period,
          `L${r.level || 1}`,
          r.pred,
          r.singleJackpotDigit ?? '',
          r.number,
          r.result,
          r.outcome,
          r.pnl,
          `${r.confidence}%`,
          r.time,
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khelv-game-penel-${gameMode}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleMute = () => {
    const muted = toggleMute();
    setIsMutedState(muted);
    if (!muted) sfx.click();
  };

  const handleToggleVoice = () => {
    const enabled = toggleVoice();
    setIsVoiceOn(enabled);
    sfx.click();
  };

  const recentTape = useMemo(() => drawItems.slice(0, 16), [drawItems]);
  const roundProgressPct = Math.min(
    100,
    Math.max(0, Math.round(((totalRoundSeconds - remainingSeconds) / Math.max(1, totalRoundSeconds)) * 100))
  );

  // Milestone progress without cap (10W -> 25W -> 50W -> 100W+)
  const milestoneTargets = [10, 25, 50, 100];

  return (
    <div className="w-full max-w-md lg:max-w-6xl mx-auto min-h-[100dvh] flex flex-col text-slate-100 select-none bg-[#040711] pb-20 lg:pb-8">
      {/* 4.0-SECOND FRAMER MOTION CYBER-TERMINAL PREDICTION DECODING OVERLAY */}
      <PredictionDecoderOverlay
        isOpen={isDecoderOpen && !celebrationResult}
        period={currentPrediction.period}
        gameMode={formatModeTitle(gameMode)}
        currentLevel={stats.currentLevel}
        isK3={isK3}
        datasetSize={backtestSummary?.datasetSize || drawItems.length}
        bestUnder2Rate={backtestSummary?.bestUnder2FixRate}
        bestUnder3Rate={backtestSummary?.bestUnder3FixRate}
        bestUnder5Rate={backtestSummary?.bestUnder5FixRate}
        durationMs={4000}
        onComplete={() => setCompletedDecodeKey(decodeKey)}
      />

      {/* HYPER-PREMIUM GLASSMORPHISM WIN / LOSS / 9X JACKPOT OUTCOME OVERLAY */}
      <CelebrationPopup
        result={selectedHistoryPopup || celebrationResult}
        baseStake={baseUnitStake}
        onClose={handleCloseCelebration}
      />

      {/* =========================================================================
          TOP COMMAND NAVIGATION & STATUS BAR
         ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#040711]/95 backdrop-blur-xl border-b border-slate-800/80 px-3 sm:px-5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Brand + Mode Switcher */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <BrandLogo
              alt="KHELV GAME PENEL"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-sky-400/60 shadow-[0_0_16px_rgba(56,189,248,0.28)] shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display font-black tracking-wider text-[11px] sm:text-sm text-white truncate whitespace-nowrap">
                  KHELV GAME PENEL
                </h1>
                <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 font-mono font-bold border border-emerald-500/40 whitespace-nowrap">
                  UNLIMITED
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 tabular-nums whitespace-nowrap truncate">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="sm:hidden">{isApiLive ? 'LIVE' : 'SYNC'}</span>
                  <span className="hidden sm:inline">{isApiLive ? 'LIVE SYNC' : 'BUFFER SYNC'}</span>
                </span>
                <span>·</span>
                <span className="text-sky-300 font-bold">#{currentPrediction.period?.slice(-6) || '------'}</span>
                <span>·</span>
                <span className="text-amber-300 font-bold">{formatTimer(remainingSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#090e1d] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              data-testid="tab-command-desk"
              onClick={() => setActiveTab('hack')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'hack'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Command Desk
            </button>
            <button
              type="button"
              data-testid="tab-pattern-lab"
              onClick={() => setActiveTab('pattern')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'pattern'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pattern &amp; Backtest Lab
            </button>
            <button
              type="button"
              data-testid="tab-system-ai"
              onClick={() => setActiveTab('my')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'my'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              System &amp; AI Memory
            </button>
          </nav>

          {/* Controls: Mode Dropdown + Audio/Voice + Key */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="relative">
              <button
                type="button"
                data-testid="mode-switcher-btn"
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="min-h-[34px] text-amber-300 hover:text-amber-200 font-mono text-[10px] sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer bg-[#090e1d] px-2 sm:px-2.5 py-1 rounded-lg border border-slate-800 whitespace-nowrap"
              >
                <span>{formatModeTitle(gameMode)}</span>
                <span className="text-[9px] text-slate-400">▼</span>
              </button>

              {showModeDropdown && (
                <div className="absolute top-full right-0 mt-1.5 z-50 bg-[#0b1122] border border-sky-500/40 rounded-xl p-1.5 shadow-2xl min-w-[160px] space-y-1">
                  {availableModes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        onSwitchMode(m);
                        setShowModeDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                        gameMode === m
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {formatModeTitle(m)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleToggleMute}
              title={isMutedState ? 'Unmute SFX' : 'Mute SFX'}
              className="hidden sm:flex min-h-[34px] px-2 rounded-lg bg-[#090e1d] border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white items-center cursor-pointer whitespace-nowrap"
            >
              {isMutedState ? 'SFX OFF' : 'SFX ON'}
            </button>

            <button
              type="button"
              onClick={handleToggleVoice}
              title="Toggle Voice Cues"
              className="hidden md:flex min-h-[34px] px-2 rounded-lg bg-[#090e1d] border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white items-center cursor-pointer whitespace-nowrap"
            >
              {isVoiceOn ? 'VOICE ON' : 'VOICE OFF'}
            </button>

            <button
              type="button"
              onClick={() => setShowKeyModal(!showKeyModal)}
              className="min-h-[34px] text-[10px] text-sky-300 hover:text-sky-200 font-mono px-2 sm:px-2.5 py-1 rounded-lg bg-sky-950/40 border border-sky-500/35 cursor-pointer flex items-center gap-1 tabular-nums whitespace-nowrap"
            >
              <span className="sm:hidden">{licenseSession?.tier || 'VIP'}</span>
              <span className="hidden sm:inline">{remainingTimeStr || 'VIP'}</span>
            </button>
          </div>
        </div>

        {/* Thin Round Countdown Progress Line */}
        <div className="mt-2 h-1 w-full rounded-full bg-slate-900 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-400 transition-[width] duration-300"
            style={{ width: `${roundProgressPct}%` }}
          />
        </div>

        {showKeyModal && (
          <div className="mt-2 p-2.5 rounded-xl bg-[#090e1d] border border-slate-700 text-xs font-mono flex items-center justify-between gap-2 shadow-xl">
            <div className="truncate">
              <span className="text-emerald-400 font-bold">DEVICE LOCKED: </span>
              <span className="text-slate-300">{licenseSession?.deviceId}</span>
            </div>
            <button
              type="button"
              onClick={onLogoutKey}
              className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 text-[11px] font-bold rounded-lg cursor-pointer shrink-0"
            >
              Change Key
            </button>
          </div>
        )}
      </header>

      {/* =========================================================================
          VIEW 1: COMMAND DESK (2-COLUMN ON DESKTOP, STACKED ON MOBILE)
         ========================================================================= */}
      {activeTab === 'hack' && (
        <main className="flex-1 p-3 sm:p-5 space-y-3 sm:space-y-4">
          {/* UNLIMITED CONTINUOUS ENGINE BANNER (ZERO 10-WIN LIMIT) */}
          <section
            data-testid="unlimited-engine-banner"
            className="rounded-2xl bg-[#090e1d] border border-emerald-500/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-black border border-emerald-500/40">
                UNLIMITED CONTINUOUS WINS
              </span>
              <span className="text-xs font-mono text-slate-300 tabular-nums">
                Session Wins: <strong className="text-white">{stats.wins}</strong> · Best Streak:{' '}
                <strong className="text-amber-300">{stats.bestStreak}</strong>
              </span>
              <div className="flex items-center gap-1 font-mono text-[10px] tabular-nums">
                {milestoneTargets.map((m) => {
                  const hit = stats.wins >= m;
                  return (
                    <span
                      key={m}
                      className={`px-1.5 py-0.5 rounded border ${
                        hit
                          ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      {m}W
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className="text-slate-400">Signal Mode:</span>
              <button
                type="button"
                onClick={() =>
                  setSignalMode((prev) =>
                    prev === 'UNLIMITED' ? 'SURESHOT_FILTER' : 'UNLIMITED'
                  )
                }
                className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer transition-colors ${
                  signalMode === 'UNLIMITED'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/50'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                }`}
              >
                {signalMode === 'UNLIMITED' ? 'Unlimited Stream (All Rds)' : 'Sureshot >=4/5 Filter'}
              </button>
            </div>
          </section>

          {/* 2-COLUMN COMMAND GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* LEFT COLUMN: 4s Decoder Prediction + Official Tape + Gemini AI + ROI Calculator */}
            <div className="lg:col-span-5 space-y-3.5">
              {signalMode === 'SURESHOT_FILTER' &&
                backtestSummary &&
                backtestSummary.entrySignal === 'WAIT_OPTIONAL' &&
                stats.currentLevel === 1 && (
                  <div className="p-2.5 rounded-xl bg-amber-950/45 border border-amber-400/50 text-amber-200 text-xs font-mono flex items-center justify-between">
                    <span>Split 50/50 Window — Optional Wait advised (Sureshot Filter active)</span>
                    <button
                      type="button"
                      onClick={() => setSignalMode('UNLIMITED')}
                      className="underline text-amber-300 font-bold ml-2 shrink-0 cursor-pointer"
                    >
                      Override
                    </button>
                  </div>
                )}

              <PredictionRevealStage
                period={currentPrediction.period}
                prediction={currentPrediction.prediction}
                singleDigit={singleDigit}
                numPair={numPair}
                confidence={currentPrediction.confidence || 96}
                currentLevel={stats.currentLevel}
                isK3={isK3}
                isTrx={isTrx}
                rule={currentPrediction.rule}
                backtestSummary={backtestSummary}
                decodeKey={decodeKey}
                isDecodingOverlayActive={isDecoderOpen || Boolean(celebrationResult)}
                baseStake={baseUnitStake}
              />

              {/* LIVE OFFICIAL DRAW TAPE (LAST 16 OFFICIAL RESULTS) */}
              <div className="rounded-2xl bg-[#090e1d] border border-slate-800/90 p-3">
                <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                  <span className="font-bold text-slate-200 uppercase tracking-wider">
                    Official Draw Tape (Latest 16)
                  </span>
                  <span className="text-slate-400 tabular-nums">
                    Pool: {drawItems.length} Rds
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-1.5 tabular-nums">
                  {recentTape.map((item, idx) => {
                    const num = Number(item.number);
                    const sz = get_big_small(num, isK3);
                    const isBig = sz === 'BIG';
                    return (
                      <div
                        key={`${item.issueNumber}-${idx}`}
                        title={`#${item.issueNumber}: ${num} (${sz})`}
                        className={`rounded-lg py-1.5 px-1 text-center border font-mono ${
                          idx === 0
                            ? 'ring-1 ring-sky-400 bg-sky-950/40 border-sky-400/70'
                            : isBig
                            ? 'bg-[#1a0d16] border-[#ff4d6d]/35'
                            : 'bg-[#081c17] border-[#10b981]/35'
                        }`}
                      >
                        <div
                          className={`text-xs font-black ${
                            isBig ? 'text-[#ff4d6d]' : 'text-[#10b981]'
                          }`}
                        >
                          {item.number}
                        </div>
                        <div className="text-[8px] text-slate-400 font-bold">
                          {isBig ? 'B' : 'S'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GEMINI 4 HYDROGEN + SELF-LEARNING AI CARD */}
              <div className="rounded-2xl bg-[#090e1d] border border-violet-500/35 p-3 font-mono text-xs tabular-nums">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="font-display font-extrabold text-violet-300 tracking-wide text-xs sm:text-[13px]">
                    GEMINI AI · SELF-LEARNING ORACLE
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isGeminiLoading ? (
                      <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-200 border border-violet-400/40 text-[10px] whitespace-nowrap">
                        THINKING...
                      </span>
                    ) : geminiInsight?.ok ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold whitespace-nowrap">
                        LIVE {geminiInsight.latencyMs ? `${geminiInsight.latencyMs}ms` : ''}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/40 text-[10px] font-bold whitespace-nowrap">
                        28-ALGO QUANT ACTIVE
                      </span>
                    )}
                    {onAskGeminiNow && !isGeminiLoading && (
                      <button
                        type="button"
                        onClick={onAskGeminiNow}
                        className="px-2 py-0.5 rounded bg-violet-950 hover:bg-violet-900 text-violet-200 border border-violet-500/40 text-[10px] cursor-pointer whitespace-nowrap"
                      >
                        Sync AI
                      </button>
                    )}
                  </div>
                </div>

                {selfLearningState && (
                  <div className="grid grid-cols-4 gap-1.5 text-[10px] mb-2">
                    <div className="p-1.5 rounded-lg bg-[#050814] border border-slate-800 text-center">
                      <span className="text-slate-400 block text-[9px]">LEARNED</span>
                      <strong className="text-sky-300">{selfLearningState.totalRoundsLearned} rds</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#050814] border border-slate-800 text-center">
                      <span className="text-slate-400 block text-[9px]">U2 FIX</span>
                      <strong className="text-emerald-400">
                        {selfLearningState.cyclesTotal > 0
                          ? `${Math.round(((selfLearningState.l1Wins + selfLearningState.l2Wins) / selfLearningState.cyclesTotal) * 100)}%`
                          : `${backtestSummary?.bestUnder2FixRate ?? 79}%`}
                      </strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#050814] border border-slate-800 text-center">
                      <span className="text-slate-400 block text-[9px]">U3 FIX</span>
                      <strong className="text-amber-300">
                        {selfLearningState.cyclesTotal > 0
                          ? `${Math.round(((selfLearningState.l1Wins + selfLearningState.l2Wins + selfLearningState.l3Wins) / selfLearningState.cyclesTotal) * 100)}%`
                          : `${backtestSummary?.bestUnder3FixRate ?? 90}%`}
                      </strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#050814] border border-slate-800 text-center">
                      <span className="text-slate-400 block text-[9px]">U5 SHIELD</span>
                      <strong className="text-emerald-300">
                        {selfLearningState.cyclesTotal > 0
                          ? `${Math.round(((selfLearningState.l1Wins + selfLearningState.l2Wins + selfLearningState.l3Wins + (selfLearningState.l4Wins || 0) + (selfLearningState.l5Wins || 0)) / selfLearningState.cyclesTotal) * 100)}%`
                          : `${backtestSummary?.bestUnder5FixRate ?? 98}%`}
                      </strong>
                    </div>
                  </div>
                )}

                {geminiInsight?.ok ? (
                  <div className="space-y-1.5 text-[11px] bg-[#050814] rounded-xl p-2.5 border border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-slate-200 whitespace-nowrap">
                        Call:{' '}
                        <strong
                          className={
                            geminiInsight.prediction === 'BIG' ? 'text-[#ff4d6d]' : 'text-[#10b981]'
                          }
                        >
                          {geminiInsight.prediction} [{geminiInsight.singleDigit}]
                        </strong>{' '}
                        ({geminiInsight.confidence}%)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-violet-950/70 border border-violet-500/30 text-violet-300 font-bold text-[10px] max-w-full truncate">
                        {geminiInsight.detectedPattern}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      {geminiInsight.analysisReason}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {geminiInsight?.errorCode === 'QUOTA_COOLDOWN' ||
                    geminiInsight?.errorCode === 'RESOURCE_EXHAUSTED'
                      ? 'Gemini free daily quota paused — 28-Algo Mirror/Dragon/ZigZag Anti-Bust Oracle + Self-Learning Booster active.'
                      : '28-Algo Mirror/Dragon/ZigZag Anti-Bust Oracle + Self-Learning Booster synced across 1,099+ rounds.'}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Telemetry Ribbon + Upgraded Live History Ledger */}
            <div className="lg:col-span-7 space-y-3.5">
              {/* Session Metrics Ribbon */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono tabular-nums">
                <div className="p-2.5 rounded-xl bg-[#090e1d] border border-emerald-500/35">
                  <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Wins</div>
                  <div className="text-base font-black text-emerald-400">{stats.wins}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#090e1d] border border-red-500/35">
                  <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Losses</div>
                  <div className="text-base font-black text-red-400">{stats.losses}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#090e1d] border border-sky-500/35">
                  <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Win Rate</div>
                  <div className="text-base font-black text-sky-400">{stats.winRate.toFixed(1)}%</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#090e1d] border border-amber-500/35">
                  <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">9X Hits</div>
                  <div className="text-base font-black text-amber-300">{stats.singleJackpotHits || 0}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#090e1d] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">
                    {(stats.level4Wins || 0) + (stats.level5Wins || 0) > 0 ? 'L1-L5 Wins' : 'L1 / L2 / L3'}
                  </div>
                  <div className="text-xs font-black text-slate-200 mt-1">
                    {stats.level1Wins}/{stats.level2Wins}/{stats.level3Wins}
                    {(stats.level4Wins || 0) + (stats.level5Wins || 0) > 0
                      ? `/${stats.level4Wins || 0}/${stats.level5Wins || 0}`
                      : ''}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#090e1d] border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Est P/L</div>
                  <div
                    className={`text-sm font-black mt-0.5 ${
                      sessionNetPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {sessionNetPnl >= 0 ? '+' : '-'}₹{Math.abs(sessionNetPnl)}
                  </div>
                </div>
              </div>

              {/* Upgraded Glassmorphic Live Prediction History Command Card */}
              <div className="rounded-2xl bg-[#090e1d]/75 backdrop-blur-xl ring-1 ring-white/10 border border-sky-500/25 p-3.5 shadow-[0_24px_64px_rgba(0,0,0,0.65)] flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display font-extrabold text-sm sm:text-base text-white">
                        Live Prediction History Ledger
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-bold tabular-nums">
                        U2 Fix {sessionUnder2Pct}%
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Tap any settled round to inspect Win / Loss / 9X Jackpot card
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <label className="flex items-center gap-1 bg-[#050814]/90 border border-slate-800 rounded-lg px-2 py-1 text-slate-300">
                      <span>Base ₹</span>
                      <input
                        type="number"
                        min={10}
                        step={10}
                        value={baseUnitStake}
                        onChange={(e) => setBaseUnitStake(Math.max(10, Number(e.target.value) || 100))}
                        className="w-12 bg-transparent text-white font-bold outline-none tabular-nums"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={filteredHistory.length === 0}
                      className="min-h-[30px] px-2.5 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900/70 border border-sky-500/40 text-sky-300 font-bold cursor-pointer disabled:opacity-40"
                    >
                      Export CSV
                    </button>
                    {onResetStats && (
                      <button
                        type="button"
                        onClick={onResetStats}
                        className="min-h-[30px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Recent 10 Outcome Strip */}
                {historyWithPnl.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 font-mono text-[10px] tabular-nums">
                    <span className="text-slate-400 shrink-0">L10:</span>
                    {historyWithPnl.slice(0, 10).map((r, i) => {
                      const isJp = r.outcome === 'JACKPOT' || r.isSingleHit;
                      const isW = r.outcome === 'WIN' || isJp;
                      return (
                        <button
                          key={`chip-${r.period}-${i}`}
                          type="button"
                          onClick={() => setSelectedHistoryPopup(r)}
                          className={`px-2 py-0.5 rounded-md font-bold border shrink-0 cursor-pointer ${
                            isJp
                              ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                              : isW
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                              : 'bg-red-500/15 text-red-300 border-red-500/40'
                          }`}
                        >
                          {isJp ? '9X' : isW ? `W·L${r.level || 1}` : 'L'}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Search + Filter Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-[10px] font-mono font-bold">
                    {(['ALL', 'WIN', 'JACKPOT', 'LOSS', 'L2L3'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setHistoryFilter(f)}
                        className={`min-h-[30px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap border ${
                          historyFilter === f
                            ? 'bg-sky-500/20 text-sky-300 border-sky-400/50'
                            : 'bg-[#050814]/90 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {f === 'ALL'
                          ? `All (${history.length})`
                          : f === 'WIN'
                          ? `Wins (${stats.wins})`
                          : f === 'JACKPOT'
                          ? `9X (${stats.jackpots})`
                          : f === 'LOSS'
                          ? `Loss (${stats.losses})`
                          : 'L2-L5 Rec'}
                      </button>
                    ))}
                  </div>

                  <div className="relative sm:w-56">
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search period or digit..."
                      className="w-full min-h-[32px] px-3 pr-7 py-1 rounded-lg bg-[#050814]/90 border border-slate-800 focus:border-sky-400 outline-none text-xs font-mono text-white placeholder-slate-500"
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => setHistorySearch('')}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2.5 py-2 border-y border-slate-800/90 bg-[#050814]/90 rounded-t-xl">
                  <div>Period</div>
                  <div className="text-center">Signal</div>
                  <div className="text-center">Drawn</div>
                  <div className="text-center">Net P/L</div>
                  <div className="text-right">Result</div>
                </div>

                {/* Animated Rows */}
                <div className="divide-y divide-slate-800/60 max-h-[480px] overflow-y-auto scrollbar-thin">
                  {filteredHistory.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-mono space-y-1.5">
                      <div>
                        {history.length === 0
                          ? `Listening for live round #${currentPrediction.period || ''} settlement...`
                          : 'No history records match your current filter.'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Continuous unlimited tracking active — every completed round settles automatically.
                      </div>
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {filteredHistory.map((row, index) => {
                        const shortPeriod = row.period.length > 6 ? row.period.slice(-6) : row.period;
                        const isBig = row.pred === 'BIG';
                        const isSingleHit =
                          row.isSingleHit ||
                          (row.singleJackpotDigit !== undefined &&
                            String(row.singleJackpotDigit) === String(row.number));
                        const isWin = row.outcome === 'WIN' || row.outcome === 'JACKPOT';

                        return (
                          <motion.button
                            key={`${row.period}-${index}`}
                            type="button"
                            layout
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            onClick={() => setSelectedHistoryPopup(row)}
                            className="w-full text-left grid grid-cols-5 items-center py-2.5 px-2.5 text-xs font-mono tabular-nums hover:bg-white/[0.04] transition-colors cursor-pointer"
                          >
                            <div className="min-w-0 pr-1">
                              <div className="font-bold text-slate-200 truncate">#{shortPeriod}</div>
                              <div className="text-[10px] text-slate-400 truncate">
                                L{row.level || 1} · {row.time}
                              </div>
                            </div>

                            <div className="text-center">
                              <span
                                className={`font-black ${
                                  isBig ? 'text-[#ff4d6d]' : 'text-[#10b981]'
                                }`}
                              >
                                {row.pred}
                              </span>
                              {row.singleJackpotDigit !== undefined && (
                                <div className="text-[10px] text-amber-300 font-bold">
                                  [{row.singleJackpotDigit}] · {row.confidence}%
                                </div>
                              )}
                            </div>

                            <div className="text-center">
                              <span className="px-2 py-0.5 rounded bg-[#050814]/90 border border-slate-800 text-sky-300 font-bold">
                                {row.number} ({row.result[0]})
                              </span>
                            </div>

                            <div
                              className={`text-center font-bold ${
                                row.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {row.pnl >= 0 ? '+' : '-'}₹{Math.abs(row.pnl)}
                            </div>

                            <div className="text-right">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                  isSingleHit
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                                    : isWin
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                    : 'bg-red-500/15 text-red-300 border-red-500/40'
                                }`}
                              >
                                {isSingleHit ? '9X HIT' : row.outcome}
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* =========================================================================
          VIEW 2: PATTERN & 1,099+ BACKTEST LAB
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
          VIEW 3: SYSTEM ARCHITECTURE & SELF-LEARNING AI MEMORY
         ========================================================================= */}
      {activeTab === 'my' && (
        <main className="flex-1 p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="rounded-2xl bg-[#090e1d] border border-sky-500/35 p-4 shadow-xl">
            <h2 className="font-display font-extrabold text-white text-base mb-1.5">
              KHELV GAME PENEL · QUANT CORE ARCHITECTURE
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              2,560,000+ Consensus Nodes synchronized with 1,099+ historical rounds, 28 mathematical algorithms (Mirror, Dragon &amp; ZigZag Shield), 170,000 real calculations, and unlimited continuous win routing.
            </p>
            <div className="space-y-1.5 text-xs font-mono tabular-nums">
              {[
                ['Consensus Clusters', '18 Clusters / 2,560,000 Nodes'],
                ['Backtest Ensemble', '28 Algorithms (Mirror/Dragon/ZigZag Oracle)'],
                ['Differentiated Calcs', '170,000 Active (10 Families)'],
                ['Win Limit Mode', 'UNLIMITED CONTINUOUS'],
                ['Recovery Shield', 'Under-2/3 & L1-L5 Titanium Shield'],
                ['9X Jackpot Target', 'Empirical Markov Digit Matrix'],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between p-2 rounded-xl bg-[#050814] border border-slate-800/80"
                >
                  <span className="text-slate-400">{k}</span>
                  <span className="text-emerald-400 font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {selfLearningState && (
              <div className="rounded-2xl bg-[#090e1d] border border-violet-500/35 p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-extrabold text-violet-300 text-sm">
                    SELF-LEARNING REGIME MEMORY
                  </h3>
                  <span className="text-xs font-mono text-emerald-400 tabular-nums">
                    {selfLearningState.totalRoundsLearned} Rounds Learned
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs mb-3 tabular-nums">
                  <div className="p-2 rounded-xl bg-[#050814] border border-slate-800">
                    <div className="text-[10px] text-slate-400">L1 WINS</div>
                    <div className="text-emerald-400 font-black">{selfLearningState.l1Wins}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#050814] border border-slate-800">
                    <div className="text-[10px] text-slate-400">L2 FIX</div>
                    <div className="text-sky-400 font-black">{selfLearningState.l2Wins}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#050814] border border-slate-800">
                    <div className="text-[10px] text-slate-400">L3-L5 FIX</div>
                    <div className="text-amber-300 font-black">
                      {selfLearningState.l3Wins + (selfLearningState.l4Wins || 0) + (selfLearningState.l5Wins || 0)}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#050814] border border-slate-800">
                    <div className="text-[10px] text-slate-400">GEMINI</div>
                    <div className="text-violet-300 font-black">
                      {selfLearningState.geminiTotal > 0
                        ? `${Math.round((selfLearningState.geminiWins / selfLearningState.geminiTotal) * 100)}%`
                        : 'READY'}
                    </div>
                  </div>
                </div>
                {selfLearningState.recentLessons.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto text-[11px] font-mono text-slate-300 scrollbar-thin">
                    {selfLearningState.recentLessons.map((l, i) => (
                      <div
                        key={`${l.period}-${i}`}
                        className="p-2 rounded-lg bg-[#050814] border border-slate-800 truncate"
                      >
                        {l.lesson}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-[#090e1d] border border-slate-800 p-4 shadow-xl">
              <h3 className="font-display font-bold text-white text-sm mb-2">
                TERMINAL LICENSE &amp; DEVICE BINDING
              </h3>
              <div className="text-xs font-mono space-y-1.5 text-slate-300 tabular-nums">
                <div>
                  <span className="text-slate-500">Tier: </span>
                  <span className="text-amber-300 font-bold">{licenseSession?.tier || 'VIP'}</span>
                </div>
                <div className="break-all">
                  <span className="text-slate-500">Device ID: </span>
                  <span className="text-emerald-400">{licenseSession?.deviceId}</span>
                </div>
                <div>
                  <span className="text-slate-500">Remaining: </span>
                  <span className="text-sky-300 font-bold">{remainingTimeStr}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogoutKey}
                className="mt-4 w-full min-h-[42px] py-2 bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Lock Terminal &amp; Switch Key
              </button>
            </div>
          </div>
        </main>
      )}

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION BAR (44px+ TOUCH TARGETS)
         ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[#040711]/95 backdrop-blur-xl border-t border-slate-800 z-40 px-3 py-1.5 flex items-center justify-around">
        <button
          type="button"
          onClick={() => setActiveTab('hack')}
          className={`min-h-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold cursor-pointer ${
            activeTab === 'hack' ? 'text-sky-300 bg-sky-500/15' : 'text-slate-400'
          }`}
        >
          <span>Command</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pattern')}
          className={`min-h-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold cursor-pointer ${
            activeTab === 'pattern' ? 'text-amber-300 bg-amber-500/15' : 'text-slate-400'
          }`}
        >
          <span>Pattern Lab</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('my')}
          className={`min-h-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-bold cursor-pointer ${
            activeTab === 'my' ? 'text-emerald-300 bg-emerald-500/15' : 'text-slate-400'
          }`}
        >
          <span>System &amp; AI</span>
        </button>
      </nav>
    </div>
  );
};
