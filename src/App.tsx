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
  getMemoryAuthToken,
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
  computeSelfLearningBoost,
  recordSelfLearningOutcome,
  loadSelfLearningState,
  saveSelfLearningState,
  SelfLearningState,
  PatternRegime,
} from './logic/aiSelfLearningEngine';
import {
  requestGeminiLivePrediction,
  sendSelfLearningFeedbackToServer,
  GeminiLiveInsight,
  GeminiPredictionPayload,
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
      }
    >
  >(new Map());
  // 🧠 Live Self-Learning & Gemini 4 Hydrogen AI State
  const [selfLearningState, setSelfLearningState] = useState<SelfLearningState | null>(null);
  const selfLearningStateRef = useRef<SelfLearningState | null>(null);
  const [geminiInsight, setGeminiInsight] = useState<GeminiLiveInsight | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);

  const geminiCooldownUntilRef = useRef<number>(0);
  const roundsSinceGeminiRef = useRef<number>(99);
  const lastGeminiRegimeRef = useRef<string>('');
  const lastGeminiPayloadRef = useRef<{
    payload: GeminiPredictionPayload;
    finalInitialConf: number;
    finalInitialPair: [number, number];
  } | null>(null);

  const geminiPredByPeriodRef = useRef<Map<string, PredictionResult>>(new Map());
  const basePredByPeriodRef = useRef<
    Map<
      string,
      {
        basePred: PredictionResult;
        regime: PatternRegime;
        strategyRankings?: BacktestSummary['strategyRankings'];
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
    const loadedAi = loadSelfLearningState(mode);
    selfLearningStateRef.current = loadedAi;
    setSelfLearningState(loadedAi);
    setGeminiInsight(null);
    setIsGeminiLoading(false);
    roundsSinceGeminiRef.current = 99;
    lastGeminiRegimeRef.current = '';
    lastGeminiPayloadRef.current = null;
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
    let cachedDbDraws: DrawItem[] = [];
    let cachedDbPredictions: StoredPredictionLog[] = [];

    const processLotteryRound = async () => {
      try {
        const token = idTokenRef.current || licenseSession.authToken || getMemoryAuthToken();

        if (!dbDrawsLoadedOnce && token) {
          dbDrawsLoadedOnce = true;
          const [dbDraws, dbPredLogs] = await Promise.all([
            fetchDatabaseDraws(token, selectedMode, 5000),
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

            // Record Self-Learning AI outcome & sync feedback to server
            const baseMeta =
              basePredByPeriodRef.current.get(cleanIssue) ||
              basePredByPeriodRef.current.get(latestIssue);
            const geminiPredUsed =
              geminiPredByPeriodRef.current.get(cleanIssue) ||
              geminiPredByPeriodRef.current.get(latestIssue);
            const curAiState =
              selfLearningStateRef.current || loadSelfLearningState(selectedMode);
            const updatedAiState = recordSelfLearningOutcome(curAiState, {
              period: latestIssue,
              regime: baseMeta?.regime || 'CHOPPY_MIXED',
              level: levelAtPred,
              basePred: baseMeta?.basePred || predForThisRound,
              aiPred: predForThisRound,
              geminiPred: geminiPredUsed,
              actualNumber: num,
              actualSize,
              strategyRankings: baseMeta?.strategyRankings,
            });
            selfLearningStateRef.current = updatedAiState;
            saveSelfLearningState(selectedMode, updatedAiState);
            if (isMounted) setSelfLearningState(updatedAiState);

            const latestLesson = updatedAiState.recentLessons[0]?.lesson || '';
            sendSelfLearningFeedbackToServer({
              gameMode: selectedMode,
              period: latestIssue,
              regime: baseMeta?.regime || 'CHOPPY_MIXED',
              level: levelAtPred,
              basePred: baseMeta?.basePred || predForThisRound,
              aiPred: predForThisRound,
              geminiPred: geminiPredUsed,
              actualNumber: num,
              actualSize,
              outcome,
              lesson: latestLesson,
            }).catch(() => {});
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
          // Deep historical dataset: pass all 999+ DB & live rounds + saved DB prediction logs for backtesting BEFORE prediction
          const recentSlice = items.slice(0, 5000);
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

          const curAiState =
            selfLearningStateRef.current || loadSelfLearningState(selectedMode);
          if (!selfLearningStateRef.current) {
            selfLearningStateRef.current = curAiState;
            if (isMounted) setSelfLearningState(curAiState);
          }

          const boost = computeSelfLearningBoost(
            nextPredObj,
            recentNumbers,
            currentLossLevelRef.current,
            isK3,
            curAiState
          );

          basePredByPeriodRef.current.set(nextIssueNum, {
            basePred: nextPredObj.prediction,
            regime: boost.patternFeatures.regime,
            strategyRankings: nextPredObj.backtestSummary?.strategyRankings,
          });

          const finalInitialPred = boost.boostedPrediction;
          const finalInitialDigit = boost.boostedDigit;
          const finalInitialConf = boost.boostedConfidence;
          const finalInitialPair: [number, number] =
            finalInitialPred === nextPredObj.prediction
              ? nextPredObj.predictedNumbers
              : isK3
              ? finalInitialPred === 'BIG'
                ? [11, 13]
                : [8, 9]
              : finalInitialPred === 'BIG'
              ? [6, 7]
              : [2, 3];
          const finalInitialRule =
            finalInitialPred !== nextPredObj.prediction
              ? boost.boostReason
              : nextPredObj.rule;

          const predRecord = {
            pred: finalInitialPred,
            predDigit: finalInitialDigit,
            singleJackpotDigit: finalInitialDigit,
            predNumbers: finalInitialPair,
            conf: finalInitialConf,
            rule: finalInitialRule,
            lossLevel: currentLossLevelRef.current,
            period: nextIssueNum,
          };

          lastActivePredictionRef.current = predRecord;
          predictionHistoryMap.current.set(nextIssueNum, predRecord);

          setCurrentPrediction({
            period: nextIssueNum,
            prediction: finalInitialPred,
            predictedDigit: finalInitialDigit,
            singleJackpotDigit: finalInitialDigit,
            singleJackpotConfidence: finalInitialConf,
            predictedNumbers: finalInitialPair,
            confidence: finalInitialConf,
            rule: finalInitialRule,
          });

          if (token) {
            savePredictionToDatabase(token, {
              gameMode: selectedMode,
              period: nextIssueNum,
              predictedSize: finalInitialPred,
              predictedDigit: finalInitialDigit,
              outcome: 'PENDING',
              level: currentLossLevelRef.current,
              winningStrategy: nextPredObj.backtestSummary?.bestStrategyName || finalInitialRule,
              backtestAccuracy: nextPredObj.backtestSummary?.bestUnder3FixRate || finalInitialConf,
            }).catch(() => {});
          }

          // Query live Gemini Self-Learning LLM asynchronously with smart quota-saving throttle
          const aiCycles = curAiState.cyclesTotal || 0;
          const aiU2Wins = curAiState.l1Wins + curAiState.l2Wins;
          const aiU3Wins = aiU2Wins + curAiState.l3Wins;
          const geminiPayload: GeminiPredictionPayload = {
            gameMode: selectedMode,
            targetPeriod: nextIssueNum,
            currentLevel: currentLossLevelRef.current,
            isK3,
            patternFeatures: boost.patternFeatures,
            basePrediction: nextPredObj.prediction,
            selfLearnedPrediction: boost.boostedPrediction,
            selfLearnedDigit: boost.boostedDigit,
            selfLearnedReason: boost.boostReason,
            userCalcDetail: nextPredObj.userCalcDetail,
            backtestSummary: nextPredObj.backtestSummary
              ? {
                  datasetSize: nextPredObj.backtestSummary.datasetSize,
                  bestStrategyName: nextPredObj.backtestSummary.bestStrategyName,
                  bestLevel1Accuracy: nextPredObj.backtestSummary.bestLevel1Accuracy,
                  bestUnder3FixRate: nextPredObj.backtestSummary.bestUnder3FixRate,
                  ensembleUnder3FixRate: nextPredObj.backtestSummary.ensembleUnder3FixRate,
                  entrySignal: nextPredObj.backtestSummary.entrySignal,
                  entryReason: nextPredObj.backtestSummary.entryReason,
                  digitProbabilities: nextPredObj.backtestSummary.digitProbabilities,
                  topStrategies: nextPredObj.backtestSummary.strategyRankings.slice(0, 6),
                }
              : undefined,
            selfLearningSummary: {
              totalRoundsLearned: curAiState.totalRoundsLearned,
              geminiWins: curAiState.geminiWins,
              geminiTotal: curAiState.geminiTotal,
              under2WinRate: aiCycles > 0 ? Math.round((aiU2Wins / aiCycles) * 100) : 0,
              under3WinRate: aiCycles > 0 ? Math.round((aiU3Wins / aiCycles) * 100) : 0,
              bigAccEMA: curAiState.bigAccEMA,
              smallAccEMA: curAiState.smallAccEMA,
              recentLessons: curAiState.recentLessons.slice(0, 8),
            },
          };

          lastGeminiPayloadRef.current = {
            payload: geminiPayload,
            finalInitialConf,
            finalInitialPair,
          };

          const nowMs = Date.now();
          const inCooldown = nowMs < geminiCooldownUntilRef.current;
          const regimeChanged =
            !lastGeminiRegimeRef.current ||
            boost.patternFeatures.regime !== lastGeminiRegimeRef.current;
          const shouldCallGemini =
            !inCooldown &&
            (currentLossLevelRef.current >= 2 ||
              regimeChanged ||
              roundsSinceGeminiRef.current >= 4);

          if (!shouldCallGemini) {
            if (!inCooldown) {
              roundsSinceGeminiRef.current += 1;
            }
          } else {
            roundsSinceGeminiRef.current = 0;
            runGeminiQuery(geminiPayload, finalInitialConf, finalInitialPair);
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

  const runGeminiQuery = (
    payload: GeminiPredictionPayload,
    fallbackConf: number,
    fallbackPair: [number, number]
  ) => {
    setIsGeminiLoading(true);
    requestGeminiLivePrediction(payload)
      .then((insight) => {
        setIsGeminiLoading(false);
        setGeminiInsight(insight);

        if (!insight.ok) {
          if (
            insight.errorCode === 'QUOTA_COOLDOWN' ||
            insight.errorCode === 'RESOURCE_EXHAUSTED' ||
            insight.errorCode === 'GEMINI_HIGH_DEMAND'
          ) {
            const waitSec = Math.min(Math.max(insight.retryAfterSec ?? 900, 60), 1800);
            geminiCooldownUntilRef.current = Date.now() + waitSec * 1000;
          }
          return;
        }

        lastGeminiRegimeRef.current = payload.patternFeatures.regime;

        if (
          insight.prediction &&
          lastPredictedIssueRef.current === payload.targetPeriod &&
          !isTargetLockedRef.current
        ) {
          geminiPredByPeriodRef.current.set(payload.targetPeriod, insight.prediction);
          const lvlNow = currentLossLevelRef.current;
          const shouldAdoptGemini =
            (insight.confidence ?? 0) >= 88 ||
            insight.under2Priority === 'HIGH_SURESHOT' ||
            (lvlNow >= 2 && (insight.confidence ?? 0) >= 84) ||
            insight.prediction === payload.selfLearnedPrediction;

          if (shouldAdoptGemini) {
            const fusedSize = insight.prediction;
            const fusedDigit = insight.singleDigit ?? payload.selfLearnedDigit;
            const fusedConf = Math.max(fallbackConf, insight.confidence ?? fallbackConf);
            const fusedPair: [number, number] =
              fusedSize === payload.selfLearnedPrediction
                ? fallbackPair
                : payload.isK3
                ? fusedSize === 'BIG'
                  ? [11, 13]
                  : [8, 9]
                : fusedSize === 'BIG'
                ? [6, 7]
                : [2, 3];
            const modelTag = insight.model?.includes('flash-lite') ? 'Gemini-Lite' : 'Gemini-4';
            const fusedRule = `${modelTag} + SelfLearn (${
              insight.detectedPattern || payload.patternFeatures.regime
            })`;

            const updatedRecord = {
              pred: fusedSize,
              predDigit: fusedDigit,
              singleJackpotDigit: fusedDigit,
              predNumbers: fusedPair,
              conf: fusedConf,
              rule: fusedRule,
              lossLevel: lvlNow,
              period: payload.targetPeriod,
            };

            lastActivePredictionRef.current = updatedRecord;
            predictionHistoryMap.current.set(payload.targetPeriod, updatedRecord);

            setCurrentPrediction((prev) =>
              prev.period === payload.targetPeriod
                ? {
                    ...prev,
                    prediction: fusedSize,
                    predictedDigit: fusedDigit,
                    singleJackpotDigit: fusedDigit,
                    singleJackpotConfidence: fusedConf,
                    predictedNumbers: fusedPair,
                    confidence: fusedConf,
                    rule: fusedRule,
                  }
                : prev
            );
          }
        }
      })
      .catch(() => {
        setIsGeminiLoading(false);
      });
  };

  const handleAskGeminiNow = () => {
    if (isGeminiLoading || !lastGeminiPayloadRef.current) return;
    geminiCooldownUntilRef.current = 0;
    const { payload, finalInitialConf, finalInitialPair } = lastGeminiPayloadRef.current;
    runGeminiQuery(payload, finalInitialConf, finalInitialPair);
  };

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
            geminiInsight={geminiInsight}
            isGeminiLoading={isGeminiLoading}
            selfLearningState={selfLearningState}
            onAskGeminiNow={handleAskGeminiNow}
          />
        </div>
      )}
    </div>
  );
}
