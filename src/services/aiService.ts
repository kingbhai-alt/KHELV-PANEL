import { LicenseSession, getMemoryAuthToken } from './licenseService';

export interface AiMemorySummary {
  totalLearnedRounds: number;
  aiEvaluatedRounds: number;
  aiWinRate: number;
  aiUnder2Rate: number;
  lessonsCount: number;
  latestLesson: string;
  topLearnedStrategies: Array<{ id: string; weight: number }>;
}

export interface AiProviderStatus {
  id: string;
  provider: string;
  model: string;
  label: string;
  configured: boolean;
  coolingDown: boolean;
  cooldownRemainingSec: number;
}

export interface LiveAiPrediction {
  provider: string;
  model: string;
  providerLabel: string;
  cached?: boolean;
  prediction: 'BIG' | 'SMALL';
  confidence: number;
  singleDigit: number;
  backupDigit: number;
  patternRegime: 'DRAGON_TREND' | 'ZIGZAG_CHOP' | 'DOUBLE_PAIR' | 'REVERSAL_TRAP' | 'EQUILIBRIUM';
  entryAdvice: 'FIRE_UNDER2' | 'STRONG_ENTRY' | 'CAUTION_SMALL_STAKE';
  reasoning: string;
  learnedRule: string;
  istHourLabel: string;
  hourRiskZone: 'GREEN_PRIME' | 'YELLOW_MODERATE' | 'RED_CAUTION';
  memoryStats: AiMemorySummary;
}

export interface AiInsightState {
  status: 'IDLE' | 'THINKING' | 'ACTIVE' | 'KEY_MISSING' | 'ECO_STANDBY' | 'ERROR';
  period?: string;
  prediction?: LiveAiPrediction;
  memory?: AiMemorySummary;
  providers?: AiProviderStatus[];
  configuredCount?: number;
  geminiConfigured?: boolean;
  ecoMode?: boolean;
  quotaSavedCount?: number;
  errorMessage?: string;
  errorCode?: string;
}

function buildAuthHeaders(session: LicenseSession | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = session?.authToken || getMemoryAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (session?.key) {
    headers['x-license-key'] = session.key;
  }
  if (session?.deviceId) {
    headers['x-device-id'] = session.deviceId;
  }
  return headers;
}

function parseJsonSafe(rawText: string): any {
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

export async function fetchAiMemory(session: LicenseSession | null): Promise<{
  geminiConfigured: boolean;
  configuredCount: number;
  providers: AiProviderStatus[];
  memory: AiMemorySummary | null;
}> {
  if (!session?.key || !session?.deviceId) {
    return { geminiConfigured: false, configuredCount: 0, providers: [], memory: null };
  }
  try {
    const res = await fetch('/api/ai/memory', {
      method: 'GET',
      headers: buildAuthHeaders(session),
    });
    const rawText = await res.text();
    const data = parseJsonSafe(rawText);
    if (!res.ok || !data) {
      return { geminiConfigured: false, configuredCount: 0, providers: [], memory: null };
    }
    return {
      geminiConfigured: Boolean(data.geminiConfigured),
      configuredCount: Number(data.configuredCount) || 0,
      providers: Array.isArray(data.providers) ? data.providers : [],
      memory: data.memory || null,
    };
  } catch {
    return { geminiConfigured: false, configuredCount: 0, providers: [], memory: null };
  }
}

export async function requestLiveAiPrediction(
  session: LicenseSession | null,
  payload: {
    gameMode: string;
    targetPeriod: string;
    currentLevel: 1 | 2 | 3;
    isK3: boolean;
    recentNumbers: number[];
    recentSizes: Array<'BIG' | 'SMALL'>;
    recentColors?: string[];
    localPrediction: 'BIG' | 'SMALL';
    localConfidence: number;
    localSingleDigit: number;
    strategies: Array<{
      id: string;
      name: string;
      nextVote: 'BIG' | 'SMALL';
      level1Accuracy: number;
      under3FixRate: number;
      l2RecoveryRate: number;
      l3RecoveryRate: number;
    }>;
    userRoots?: {
      calc1Root: number;
      calc1Vote: string;
      calc2Root: number;
      calc2Vote: string;
      calc3Root: number;
      calc3Vote: string;
      masterVote: string;
      big170k: number;
      small170k: number;
    };
    backtestMetrics?: {
      datasetSize: number;
      bestStrategyName: string;
      bestLevel1Accuracy: number;
      bestUnder3FixRate: number;
      gatedUnder3FixRate: number;
    };
  }
): Promise<{
  ok: boolean;
  ai?: LiveAiPrediction;
  error?: string;
  code?: string;
  memoryStats?: AiMemorySummary;
}> {
  if (!session?.key || !session?.deviceId) {
    return { ok: false, error: 'License session required', code: 'UNAUTHORIZED' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('/api/ai/predict', {
      method: 'POST',
      headers: buildAuthHeaders(session),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const rawText = await res.text();
    const data = parseJsonSafe(rawText) || {};
    if (res.ok && data.success && data.ai) {
      return { ok: true, ai: data.ai as LiveAiPrediction, memoryStats: data.ai.memoryStats };
    }

    const fallbackMsg =
      rawText && rawText.trim().startsWith('<')
        ? `Server returned non-JSON response (${res.status}). Please refresh or check Settings > Secrets.`
        : `AI service returned ${res.status}`;

    return {
      ok: false,
      error: data.error || fallbackMsg,
      code:
        data.code ||
        (res.status === 503 ? 'GEMINI_KEY_MISSING' : res.status === 401 ? 'UNAUTHORIZED' : 'AI_ERROR'),
      memoryStats: data.memoryStats,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    return {
      ok: false,
      error: isTimeout
        ? 'AI model response timed out (using local Meta-Ensemble)'
        : err?.message || 'AI connection failed',
      code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  }
}

export async function sendAiLearningOutcome(
  session: LicenseSession | null,
  payload: {
    gameMode: string;
    period: string;
    localPredictedSize: 'BIG' | 'SMALL';
    aiPredictedSize?: 'BIG' | 'SMALL';
    actualNumber: number;
    actualSize: 'BIG' | 'SMALL';
    outcome: 'WIN' | 'LOSS' | 'JACKPOT';
    level: 1 | 2 | 3;
    recentSizesBefore: Array<'BIG' | 'SMALL'>;
    winningStrategy?: string;
  }
): Promise<AiMemorySummary | null> {
  if (!session?.key || !session?.deviceId) return null;
  try {
    const res = await fetch('/api/ai/learn', {
      method: 'POST',
      headers: buildAuthHeaders(session),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.memory || null;
  } catch {
    return null;
  }
}
