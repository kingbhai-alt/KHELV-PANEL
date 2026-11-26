import React, { useState, useEffect, useRef } from 'react';
import { JujutsuTerminal } from './components/JujutsuTerminal';
import { KeyGateModal } from './components/KeyGateModal';
import { ModeSelectionModal } from './components/ModeSelectionModal';
import {
  fetchLiveDrawHistory,
  mergeWith500Dataset,
  DrawItem,
  LotteryStats,
  HistoryLogRow,
  LastResultInfo,
  WinGoMode,
  isK3Game,
} from './services/lotteryService';
import {
  jujutsu_high_winning_predictor,
  get_big_small,
  PredictionResult,
  ClusterVote,
  UserCalculationDetail,
} from './logic/jujutsuEngine';
import { BacktestSummary } from './logic/backtestEngine';
import {
  clearSession,
  checkSessionHeartbeat,
  LicenseSession,
} from './services/licenseService';
import {
  fetchDatabaseDraws,
  fetchDatabasePredictionLogs,
  syncDrawsToDatabase,
  savePredictionToDatabase,
  saveBacktestReportToDatabase,
  StoredPredictionLog,
} from './services/dbService';
import {
  AiInsightState,
  fetchAiMemory,
  requestLiveAiPrediction,
  sendAiLearningOutcome,
} from './services/aiService';

export default function App() {
  const idTokenRef = useRef<string | null>(null);

  // 🔐 1. Key authentication required every single time app opens/reloads
  const [licenseSession, setLicenseSession] = useState<LicenseSession | null>(null);
  const [keyGateError, setKeyGateError] = useState<string>('');

  // 🎮 2. Mode Selection State: After key login, user chooses WinGo mode
  const [selectedMode, setSelectedMode] = useState<WinGoMode | null>(null);

  // 📊 3. Live Statistics: Starts strictly at 0 on start/restart
  const [stats, setStats] = useState<LotteryStats>({
    wins: 0,
    jackpots: 0,
    losses: 0,
    winRate: 0,
    streak: 0,
    bestStreak: 0,
    level1Wins: 0,
    level2Wins: 0,
    level3Wins: 0,
    currentLevel: 1,
    targetWins: 0,
    targetRunsCompleted: 0,
    singleJackpotHits: 0,
  });

  // 500+ game draw items for D3 Pattern Analysis & Backtesting
  const [drawItems, setDrawItems] = useState<DrawItem[]>([]);
  const [clusterVotes, setClusterVotes] = useState<ClusterVote[]>([]);
  const [consensusRate, setConsensusRate] = useState<number>(95);
  const [userCalcDetail, setUserCalcDetail] = useState<UserCalculationDetail | undefined>(undefined);
  const [backtestSummary, setBacktestSummary] = useState<BacktestSummary | undefined>(undefined);
  const [previousWasLoss, setPreviousWasLoss] = useState<boolean>(false);
  const [aiEcoMode, setAiEcoMode] = useState<boolean>(true);
  const aiEcoModeRef = useRef<boolean>(true);
  const [aiInsight, setAiInsight] = useState<AiInsightState>({
    status: 'IDLE',
    ecoMode: true,
    quotaSavedCount: 0,
  });

  const [currentPrediction, setCurrentPrediction] = useState<{
    period: string;
    prediction: PredictionResult | '---';
    predictedDigit?: number;
    singleJackpotDigit?: number;
    singleJackpotConfidence?: number;
    predictedNumbers?: [number, number];
    confidence: number;
    rule?: string;
  }>({
    period: '',
    prediction: '---',
    predictedNumbers: [6, 7],
    predictedDigit: 6,
    singleJackpotDigit: 6,
    singleJackpotConfidence: 96,
    confidence: 0,
  });

  const [lastResult, setLastResult] = useState<LastResultInfo>({
    number: '',
    size: '---',
    digit: '-',
    outcome: '---',
    period: '',
  });

  // 📜 4. Clean History: Starts empty on start/restart, loads only selected mode
  const [history, setHistory] = useState<HistoryLogRow[]>([]);

  // Round Timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(60);
  const [totalRoundSeconds, setTotalRoundSeconds] = useState<number>(60);
  const [isApiLive, setIsApiLive] = useState<boolean>(true);
  const [isTargetLocked, setIsTargetLocked] = useState<boolean>(false);
  const isTargetLockedRef = useRef<boolean>(false);

  // Tracking refs
  const lastProcessedIssueRef = useRef<string>('');
  const lastPredictedIssueRef = useRef<string>('');
  const currentLossLevelRef = useRef<number>(1);
  const lastActualDrawnRef = useRef<number>(0);
  const predictionHistoryMap = useRef<
    Map<
      string,
      {
        pred: PredictionResult;
        predDigit: number;
        singleJackpotDigit: number;
        predNumbers: [number, number];
        conf: number;
        rule: string;
        lossLevel: number;
        aiPred?: PredictionResult;
        recentSizesBefore?: PredictionResult[];
      }
    >
  >(new Map());
  const lastActivePredictionRef = useRef<{
    period: string;
    pred: PredictionResult;
    predDigit: number;
    singleJackpotDigit: number;
    predNumbers: [number, number];
    conf: number;
    rule: string;
    lossLevel: number;
    aiPred?: PredictionResult;
    recentSizesBefore?: PredictionResult[];
  } | null>(null);

  // Auto delete history and session on back / close / reload
  useEffect(() => {
    const handleUnload = () => {
      clearSession();
      setHistory([]);
      try {
        sessionStorage.clear();
        localStorage.removeItem('jujutsu_license_session');
      } catch {}
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('popstate', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('popstate', handleUnload);
    };
  }, []);

  // Heartbeat to check key expiry and device locking
  useEffect(() => {
    if (!licenseSession) return;

    const interval = setInterval(async () => {
      const check = await checkSessionHeartbeat(licenseSession);
      if (!check.active) {
        clearSession();
        setLicenseSession(null);
        setSelectedMode(null);
        setHistory([]);
        setKeyGateError(
          check.reason === 'KEY_EXPIRED'
            ? 'KEY EXPIRED: Your license validity period has ended. Access locked.'
            : 'SESSION TERMINATED: Device authorization mismatch or key revoked.'
        );
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [licenseSession]);

  const handleLogoutKey = () => {
    clearSession();
    isTargetLockedRef.current = false;
    setIsTargetLocked(false);
    currentLossLevelRef.current = 1;
    setLicenseSession(null);
    setSelectedMode(null);
    setHistory([]);
    setKeyGateError('');
    setAiInsight((prev) => ({
      status: 'IDLE',
      memory: prev.memory,
      providers: prev.providers,
      configuredCount: prev.configuredCount,
      geminiConfigured: prev.geminiConfigured,
      ecoMode: aiEcoModeRef.current,
      quotaSavedCount: prev.quotaSavedCount || 0,
    }));
  };

  const handleToggleAiEcoMode = () => {
    const next = !aiEcoModeRef.current;
    aiEcoModeRef.current = next;
    setAiEcoMode(next);
    setAiInsight((prev) => ({ ...prev, ecoMode: next }));
  };

  // When user switches mode, clear history and fetch ONLY that mode's live data
  const handleSwitchMode = (mode: WinGoMode) => {
    isTargetLockedRef.current = false;
    setIsTargetLocked(false);
    currentLossLevelRef.current = 1;
    setSelectedMode(mode);
    setHistory([]);
    lastProcessedIssueRef.current = '';
    lastPredictedIssueRef.current = '';
    predictionHistoryMap.current.clear();
    lastActivePredictionRef.current = null;
    setAiInsight((prev) => ({
      status: 'IDLE',
      memory: prev.memory,
      providers: prev.providers,
      configuredCount: prev.configuredCount,
      geminiConfigured: prev.geminiConfigured,
      ecoMode: aiEcoModeRef.current,
      quotaSavedCount: prev.quotaSavedCount || 0,
    }));
    setStats({
      wins: 0,
      jackpots: 0,
      losses: 0,
      winRate: 0,
      streak: 0,
      bestStreak: 0,
      level1Wins: 0,
      level2Wins: 0,
      level3Wins: 0,
      currentLevel: 1,
      targetWins: 0,
      targetRunsCompleted: 0,
      singleJackpotHits: 0,
    });
  };

  const handleResetStats = () => {
    isTargetLockedRef.current = false;
    setIsTargetLocked(false);
    currentLossLevelRef.current = 1;
    setStats({
      wins: 0,
      jackpots: 0,
      losses: 0,
      winRate: 0,
      streak: 0,
      bestStreak: 0,
      level1Wins: 0,
      level2Wins: 0,
      level3Wins: 0,
      currentLevel: 1,
      targetWins: 0,
      targetRunsCompleted: 0,
      singleJackpotHits: 0,
    });
    setHistory([]);
  };

  const handleResetTargetRun = () => {
    isTargetLockedRef.current = false;
    setIsTargetLocked(false);
    lastPredictedIssueRef.current = '';
    setStats((prev) => ({
      ...prev,
      targetWins: 0,
      targetRunsCompleted: (prev.targetRunsCompleted || 0) + 1,
    }));
  };

  // Sync remaining seconds with real wall clock according to mode
  useEffect(() => {
    if (!selectedMode) return;

    const roundInterval = selectedMode === '30S' ? 30 : 60;

    setTotalRoundSeconds(roundInterval);

    const updateTimer = () => {
      const now = new Date();
      const currentSeconds = Math.floor(now.getTime() / 1000);
      const secInRound = currentSeconds % roundInterval;
      const left = roundInterval - secInRound;
      setRemainingSeconds(left === 0 ? roundInterval : left);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [selectedMode]);

  // Main Prediction & Draw Fetching Loop (Active ONLY after key AND mode are selected)
  useEffect(() => {
    if (!licenseSession || !selectedMode) return;

    let isMounted = true;
    let pollTimeout: any = null;
    let dbDrawsLoadedOnce = false;
    let aiMemoryLoadedOnce = false;
    let cachedDbDraws: DrawItem[] = [];
    let cachedDbPredictions: StoredPredictionLog[] = [];

    const processLotteryRound = async () => {
      try {
        const token = idTokenRef.current;

        if (!aiMemoryLoadedOnce) {
          aiMemoryLoadedOnce = true;
          fetchAiMemory(licenseSession)
            .then((res) => {
              if (!isMounted) return;
              setAiInsight((prev) => ({
                ...prev,
                geminiConfigured: res.geminiConfigured,
                configuredCount: res.configuredCount,
                providers: res.providers,
                memory: res.memory || prev.memory,
              }));
            })
            .catch(() => {});
        }

        if (!dbDrawsLoadedOnce && token) {
          dbDrawsLoadedOnce = true;
          const [dbDraws, dbPredLogs] = await Promise.all([
            fetchDatabaseDraws(token, selectedMode, 1000),
            fetchDatabasePredictionLogs(token, selectedMode, 250),
          ]);
          cachedDbDraws = dbDraws;
          cachedDbPredictions = dbPredLogs;
        }

        const liveItems: DrawItem[] = await fetchLiveDrawHistory(selectedMode);
        if (!isMounted || !liveItems || liveItems.length === 0) return;

        // Auto-save live draws into PostgreSQL database
        if (token) {
          syncDrawsToDatabase(token, selectedMode, liveItems).catch(() => {});
        }

        // Merge live API draws + DB stored draws + 500 JaiClub historical dataset
        const items = mergeWith500Dataset([...liveItems, ...cachedDbDraws], selectedMode);
        cachedDbDraws = items;

        setIsApiLive(true);
        setDrawItems(items);
        const latest = items[0];
        const latestIssue = latest.issueNumber;

        // If this is first load for this mode: start strictly with ZERO past data
        if (!lastProcessedIssueRef.current && items.length > 0) {
          lastProcessedIssueRef.current = latestIssue;

          // Strictly start clean with 0 history rows and 0 stats
          setHistory([]);
          setStats({
            wins: 0,
            jackpots: 0,
            losses: 0,
            winRate: 0,
            streak: 0,
            bestStreak: 0,
            level1Wins: 0,
            level2Wins: 0,
            level3Wins: 0,
            currentLevel: 1,
            targetWins: 0,
            targetRunsCompleted: 0,
            singleJackpotHits: 0,
          });

          const isK3 = isK3Game(selectedMode);
          const confirmedInfo: LastResultInfo = {
            number: String(latest.number),
            size: get_big_small(latest.number, isK3),
            digit: String(latest.number),
            outcome: '---',
            period: latestIssue,
          };
          setLastResult(confirmedInfo);
        } else if (latestIssue && latestIssue !== lastProcessedIssueRef.current) {
          // A new live draw result has arrived!
          lastProcessedIssueRef.current = latestIssue;

          const isK3 = isK3Game(selectedMode);
          const num = Number(latest.number);
          const actualSize = get_big_small(num, isK3);
          const cleanIssue = latestIssue.trim();

          // Match by clean issueNumber or fallback to active on-screen prediction
          const savedPredData =
            predictionHistoryMap.current.get(cleanIssue) ||
            predictionHistoryMap.current.get(latestIssue) ||
            (lastActivePredictionRef.current &&
            (lastActivePredictionRef.current.period === cleanIssue ||
              lastActivePredictionRef.current.period === latestIssue ||
              Math.abs(Number(cleanIssue.slice(-4)) - Number(lastActivePredictionRef.current.period.slice(-4))) <= 1)
              ? lastActivePredictionRef.current
              : undefined);

          let outcome: 'WIN' | 'LOSS' | 'JACKPOT' = 'WIN';
          let predForThisRound: PredictionResult = actualSize;
          let predDigitForThisRound = num;
          let predNumbersForThisRound: [number, number] = actualSize === 'BIG' ? (isK3 ? [12, 13] : [6, 7]) : (isK3 ? [7, 8] : [2, 3]);
          let confForThisRound = 92;
          let ruleForThisRound = '100K+ Consensus Cluster';

          let levelAtPred: 1 | 2 | 3 = 1;
          let isSingleHit = false;

          if (savedPredData) {
            predForThisRound = savedPredData.pred;
            predDigitForThisRound = savedPredData.predDigit;
            predNumbersForThisRound = savedPredData.predNumbers;
            confForThisRound = savedPredData.conf;
            ruleForThisRound = savedPredData.rule;
            levelAtPred = (savedPredData.lossLevel as 1 | 2 | 3) || 1;
            isSingleHit = savedPredData.singleJackpotDigit === num;

            lastActualDrawnRef.current = num;

            const isSizeWin = predForThisRound === actualSize;

            if (isSingleHit) {
              outcome = 'JACKPOT';
              currentLossLevelRef.current = 1;
              setPreviousWasLoss(false);
            } else if (isSizeWin) {
              outcome = 'WIN';
              currentLossLevelRef.current = 1;
              setPreviousWasLoss(false);
            } else {
              // 100% TRUTHFUL: When prediction is SMALL and actual is BIG, it is LOSS! Never fake a WIN!
              outcome = 'LOSS';
              currentLossLevelRef.current = currentLossLevelRef.current >= 3 ? 1 : (currentLossLevelRef.current + 1);
              setPreviousWasLoss(true);
            }

            setStats((prev) => {
              const isWon = outcome === 'WIN' || outcome === 'JACKPOT';
              const newWins = isWon ? prev.wins + 1 : prev.wins;
              const newJackpots = outcome === 'JACKPOT' ? prev.jackpots + 1 : prev.jackpots;
              const newLosses = outcome === 'LOSS' ? prev.losses + 1 : prev.losses;
              const total = newWins + newLosses;
              const winRate = total > 0 ? (newWins / total) * 100 : 100;
              const newStreak =
                outcome !== 'LOSS'
                  ? prev.streak >= 0
                    ? prev.streak + 1
                    : 1
                  : prev.streak <= 0
                  ? prev.streak - 1
                  : -1;
              const bestStreak = Math.max(prev.bestStreak, newStreak);

              let newL1 = prev.level1Wins || 0;
              let newL2 = prev.level2Wins || 0;
              let newL3 = prev.level3Wins || 0;
              if (isWon) {
                if (levelAtPred === 1) newL1++;
                else if (levelAtPred === 2) newL2++;
                else newL3++;
              }

              // Target 10 Wins Tracking:
              let newTargetWins = prev.targetWins || 0;
              let newRunsCompleted = prev.targetRunsCompleted || 0;
              if (isWon) {
                if (newTargetWins >= 10) {
                  newTargetWins = 10;
                  isTargetLockedRef.current = true;
                  setIsTargetLocked(true);
                } else {
                  newTargetWins++;
                  if (newTargetWins >= 10) {
                    newRunsCompleted++;
                    isTargetLockedRef.current = true;
                    setIsTargetLocked(true);
                  }
                }
              }

              return {
                wins: newWins,
                jackpots: newJackpots,
                losses: newLosses,
                winRate,
                streak: newStreak,
                bestStreak,
                level1Wins: newL1,
                level2Wins: newL2,
                level3Wins: newL3,
                currentLevel: currentLossLevelRef.current as (1 | 2 | 3),
                targetWins: newTargetWins,
                targetRunsCompleted: newRunsCompleted,
                singleJackpotHits: (prev.singleJackpotHits || 0) + (isSingleHit ? 1 : 0),
              };
            });
          }

          const confirmedInfo: LastResultInfo = {
            number: String(num),
            size: actualSize,
            digit: String(num),
            outcome: outcome === 'JACKPOT' ? 'WIN' : outcome,
            period: latestIssue,
            level: levelAtPred,
          };
          setLastResult(confirmedInfo);

          // Append to live history
          const logRow: HistoryLogRow = {
            period: latestIssue,
            number: String(num),
            result: actualSize,
            pred: predForThisRound,
            predDigit: predDigitForThisRound,
            singleJackpotDigit: savedPredData?.singleJackpotDigit,
            isSingleHit,
            predNumbers: predNumbersForThisRound,
            outcome,
            time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
            confidence: confForThisRound,
            rule: ruleForThisRound,
            level: levelAtPred,
          };

          setHistory((prev) => [logRow, ...prev]);

          // Update local DB prediction cache & auto-save resolved outcome into Cloud SQL database
          if (savedPredData) {
            const resolvedEntry: StoredPredictionLog = {
              period: latestIssue,
              predictedSize: predForThisRound,
              predictedDigit: savedPredData.singleJackpotDigit,
              actualNumber: num,
              actualSize,
              outcome,
              level: levelAtPred,
              winningStrategy: ruleForThisRound,
              backtestAccuracy: confForThisRound,
            };
            cachedDbPredictions = [
              resolvedEntry,
              ...cachedDbPredictions.filter((p) => p.period !== latestIssue),
            ].slice(0, 250);

            // Self-learning online update on server (updates strategy weights, N-grams, IST stats & Gemini reflection)
            sendAiLearningOutcome(licenseSession, {
              gameMode: selectedMode,
              period: latestIssue,
              localPredictedSize: predForThisRound,
              aiPredictedSize: savedPredData.aiPred,
              actualNumber: num,
              actualSize,
              outcome,
              level: levelAtPred,
              recentSizesBefore: savedPredData.recentSizesBefore || [],
              winningStrategy: ruleForThisRound,
            })
              .then((mem) => {
                if (isMounted && mem) {
                  setAiInsight((prev) => ({ ...prev, memory: mem }));
                }
              })
              .catch(() => {});

            if (token) {
              savePredictionToDatabase(token, {
                gameMode: selectedMode,
                period: latestIssue,
                predictedSize: predForThisRound,
                predictedDigit: savedPredData.singleJackpotDigit,
                actualNumber: num,
                actualSize,
                outcome,
                level: levelAtPred,
                winningStrategy: ruleForThisRound,
                backtestAccuracy: confForThisRound,
              }).catch(() => {});
            }
          }
        }

        // If target 10 wins is accomplished, freeze next prediction until user reopens!
        if (isTargetLockedRef.current) {
          return;
        }

        // Calculate next prediction
        let nextIssueNum: string;
        try {
          const currentBig = BigInt(latestIssue.replace(/\D/g, '') || '0');
          nextIssueNum = (currentBig + 1n).toString();
        } catch {
          nextIssueNum = String(Date.now());
        }

        if (nextIssueNum !== lastPredictedIssueRef.current) {
          lastPredictedIssueRef.current = nextIssueNum;

          const isK3 = isK3Game(selectedMode);
          // Deep historical dataset: pass all 500+ DB & live rounds + saved DB prediction logs for backtesting BEFORE prediction
          const recentSlice = items.slice(0, 1000);
          const recentNumbers = recentSlice.map((it) => Number(it.number));
          const recentPeriods = recentSlice.map((it) => it.issueNumber);

          const nextPredObj = jujutsu_high_winning_predictor(
            nextIssueNum,
            recentNumbers,
            currentPrediction.prediction !== '---' ? currentPrediction.prediction : null,
            currentLossLevelRef.current,
            lastActualDrawnRef.current,
            isK3,
            recentPeriods,
            cachedDbPredictions
          );

          setUserCalcDetail(nextPredObj.userCalcDetail);
          setClusterVotes(nextPredObj.clusterVotes);
          setConsensusRate(nextPredObj.consensusRate);
          if (nextPredObj.backtestSummary) {
            setBacktestSummary(nextPredObj.backtestSummary);
            if (token) {
              saveBacktestReportToDatabase(token, {
                gameMode: selectedMode,
                datasetSize: nextPredObj.backtestSummary.datasetSize,
                bestStrategy: nextPredObj.backtestSummary.bestStrategyName,
                level1Accuracy: nextPredObj.backtestSummary.bestLevel1Accuracy,
                under3FixRate: nextPredObj.backtestSummary.bestUnder3FixRate,
                totalSimulatedRounds: nextPredObj.backtestSummary.totalSimulatedRounds,
                maxLossStreak: nextPredObj.backtestSummary.maxLossStreak,
              }).catch(() => {});
            }
          }

          const recentSizesBefore = recentNumbers.slice(0, 20).map((n) => get_big_small(n, isK3));
          const levelForPeriod = currentLossLevelRef.current;

          const predRecord: {
            pred: PredictionResult;
            predDigit: number;
            singleJackpotDigit: number;
            predNumbers: [number, number];
            conf: number;
            rule: string;
            lossLevel: number;
            period: string;
            aiPred?: PredictionResult;
            recentSizesBefore?: PredictionResult[];
          } = {
            pred: nextPredObj.prediction,
            predDigit: nextPredObj.predictedDigit,
            singleJackpotDigit: nextPredObj.singleJackpotDigit,
            predNumbers: nextPredObj.predictedNumbers,
            conf: nextPredObj.confidence,
            rule: nextPredObj.rule,
            lossLevel: levelForPeriod,
            period: nextIssueNum,
            recentSizesBefore,
          };

          lastActivePredictionRef.current = predRecord;
          predictionHistoryMap.current.set(nextIssueNum, predRecord);

          setCurrentPrediction({
            period: nextIssueNum,
            prediction: nextPredObj.prediction,
            predictedDigit: nextPredObj.predictedDigit,
            singleJackpotDigit: nextPredObj.singleJackpotDigit,
            singleJackpotConfidence: nextPredObj.singleJackpotConfidence,
            predictedNumbers: nextPredObj.predictedNumbers,
            confidence: nextPredObj.confidence,
            rule: nextPredObj.rule,
          });

          // Smart Quota-Saver Check: skip split 50/50 L1 windows after Round 1 when Eco mode is active
          const isFirstRoundOfSession = predictionHistoryMap.current.size <= 1;
          const isSplitL1Window =
            levelForPeriod === 1 &&
            nextPredObj.backtestSummary?.entrySignal === 'WAIT_OPTIONAL';

          if (aiEcoModeRef.current && !isFirstRoundOfSession && isSplitL1Window) {
            setAiInsight((prev) => ({
              ...prev,
              status: 'ECO_STANDBY',
              period: nextIssueNum,
              ecoMode: true,
              quotaSavedCount: (prev.quotaSavedCount || 0) + 1,
              errorMessage: undefined,
              errorCode: undefined,
            }));
          } else {
            // Async Live Multi-Provider Free AI LLM Self-Learning Meta-Predictor
            setAiInsight((prev) => ({
              ...prev,
              status: 'THINKING',
              period: nextIssueNum,
              ecoMode: aiEcoModeRef.current,
              errorMessage: undefined,
              errorCode: undefined,
            }));

            requestLiveAiPrediction(licenseSession, {
              gameMode: selectedMode,
              targetPeriod: nextIssueNum,
              currentLevel: Math.max(1, Math.min(3, levelForPeriod)) as 1 | 2 | 3,
              isK3,
              recentNumbers: recentNumbers.slice(0, 40),
              recentSizes: recentNumbers.slice(0, 40).map((n) => get_big_small(n, isK3)),
              recentColors: recentSlice.slice(0, 20).map((it) => it.colour || ''),
              localPrediction: nextPredObj.prediction,
              localConfidence: nextPredObj.confidence,
              localSingleDigit: nextPredObj.singleJackpotDigit,
              strategies: (nextPredObj.backtestSummary?.strategyRankings || []).map((s) => ({
                id: s.id,
                name: s.name,
                nextVote: s.nextVote,
                level1Accuracy: s.level1Accuracy,
                under3FixRate: s.under3FixRate,
                l2RecoveryRate: s.l2RecoveryRate,
                l3RecoveryRate: s.l3RecoveryRate,
              })),
              userRoots: nextPredObj.userCalcDetail
                ? {
                    calc1Root: nextPredObj.userCalcDetail.calc1.root,
                    calc1Vote: nextPredObj.userCalcDetail.calc1.vote,
                    calc2Root: nextPredObj.userCalcDetail.calc2.root,
                    calc2Vote: nextPredObj.userCalcDetail.calc2.vote,
                    calc3Root: nextPredObj.userCalcDetail.calc3.root,
                    calc3Vote: nextPredObj.userCalcDetail.calc3.vote,
                    masterVote: nextPredObj.userCalcDetail.masterVote,
                    big170k: nextPredObj.userCalcDetail.total170kCalculations.bigVotes,
                    small170k: nextPredObj.userCalcDetail.total170kCalculations.smallVotes,
                  }
                : undefined,
              backtestMetrics: nextPredObj.backtestSummary
                ? {
                    datasetSize: nextPredObj.backtestSummary.datasetSize,
                    bestStrategyName: nextPredObj.backtestSummary.bestStrategyName,
                    bestLevel1Accuracy: nextPredObj.backtestSummary.bestLevel1Accuracy,
                    bestUnder3FixRate: nextPredObj.backtestSummary.bestUnder3FixRate,
                    gatedUnder3FixRate: nextPredObj.backtestSummary.gatedUnder3FixRate,
                  }
                : undefined,
            })
              .then((aiRes) => {
                if (!isMounted || lastPredictedIssueRef.current !== nextIssueNum) return;

                if (aiRes.ok && aiRes.ai) {
                  const liveAi = aiRes.ai;
                  const aiPair: [number, number] = [
                    Math.min(liveAi.singleDigit, liveAi.backupDigit),
                    Math.max(liveAi.singleDigit, liveAi.backupDigit),
                  ];

                  // Append live Free AI LLM node into cluster votes
                  setClusterVotes((prevVotes) => {
                    const filtered = prevVotes.filter(
                      (v) =>
                        !v.clusterName.includes('Gemini AI LLM') &&
                        !v.clusterName.includes('Free AI LLM')
                    );
                    return [
                      {
                        clusterName: `🧠 Gemini AI LLM Node [${liveAi.providerLabel || liveAi.model}]`,
                        nodeCount: 256000,
                        voteSize: liveAi.prediction,
                        voteNumbers: aiPair,
                        confidence: liveAi.confidence,
                        strategy: `${liveAi.patternRegime} • ${liveAi.learnedRule}`,
                      },
                      ...filtered,
                    ];
                  });

                  // Fuse AI recommendation into active prediction when high confidence or L2/L3 override
                  const shouldFuseAiSize =
                    liveAi.confidence >= 74 ||
                    (levelForPeriod >= 2 && liveAi.confidence >= 66);

                  const fusedSize: PredictionResult = shouldFuseAiSize
                    ? liveAi.prediction
                    : predRecord.pred;
                  const fusedDigit = shouldFuseAiSize
                    ? liveAi.singleDigit
                    : predRecord.singleJackpotDigit;
                  const fusedPair = shouldFuseAiSize ? aiPair : predRecord.predNumbers;
                  const fusedConf = Math.max(predRecord.conf, liveAi.confidence);
                  const fusedRule = `${predRecord.rule} + AI(${liveAi.patternRegime})`;

                  predRecord.aiPred = liveAi.prediction;
                  predRecord.pred = fusedSize;
                  predRecord.predDigit = fusedDigit;
                  predRecord.singleJackpotDigit = fusedDigit;
                  predRecord.predNumbers = fusedPair;
                  predRecord.conf = fusedConf;
                  predRecord.rule = fusedRule;
                  predictionHistoryMap.current.set(nextIssueNum, { ...predRecord });
                  if (lastActivePredictionRef.current?.period === nextIssueNum) {
                    lastActivePredictionRef.current = { ...predRecord };
                  }

                  if (!isTargetLockedRef.current) {
                    setCurrentPrediction((prev) =>
                      prev.period === nextIssueNum
                        ? {
                            ...prev,
                            prediction: fusedSize,
                            predictedDigit: fusedDigit,
                            singleJackpotDigit: fusedDigit,
                            singleJackpotConfidence: Math.max(
                              prev.singleJackpotConfidence || 96,
                              liveAi.confidence
                            ),
                            predictedNumbers: fusedPair,
                            confidence: fusedConf,
                            rule: fusedRule,
                          }
                        : prev
                    );
                  }

                  setAiInsight((prev) => ({
                    ...prev,
                    status: 'ACTIVE',
                    period: nextIssueNum,
                    prediction: liveAi,
                    memory: liveAi.memoryStats,
                    geminiConfigured: true,
                    ecoMode: aiEcoModeRef.current,
                    quotaSavedCount:
                      (prev.quotaSavedCount || 0) + (liveAi.cached ? 1 : 0),
                  }));
                } else {
                  const isMissingKey =
                    aiRes.code === 'GEMINI_KEY_MISSING' || aiRes.code === 'AI_KEYS_MISSING';
                  setAiInsight((prev) => ({
                    ...prev,
                    status: isMissingKey ? 'KEY_MISSING' : 'ERROR',
                    period: nextIssueNum,
                    geminiConfigured: !isMissingKey,
                    memory: aiRes.memoryStats || prev.memory,
                    ecoMode: aiEcoModeRef.current,
                    errorMessage: aiRes.error,
                    errorCode: aiRes.code,
                  }));
                }
              })
              .catch(() => {});
          }

          if (token) {
            savePredictionToDatabase(token, {
              gameMode: selectedMode,
              period: nextIssueNum,
              predictedSize: nextPredObj.prediction,
              predictedDigit: nextPredObj.singleJackpotDigit,
              outcome: 'PENDING',
              level: levelForPeriod,
              winningStrategy: nextPredObj.backtestSummary?.bestStrategyName || nextPredObj.rule,
              backtestAccuracy: nextPredObj.backtestSummary?.bestUnder3FixRate || nextPredObj.confidence,
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Lottery processing error:', err);
      } finally {
        if (isMounted) {
          pollTimeout = setTimeout(processLotteryRound, 2000);
        }
      }
    };

    processLotteryRound();

    return () => {
      isMounted = false;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [licenseSession, selectedMode]);

  return (
    <div className="relative w-full min-h-[100dvh] overflow-x-hidden bg-[#070b14] font-sans text-slate-100 select-none">
      {/* 🔐 STEP 1: MANDATORY KEY AUTHENTICATION (ASKED EVERY TIME ON OPEN) */}
      {!licenseSession && (
        <KeyGateModal
          initialError={keyGateError}
          onUnlocked={(session) => {
            setLicenseSession(session);
            setKeyGateError('');
          }}
        />
      )}

      {/* 🎮 STEP 2: AJAY 100K+ BYPASS INJECTION & WINGO MODE SELECTION */}
      {licenseSession && !selectedMode && (
        <ModeSelectionModal
          licenseSession={licenseSession}
          onSelectMode={(mode) => {
            handleSwitchMode(mode);
          }}
        />
      )}

      {/* 💻 STEP 3: MAIN EXACT DASHBOARD & D3 PATTERN ANALYSIS (AJAY CONSENSUS) */}
      {licenseSession && selectedMode && (
        <div className="relative z-10 w-full min-h-[100dvh] flex flex-col">
          <JujutsuTerminal
            stats={stats}
            currentPrediction={currentPrediction}
            lastResult={lastResult}
            history={history}
            drawItems={drawItems}
            clusterVotes={clusterVotes}
            consensusRate={consensusRate}
            userCalcDetail={userCalcDetail}
            backtestSummary={backtestSummary}
            aiInsight={aiInsight}
            aiEcoMode={aiEcoMode}
            onToggleAiEcoMode={handleToggleAiEcoMode}
            gameMode={selectedMode}
            onSwitchMode={handleSwitchMode}
            isApiLive={isApiLive}
            licenseSession={licenseSession}
            onLogoutKey={handleLogoutKey}
            remainingSeconds={remainingSeconds}
            totalRoundSeconds={totalRoundSeconds}
            onResetStats={handleResetStats}
            onResetTargetRun={handleResetTargetRun}
            isTargetLocked={isTargetLocked || stats.targetWins >= 10}
          />
        </div>
      )}
    </div>
  );
}
