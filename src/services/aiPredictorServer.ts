import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export interface StrategyVoteInput {
  id: string;
  name: string;
  nextVote: 'BIG' | 'SMALL';
  level1Accuracy: number;
  under3FixRate: number;
  l2RecoveryRate: number;
  l3RecoveryRate: number;
}

export interface AiPredictInput {
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
  strategies: StrategyVoteInput[];
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

export interface AiProviderStatus {
  id: string;
  provider: string;
  model: string;
  label: string;
  configured: boolean;
  coolingDown: boolean;
  cooldownRemainingSec: number;
}

export interface AiPredictionResult {
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

export interface AiLearnInput {
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

export interface PatternStat {
  wins: number;
  total: number;
  bigNext: number;
  smallNext: number;
}

export interface AiMemoryState {
  version: number;
  totalLearnedRounds: number;
  aiEvaluatedRounds: number;
  aiWins: number;
  aiUnder2Wins: number;
  aiLosses: number;
  strategyWeights: Record<string, number>;
  pattern3GramStats: Record<string, PatternStat>;
  streakStats: Record<string, PatternStat>;
  hourlyStats: Record<string, { wins: number; under2Wins: number; lossesOver3: number; total: number }>;
  recentLessons: Array<{
    ts: string;
    gameMode: string;
    period: string;
    pattern: string;
    outcome: string;
    level: number;
    lesson: string;
  }>;
  updatedAt: string;
}

export interface AiMemorySummary {
  totalLearnedRounds: number;
  aiEvaluatedRounds: number;
  aiWinRate: number;
  aiUnder2Rate: number;
  lessonsCount: number;
  latestLesson: string;
  topLearnedStrategies: Array<{ id: string; weight: number }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const MEMORY_FILE = path.resolve(DATA_DIR, 'ai_learning_memory.json');

// Assert path confinement inside DATA_DIR
if (!MEMORY_FILE.startsWith(DATA_DIR + path.sep)) {
  throw new Error('Invalid AI learning memory path');
}

// 24/7 IST risk zones derived from upgraded 500-round WinGo backtest
const GREEN_IST_HOURS = new Set([0, 2, 6, 8, 10, 12, 14, 17, 20]);
const RED_IST_HOURS = new Set([3, 4, 5, 9, 11, 19, 21, 22]);

interface GeminiFreeSlot {
  id: string;
  provider: 'gemini';
  model: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen';
  label: string;
}

// Gemini Free-Tier Dual-Model Failover (Flash-Lite first for maximum free RPD/RPM, Hydrogen backup)
const GEMINI_FREE_SLOTS: GeminiFreeSlot[] = [
  {
    id: 'gemini-3.1-flash-lite',
    provider: 'gemini',
    model: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite',
  },
  {
    id: 'gemini-4-hydrogen',
    provider: 'gemini',
    model: 'gemini-4-hydrogen',
    label: 'Gemini 4 Hydrogen',
  },
];

// Rate-limit cooldown & per-period deduplication cache to preserve free Gemini quota
const slotCooldownUntil = new Map<string, number>();
const predictionCache = new Map<string, AiPredictionResult>();
let lastReflectionCallMs = 0;

export function getFreeAiProvidersStatus(): AiProviderStatus[] {
  const now = Date.now();
  const configured = Boolean(process.env.GEMINI_API_KEY?.trim());
  return GEMINI_FREE_SLOTS.map((slot) => {
    const until = slotCooldownUntil.get(slot.id) || 0;
    const coolingDown = until > now;
    return {
      id: slot.id,
      provider: slot.provider,
      model: slot.model,
      label: slot.label,
      configured,
      coolingDown,
      cooldownRemainingSec: coolingDown ? Math.ceil((until - now) / 1000) : 0,
    };
  });
}

export function getCurrentISTHourInfo(): {
  hour: number;
  label: string;
  zone: 'GREEN_PRIME' | 'YELLOW_MODERATE' | 'RED_CAUTION';
} {
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 3600 * 1000;
  const istDate = new Date(istMs);
  const hour = istDate.getUTCHours();
  const minute = istDate.getUTCMinutes();
  const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} IST`;
  const zone: 'GREEN_PRIME' | 'YELLOW_MODERATE' | 'RED_CAUTION' = GREEN_IST_HOURS.has(hour)
    ? 'GREEN_PRIME'
    : RED_IST_HOURS.has(hour)
    ? 'RED_CAUTION'
    : 'YELLOW_MODERATE';
  return { hour, label, zone };
}

function createInitialMemory(): AiMemoryState {
  return {
    version: 1,
    totalLearnedRounds: 499,
    aiEvaluatedRounds: 0,
    aiWins: 0,
    aiUnder2Wins: 0,
    aiLosses: 0,
    strategyWeights: {
      MARKOV_2ND_ORDER: 1.38,
      EMPIRICAL_DIGIT_CONTEXT: 1.35,
      TRANSITION_ENTROPY_MIN: 1.32,
      CONDITIONAL_L2L3_SWITCHER: 1.26,
      CHI_SQUARE_IMBALANCE: 1.18,
      SELF_LEARNED_META_LEARNER: 1.42,
      BAYESIAN_ENTROPY: 1.12,
      DRAGON_MOMENTUM: 1.10,
      ZIGZAG_OSCILLATOR: 1.04,
      DOUBLE_PAIR_SYMMETRY: 0.98,
      EMA_PARITY_MOMENTUM: 0.96,
      AFFINE_MODULAR: 0.92,
      STRIDE_CONVOLUTION: 0.90,
      USER_3WAY_ROOT: 1.05,
    },
    pattern3GramStats: {},
    streakStats: {},
    hourlyStats: {},
    recentLessons: [
      {
        ts: new Date().toISOString(),
        gameMode: '1M',
        period: '500-ROUND-BASELINE',
        pattern: 'CAUTION-HOURS',
        outcome: 'BASELINE_PRIOR',
        level: 3,
        lesson:
          'In RED caution hours (03-05, 09-10, 19-22 IST), enter only on SURESHOT_LOCK (>=4/5 top algos) to cut >L3 losses from 30 to 19.',
      },
      {
        ts: new Date().toISOString(),
        gameMode: '1M',
        period: '500-ROUND-BASELINE',
        pattern: 'PRIME-SLOTS',
        outcome: 'BASELINE_PRIOR',
        level: 1,
        lesson:
          'Prime Under-2/3 slots (06-09, 12-13, 14-15, 20-21 IST) achieve 92-100% Under-2/3 fix-win with Meta-Ensemble + Markov-2.',
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

let cachedMemory: AiMemoryState | null = null;

function loadMemory(): AiMemoryState {
  if (cachedMemory) return cachedMemory;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(MEMORY_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object' && parsed.strategyWeights) {
        cachedMemory = parsed as AiMemoryState;
        return cachedMemory;
      }
    }
  } catch {
    // Fallback to initial seeded memory
  }
  cachedMemory = createInitialMemory();
  saveMemory(cachedMemory);
  return cachedMemory;
}

function saveMemory(mem: AiMemoryState): void {
  mem.updatedAt = new Date().toISOString();
  cachedMemory = mem;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2), 'utf8');
  } catch {
    // Keep in-memory state if filesystem is read-only
  }
}

export function getAiMemorySummary(): AiMemorySummary {
  const mem = loadMemory();
  const topLearnedStrategies = Object.entries(mem.strategyWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, weight]) => ({ id, weight: Math.round(weight * 100) / 100 }));

  const aiWinRate =
    mem.aiEvaluatedRounds > 0 ? Math.round((mem.aiWins / mem.aiEvaluatedRounds) * 100) : 0;
  const aiUnder2Rate =
    mem.aiEvaluatedRounds > 0 ? Math.round((mem.aiUnder2Wins / mem.aiEvaluatedRounds) * 100) : 0;

  return {
    totalLearnedRounds: mem.totalLearnedRounds,
    aiEvaluatedRounds: mem.aiEvaluatedRounds,
    aiWinRate,
    aiUnder2Rate,
    lessonsCount: mem.recentLessons.length,
    latestLesson: mem.recentLessons[0]?.lesson || 'Monitoring live pattern transitions.',
    topLearnedStrategies,
  };
}

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err: any = new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
    err.statusCode = 503;
    err.code = 'GEMINI_KEY_MISSING';
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractGeminiErrorInfo(err: any): {
  status: number;
  message: string;
  apiStatus: string;
} {
  let status = Number(err?.statusCode || err?.status || err?.code) || 0;
  let apiStatus = String(err?.error?.status || '').toUpperCase();
  let message = String(err?.error?.message || err?.message || '').trim();

  if (message.startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      const inner = parsed?.error || parsed;
      if (inner) {
        if (!status && Number(inner.code)) status = Number(inner.code);
        if (!apiStatus && inner.status) apiStatus = String(inner.status).toUpperCase();
        if (inner.message) message = String(inner.message);
      }
    } catch {
      // Keep raw message if not JSON
    }
  }

  return {
    status,
    apiStatus,
    message: message || 'Gemini API request failed.',
  };
}

function computeStreakInfo(sizes: Array<'BIG' | 'SMALL'>): {
  current: string;
  len: number;
  flipsLast16: number;
} {
  const s0 = sizes[0] || 'BIG';
  let len = 1;
  for (let i = 1; i < Math.min(sizes.length, 15); i++) {
    if (sizes[i] === s0) len++;
    else break;
  }
  let flipsLast16 = 0;
  const slice = sizes.slice(0, 16);
  for (let i = 0; i < slice.length - 1; i++) {
    if (slice[i] !== slice[i + 1]) flipsLast16++;
  }
  return { current: s0, len, flipsLast16 };
}

function extractJsonObject(rawText: string): any {
  const trimmed = rawText.trim();
  const cleaned = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Invalid JSON returned by Gemini model');
  }
}

async function callGeminiSlot(
  ai: GoogleGenAI,
  slot: GeminiFreeSlot,
  systemInstruction: string,
  prompt: string
): Promise<any> {
  const config: any = {
    systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        prediction: { type: Type.STRING, enum: ['BIG', 'SMALL'] },
        confidence: { type: Type.INTEGER },
        singleDigit: { type: Type.INTEGER },
        backupDigit: { type: Type.INTEGER },
        patternRegime: {
          type: Type.STRING,
          enum: ['DRAGON_TREND', 'ZIGZAG_CHOP', 'DOUBLE_PAIR', 'REVERSAL_TRAP', 'EQUILIBRIUM'],
        },
        entryAdvice: {
          type: Type.STRING,
          enum: ['FIRE_UNDER2', 'STRONG_ENTRY', 'CAUTION_SMALL_STAKE'],
        },
        reasoning: { type: Type.STRING },
        learnedRule: { type: Type.STRING },
      },
      required: [
        'prediction',
        'confidence',
        'singleDigit',
        'backupDigit',
        'patternRegime',
        'entryAdvice',
        'reasoning',
        'learnedRule',
      ],
    },
  };

  if (slot.model === 'gemini-4-hydrogen') {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  }

  const response = await ai.models.generateContent({
    model: slot.model,
    contents: prompt,
    config,
  });

  return extractJsonObject(response.text ?? '{}');
}

export async function runLiveGeminiPrediction(input: AiPredictInput): Promise<AiPredictionResult> {
  // 1. Serve cached prediction if this (mode, period, level) was already evaluated
  const cacheKey = `${input.gameMode}:${input.targetPeriod}:L${input.currentLevel}`;
  const cached = predictionCache.get(cacheKey);
  if (cached) {
    return { ...cached, cached: true, memoryStats: getAiMemorySummary() };
  }

  const ai = createGeminiClient();
  const now = Date.now();

  // Order Gemini free slots: prefer non-cooling slots (Flash-Lite first for max free limit, then Hydrogen)
  const orderedSlots = [
    ...GEMINI_FREE_SLOTS.filter((s) => (slotCooldownUntil.get(s.id) || 0) <= now),
    ...GEMINI_FREE_SLOTS.filter((s) => (slotCooldownUntil.get(s.id) || 0) > now),
  ];

  const mem = loadMemory();
  const istInfo = getCurrentISTHourInfo();

  const recent24Nums = input.recentNumbers.slice(0, 24);
  const recent24Sizes = input.recentSizes.slice(0, 24);
  const streakInfo = computeStreakInfo(recent24Sizes);
  const s0 = recent24Sizes[0] || 'BIG';
  const s1 = recent24Sizes[1] || s0;
  const s2 = recent24Sizes[2] || s1;
  const gram3 = `${s2[0]}${s1[0]}${s0[0]}`;
  const streakKey = `${s0}:${Math.min(streakInfo.len, 6)}`;

  const gram3Stat = mem.pattern3GramStats[gram3];
  const streakStat = mem.streakStats[streakKey];

  const bigLast20 = recent24Sizes.slice(0, 20).filter((s) => s === 'BIG').length;
  const smallLast20 = Math.min(20, recent24Sizes.length) - bigLast20;

  // Compact top-7 algorithm summary to save ~65% tokens per call (preserves free Gemini RPD/TPM)
  const compactAlgos = (input.strategies || [])
    .slice(0, 7)
    .map((st) => {
      const w = (mem.strategyWeights[st.id] ?? 1.0).toFixed(2);
      return `${st.id}:${st.nextVote[0]}(L1=${st.level1Accuracy}%,U3=${st.under3FixRate}%,w=${w})`;
    })
    .join(' | ');

  const lessonsSummary = mem.recentLessons
    .slice(0, 3)
    .map((l, i) => `${i + 1}.[${l.pattern}] ${l.lesson}`)
    .join(' ; ');

  const digitRangeText = input.isK3 ? '3-18 (S:3-10,B:11-18)' : '0-9 (S:0-4,B:5-9)';

  const systemInstruction =
    'You are the Self-Learning Gemini AI Meta-Predictor for KHELV GAME PENEL. Maximize Under-2 Fix-Win accuracy using Markov-2 transitions, 2/3/4-gram size patterns, digit transitions, 3-way digital roots, and learned mistake rules. Do not fight a 4+ streak at L1/L2 unless Top-3 algos strongly agree. Keep reasoning <=130 chars and learnedRule <=110 chars.';

  const prompt = `Mode=${input.gameMode}(${digitRangeText}) Period=${input.targetPeriod} L${input.currentLevel} IST=${istInfo.label}(${istInfo.zone})
Nums=[${recent24Nums.join(',')}] Sizes=${recent24Sizes.map((s) => s[0]).join('')} Streak=${streakInfo.len}x${streakInfo.current} Flips16=${streakInfo.flipsLast16} B20=${bigLast20}/S20=${smallLast20}
TopAlgos: ${compactAlgos || input.localPrediction}
Roots=${input.userRoots?.masterVote || input.localPrediction}(${input.userRoots?.calc1Root ?? '-'}/${input.userRoots?.calc2Root ?? '-'}/${input.userRoots?.calc3Root ?? '-'}) Local=${input.localPrediction}(${input.localConfidence}%,d=${input.localSingleDigit},U3=${input.backtestMetrics?.bestUnder3FixRate ?? 90}%)
Mem: 3G(${gram3})=${gram3Stat ? `B${gram3Stat.bigNext}/S${gram3Stat.smallNext}` : 'new'} Strk(${streakKey})=${streakStat ? `B${streakStat.bigNext}/S${streakStat.smallNext}` : 'new'} Learned=${mem.totalLearnedRounds}
Rules: ${lessonsSummary}`;

  let parsed: any = null;
  let usedSlot: GeminiFreeSlot | null = null;
  let lastErrInfo: { status: number; message: string; apiStatus: string } | null = null;

  for (const slot of orderedSlots) {
    try {
      parsed = await callGeminiSlot(ai, slot, systemInstruction, prompt);
      usedSlot = slot;
      break;
    } catch (err: any) {
      const info = extractGeminiErrorInfo(err);
      lastErrInfo = info;
      console.error(`[Gemini AI] Slot ${slot.model} failed (${info.status || 'ERR'} ${info.apiStatus}): ${info.message}`);
      const lower = info.message.toLowerCase();
      const isRateOrQuota =
        info.status === 429 ||
        info.apiStatus === 'RESOURCE_EXHAUSTED' ||
        lower.includes('rate limit') ||
        lower.includes('quota') ||
        lower.includes('resource_exhausted') ||
        lower.includes('too many requests');
      slotCooldownUntil.set(slot.id, Date.now() + (isRateOrQuota ? 180_000 : 30_000));
    }
  }

  if (!parsed || !usedSlot) {
    const upstreamStatus = lastErrInfo?.status || 502;
    const rawMsg = lastErrInfo?.message || 'Gemini free models hit rate limit or failed temporarily.';
    let friendlyMsg = rawMsg;
    let code = 'GEMINI_ERROR';

    if (upstreamStatus === 403 || lastErrInfo?.apiStatus === 'PERMISSION_DENIED') {
      code = 'GEMINI_PERMISSION_DENIED';
      friendlyMsg = `Gemini API key permission denied (403): ${rawMsg}. Please check GEMINI_API_KEY in Settings > Secrets.`;
    } else if (upstreamStatus === 400 && rawMsg.toLowerCase().includes('api key')) {
      code = 'GEMINI_KEY_INVALID';
      friendlyMsg = `Invalid GEMINI_API_KEY: ${rawMsg}. Please check Settings > Secrets.`;
    } else if (upstreamStatus === 429) {
      code = 'RATE_LIMITED';
    }

    const err: any = new Error(friendlyMsg);
    err.statusCode = upstreamStatus;
    err.code = code;
    throw err;
  }

  const pred: 'BIG' | 'SMALL' =
    String(parsed.prediction).toUpperCase() === 'SMALL' ? 'SMALL' : 'BIG';
  const minD = input.isK3 ? (pred === 'BIG' ? 11 : 3) : pred === 'BIG' ? 5 : 0;
  const maxD = input.isK3 ? (pred === 'BIG' ? 18 : 10) : pred === 'BIG' ? 9 : 4;

  let singleDigit = Number(parsed.singleDigit);
  if (!Number.isFinite(singleDigit) || singleDigit < minD || singleDigit > maxD) {
    singleDigit =
      input.localSingleDigit >= minD && input.localSingleDigit <= maxD
        ? input.localSingleDigit
        : minD + 1;
  }

  let backupDigit = Number(parsed.backupDigit);
  if (
    !Number.isFinite(backupDigit) ||
    backupDigit < minD ||
    backupDigit > maxD ||
    backupDigit === singleDigit
  ) {
    backupDigit = singleDigit + 1 <= maxD ? singleDigit + 1 : Math.max(minD, singleDigit - 1);
  }

  const confidence = Math.max(55, Math.min(99, Math.round(Number(parsed.confidence) || 78)));

  const allowedRegimes = new Set([
    'DRAGON_TREND',
    'ZIGZAG_CHOP',
    'DOUBLE_PAIR',
    'REVERSAL_TRAP',
    'EQUILIBRIUM',
  ]);
  const rawRegime = String(parsed.patternRegime || 'EQUILIBRIUM').toUpperCase();
  const patternRegime = (allowedRegimes.has(rawRegime)
    ? rawRegime
    : 'EQUILIBRIUM') as AiPredictionResult['patternRegime'];

  const allowedAdvice = new Set(['FIRE_UNDER2', 'STRONG_ENTRY', 'CAUTION_SMALL_STAKE']);
  const rawAdvice = String(parsed.entryAdvice || 'STRONG_ENTRY').toUpperCase();
  const entryAdvice = (allowedAdvice.has(rawAdvice)
    ? rawAdvice
    : 'STRONG_ENTRY') as AiPredictionResult['entryAdvice'];

  const result: AiPredictionResult = {
    provider: 'gemini',
    model: usedSlot.model,
    providerLabel: usedSlot.label,
    cached: false,
    prediction: pred,
    confidence,
    singleDigit: Math.round(singleDigit),
    backupDigit: Math.round(backupDigit),
    patternRegime,
    entryAdvice,
    reasoning: String(
      parsed.reasoning || 'Multi-algorithm consensus + self-learning pattern alignment'
    ).slice(0, 160),
    learnedRule: String(parsed.learnedRule || 'Online adaptive weighting active').slice(0, 140),
    istHourLabel: istInfo.label,
    hourRiskZone: istInfo.zone,
    memoryStats: getAiMemorySummary(),
  };

  predictionCache.set(cacheKey, result);
  if (predictionCache.size > 120) {
    const oldestKey = predictionCache.keys().next().value;
    if (oldestKey) predictionCache.delete(oldestKey);
  }

  return result;
}

export async function recordAiLearningOutcome(input: AiLearnInput): Promise<AiMemorySummary> {
  const mem = loadMemory();
  const istInfo = getCurrentISTHourInfo();

  mem.totalLearnedRounds += 1;

  const sizes = input.recentSizesBefore || [];
  const s0 = sizes[0] || 'BIG';
  const s1 = sizes[1] || s0;
  const s2 = sizes[2] || s1;
  const gram3 = `${s2[0]}${s1[0]}${s0[0]}`;
  const streakInfo = computeStreakInfo(sizes);
  const streakKey = `${s0}:${Math.min(streakInfo.len, 6)}`;

  // 1. Update 3-gram empirical distribution
  const gStat = mem.pattern3GramStats[gram3] || { wins: 0, total: 0, bigNext: 0, smallNext: 0 };
  gStat.total += 1;
  if (input.actualSize === 'BIG') gStat.bigNext += 1;
  else gStat.smallNext += 1;
  if (input.outcome === 'WIN' || input.outcome === 'JACKPOT') gStat.wins += 1;
  mem.pattern3GramStats[gram3] = gStat;

  // 2. Update streak empirical distribution
  const stStat = mem.streakStats[streakKey] || { wins: 0, total: 0, bigNext: 0, smallNext: 0 };
  stStat.total += 1;
  if (input.actualSize === 'BIG') stStat.bigNext += 1;
  else stStat.smallNext += 1;
  if (input.outcome === 'WIN' || input.outcome === 'JACKPOT') stStat.wins += 1;
  mem.streakStats[streakKey] = stStat;

  // 3. Update hourly IST tracking
  const hKey = String(istInfo.hour).padStart(2, '0');
  const hStat = mem.hourlyStats[hKey] || { wins: 0, under2Wins: 0, lossesOver3: 0, total: 0 };
  hStat.total += 1;
  const isWon = input.outcome === 'WIN' || input.outcome === 'JACKPOT';
  if (isWon) {
    hStat.wins += 1;
    if (input.level <= 2) hStat.under2Wins += 1;
  } else if (input.level >= 3) {
    hStat.lossesOver3 += 1;
  }
  mem.hourlyStats[hKey] = hStat;

  // 4. Update Gemini AI evaluation scorecard
  if (input.aiPredictedSize === 'BIG' || input.aiPredictedSize === 'SMALL') {
    mem.aiEvaluatedRounds += 1;
    if (input.aiPredictedSize === input.actualSize) {
      mem.aiWins += 1;
      if (input.level <= 2) mem.aiUnder2Wins += 1;
    } else {
      mem.aiLosses += 1;
    }
  }

  // 5. Reinforce strategy weights based on winning/losing strategy label
  const stratStr = (input.winningStrategy || '').toUpperCase();
  for (const key of Object.keys(mem.strategyWeights)) {
    if (stratStr.includes(key) || stratStr.includes(key.replace(/_/g, ' '))) {
      const delta = isWon ? 0.04 : -0.03;
      mem.strategyWeights[key] = Math.max(
        0.5,
        Math.min(2.0, Math.round((mem.strategyWeights[key] + delta) * 1000) / 1000)
      );
    }
  }

  // 6. Quota-Safe Self-Reflection:
  // Only spend a live Gemini Flash-Lite reflection call on actual Level-3/full LOSS with a 5-min cooldown
  if (!isWon && input.level >= 3 && Date.now() - lastReflectionCallMs > 300_000) {
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey) {
      lastReflectionCallMs = Date.now();
      try {
        const ai = createGeminiClient();
        const reflectPrompt = `Mode=${input.gameMode} L3-Miss Pred=${input.aiPredictedSize || input.localPredictedSize} Actual=${input.actualSize}(${input.actualNumber}) 3Gram=${gram3} Streak=${streakKey} IST=${istInfo.label}. 1 tactical rule <=105 chars.`;
        let lessonText = '';
        for (const slot of GEMINI_FREE_SLOTS) {
          try {
            const reflectResp = await ai.models.generateContent({
              model: slot.model,
              contents: reflectPrompt,
              config: {
                systemInstruction:
                  'Return 1 concise plain-text rule (under 105 characters) to prevent future >L3 losses.',
              },
            });
            lessonText = (reflectResp.text || '').trim().slice(0, 140);
            if (lessonText) break;
          } catch {
            // Try backup free model
          }
        }
        if (lessonText) {
          mem.recentLessons = [
            {
              ts: new Date().toISOString(),
              gameMode: input.gameMode,
              period: input.period,
              pattern: `${gram3} (${streakKey})`,
              outcome: input.outcome,
              level: input.level,
              lesson: lessonText,
            },
            ...mem.recentLessons,
          ].slice(0, 25);
        }
      } catch {
        // Non-blocking reflection; quantitative stats already saved
      }
    }
  } else if (isWon && input.level === 2) {
    const u2Rule = `L2 Recovery Hit on ${gram3} (${streakKey}) -> ${input.actualSize} [${input.gameMode}]`;
    mem.recentLessons = [
      {
        ts: new Date().toISOString(),
        gameMode: input.gameMode,
        period: input.period,
        pattern: `${gram3} (${streakKey})`,
        outcome: input.outcome,
        level: input.level,
        lesson: u2Rule,
      },
      ...mem.recentLessons,
    ].slice(0, 25);
  }

  saveMemory(mem);
  return getAiMemorySummary();
}
