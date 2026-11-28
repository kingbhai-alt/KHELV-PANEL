import { PredictionResult, UserCalculationDetail } from '../logic/jujutsuEngine';
import { BacktestSummary } from '../logic/backtestEngine';
import {
  PatternFeatures,
  SelfLearningState,
} from '../logic/aiSelfLearningEngine';

export interface GeminiPredictionPayload {
  gameMode: string;
  targetPeriod: string;
  currentLevel: number;
  isK3: boolean;
  patternFeatures: PatternFeatures;
  basePrediction: PredictionResult;
  selfLearnedPrediction: PredictionResult;
  selfLearnedDigit: number;
  selfLearnedReason: string;
  userCalcDetail?: UserCalculationDetail;
  backtestSummary?: Pick<
    BacktestSummary,
    | 'datasetSize'
    | 'bestStrategyName'
    | 'bestLevel1Accuracy'
    | 'bestUnder3FixRate'
    | 'ensembleUnder3FixRate'
    | 'entrySignal'
    | 'entryReason'
    | 'digitProbabilities'
  > & {
    topStrategies: Array<{
      id: string;
      name: string;
      level1Accuracy: number;
      l2RecoveryRate: number;
      l3RecoveryRate: number;
      under3FixRate: number;
      nextVote: PredictionResult;
      nextL2Vote: PredictionResult;
      nextL3Vote: PredictionResult;
    }>;
  };
  selfLearningSummary: {
    totalRoundsLearned: number;
    geminiWins: number;
    geminiTotal: number;
    under2WinRate: number;
    under3WinRate: number;
    bigAccEMA: number;
    smallAccEMA: number;
    recentLessons: SelfLearningState['recentLessons'];
  };
}

export interface GeminiLiveInsight {
  ok: boolean;
  model: string;
  period: string;
  prediction?: PredictionResult;
  singleDigit?: number;
  confidence?: number;
  detectedPattern?: string;
  analysisReason?: string;
  under2Priority?: 'HIGH_SURESHOT' | 'BALANCED' | 'CAUTION_WAIT';
  selfLearningNote?: string;
  error?: string;
  errorCode?: string;
  retryAfterSec?: number;
  latencyMs?: number;
}

export interface ServerAiStatus {
  model: string;
  geminiConfigured: boolean;
  totalTrainedRounds: number;
  l1Wins: number;
  l2Wins: number;
  l3Wins: number;
  lossesOverL3: number;
  under2Rate: number;
  under3Rate: number;
  geminiAccuracy: number;
  recentLessons: Array<{
    period: string;
    regime: string;
    level: number;
    aiPred: string;
    actualSize: string;
    outcome: string;
    lesson: string;
  }>;
}

export async function requestGeminiLivePrediction(
  payload: GeminiPredictionPayload
): Promise<GeminiLiveInsight> {
  try {
    const res = await fetch('/api/ai/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        model: 'gemini-4-hydrogen',
        period: payload.targetPeriod,
        error: 'Gemini AI backend route unavailable in static hosting mode.',
        errorCode: 'STATIC_NO_BACKEND',
      };
    }

    const data = await res.json();
    if (!res.ok || data.ok === false || data.fallbackActive) {
      return {
        ok: false,
        model: data.model || 'gemini-4-hydrogen',
        period: payload.targetPeriod,
        error: data.error || `Gemini AI request failed (${res.status})`,
        errorCode: data.code || 'AI_ERROR',
        retryAfterSec: typeof data.retryAfterSec === 'number' ? data.retryAfterSec : undefined,
      };
    }

    return {
      ok: true,
      model: data.model || 'gemini-4-hydrogen',
      period: payload.targetPeriod,
      prediction: data.prediction,
      singleDigit: data.singleDigit,
      confidence: data.confidence,
      detectedPattern: data.detectedPattern,
      analysisReason: data.analysisReason,
      under2Priority: data.under2Priority,
      selfLearningNote: data.selfLearningNote,
      latencyMs: data.latencyMs,
    };
  } catch (err: any) {
    return {
      ok: false,
      model: 'gemini-4-hydrogen',
      period: payload.targetPeriod,
      error: err?.message || 'Failed to connect to Gemini AI endpoint',
      errorCode: 'NETWORK_ERROR',
    };
  }
}

export async function sendSelfLearningFeedbackToServer(feedback: {
  gameMode: string;
  period: string;
  regime: string;
  level: number;
  basePred: PredictionResult;
  aiPred: PredictionResult;
  geminiPred?: PredictionResult;
  actualNumber: number;
  actualSize: PredictionResult;
  outcome: 'WIN' | 'JACKPOT' | 'LOSS';
  lesson: string;
}): Promise<ServerAiStatus | null> {
  try {
    const res = await fetch('/api/ai/learn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const json = await res.json();
    return json.status || null;
  } catch {
    return null;
  }
}

export async function fetchServerAiStatus(
  gameMode: string
): Promise<ServerAiStatus | null> {
  try {
    const res = await fetch(`/api/ai/status?mode=${encodeURIComponent(gameMode)}`);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    return await res.json();
  } catch {
    return null;
  }
}
