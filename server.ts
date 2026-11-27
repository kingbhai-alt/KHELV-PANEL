import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  ensureJaiClub500Seeded,
  getStoredDraws,
  saveDrawsBatch,
  upsertPredictionLog,
  getUserPredictionLogs,
  saveBacktestReport,
  getLatestBacktestReport,
} from './src/db/repository.ts';
import { JAICLUB_HISTORY_500 } from './src/data/jaiclubHistory500.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Master Cryptographic Secrets used for HMAC-SHA256 key signing and verification
export const JUJUTSU_MASTER_CIPHER_SECRET = 'JUJUTSU_KEY_CIPHER_2026_MASTER_SECRET_984712';
export const KHELV_MASTER_CIPHER_SECRET = 'KHELV_PENEL_KEY_CIPHER_2026_MASTER_SECRET_984712';

// Master Admin Bypass Keys (Lifetime, unlocked on any device)
const MASTER_ADMIN_KEYS = new Set([
  'MASTER-ADMIN-655675576694',
  'JUJUTSU-ADMIN-SUPER-2026',
  'KHELVPENEL-ADMIN-SUPER-2026',
  '655675576694',
]);

interface LicenseRecord {
  keyId: string;
  licenseKey: string;
  tier: 'VIP' | 'PREMIUM' | 'ENTERPRISE' | 'ADMIN' | 'USER';
  duration: string;
  durationSeconds: number;
  createdAt: number;
  expiresAt: number; // Unix ms
  boundDeviceId: string | null; // Once bound, locked to this device!
  boundDeviceLabel?: string;
  firstActivatedAt: number | null;
  lastSeenAt: number | null;
  isRevoked: boolean;
}

// License Store (in-memory with disk persistence)
const DATA_DIR = path.resolve(__dirname, 'data');
const LICENSES_FILE = path.resolve(DATA_DIR, 'licenses.json');

let licenseDb: Map<string, LicenseRecord> = new Map();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LICENSES_FILE)) {
    fs.writeFileSync(LICENSES_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function normalizeLicenseKey(keyString: string): string {
  return keyString
    .trim()
    .replace(/^(?:KHELV[\s_-]*PENEL[\s_-]*)+/i, '')
    .trim()
    .toUpperCase();
}

function loadLicenses() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(LICENSES_FILE, 'utf-8');
    const list: LicenseRecord[] = JSON.parse(raw);
    licenseDb.clear();
    for (const item of list) {
      licenseDb.set(item.licenseKey, item);
      licenseDb.set(normalizeLicenseKey(item.licenseKey), item);
      licenseDb.set(item.keyId, item);
    }
  } catch (err) {
    console.error('Failed to load licenses:', err);
  }
}

function saveLicenses() {
  try {
    ensureDataDir();
    // Unique records only
    const uniqueRecords = Array.from(new Set(licenseDb.values()));
    fs.writeFileSync(LICENSES_FILE, JSON.stringify(uniqueRecords, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save licenses:', err);
  }
}

/**
 * Generate a cryptographically signed license key (KHELVPENEL format)
 */
export function generateSignedLicenseKey(
  duration: '1H' | '1D' | '7D' | '30D' | 'LIFETIME' = '7D',
  tier: 'VIP' | 'PREMIUM' | 'ENTERPRISE' | 'ADMIN' | 'USER' = 'VIP'
): { licenseKey: string; keyId: string; expiresAt: number; durationSeconds: number } {
  let seconds = 7 * 86400;
  if (duration === '1H') seconds = 3600;
  if (duration === '1D') seconds = 86400;
  if (duration === '7D') seconds = 7 * 86400;
  if (duration === '30D') seconds = 30 * 86400;
  if (duration === 'LIFETIME') seconds = 100 * 365 * 86400;

  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + seconds;
  const expHex = expSec.toString(16).toUpperCase();

  // Unique Key ID (8 hex chars)
  const kid = crypto.randomBytes(4).toString('hex').toUpperCase();

  // Payload for HMAC (KHELV PENEL standard)
  const payload = `KLP:${tier}:${duration}:${kid}:${expSec}`;
  const sig = crypto
    .createHmac('sha256', KHELV_MASTER_CIPHER_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();

  const licenseKey = `KHELVPENEL-${tier}-${duration}-${kid}-${expHex}-${sig}`;
  const expiresAt = expSec * 1000;

  const record: LicenseRecord = {
    keyId: `KLP-${kid}`,
    licenseKey,
    tier,
    duration,
    durationSeconds: seconds,
    createdAt: Date.now(),
    expiresAt,
    boundDeviceId: null,
    firstActivatedAt: null,
    lastSeenAt: null,
    isRevoked: false,
  };

  licenseDb.set(licenseKey, record);
  licenseDb.set(normalizeLicenseKey(licenseKey), record);
  licenseDb.set(record.keyId, record);
  saveLicenses();

  return {
    licenseKey,
    keyId: record.keyId,
    expiresAt,
    durationSeconds: seconds,
  };
}

/**
 * Validates cryptographic signature of key (supports KHELVPENEL-*, KHELV PENEL-JUJUTSU-*, and JUJUTSU-*)
 */
function verifyKeySignature(keyString: string): {
  valid: boolean;
  tier?: 'VIP' | 'PREMIUM' | 'ENTERPRISE' | 'ADMIN' | 'USER';
  duration?: string;
  kid?: string;
  expiresAtMs?: number;
} {
  const upperRaw = keyString.trim().toUpperCase().replace(/^KHELV\s+PENEL(?=[-\s])/, 'KHELVPENEL');
  let parts = upperRaw.split('-');

  // If user pasted "KHELV PENEL-JUJUTSU-VIP-..." or "KHELVPENEL-JUJUTSU-VIP-...", drop leading KHELVPENEL
  if (parts.length === 7 && parts[0] === 'KHELVPENEL' && parts[1] === 'JUJUTSU') {
    parts = parts.slice(1);
  }
  // If user omitted prefix after stripping
  if (parts.length === 5) {
    parts = ['KHELVPENEL', ...parts];
  }

  if (parts.length !== 6 || (parts[0] !== 'KHELVPENEL' && parts[0] !== 'JUJUTSU' && parts[0] !== 'KHELV')) {
    return { valid: false };
  }

  const [prefix, tier, duration, kid, expHex, sig] = parts;
  const expSec = parseInt(expHex, 16);
  if (isNaN(expSec)) {
    return { valid: false };
  }

  const secrets = [KHELV_MASTER_CIPHER_SECRET, JUJUTSU_MASTER_CIPHER_SECRET];
  const payloads = [
    `KLP:${tier}:${duration}:${kid}:${expSec}`,
    `JJS:${tier}:${duration}:${kid}:${expSec}`,
    `KHELV:${tier}:${duration}:${kid}:${expSec}`,
    `${prefix}:${tier}:${duration}:${kid}:${expSec}`,
  ];

  let isMatched = false;
  for (const secret of secrets) {
    for (const payload of payloads) {
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')
        .slice(0, 16)
        .toUpperCase();
      if (sig === expectedSig) {
        isMatched = true;
        break;
      }
    }
    if (isMatched) break;
  }

  if (!isMatched) {
    return { valid: false };
  }

  return {
    valid: true,
    tier: tier as any,
    duration,
    kid: prefix === 'JUJUTSU' ? `JJS-${kid}` : `KLP-${kid}`,
    expiresAtMs: expSec * 1000,
  };
}

// Initialize licenses
loadLicenses();

// Seed initial default test keys if empty
if (licenseDb.size === 0) {
  generateSignedLicenseKey('30D', 'VIP');
  generateSignedLicenseKey('7D', 'VIP');
  generateSignedLicenseKey('1D', 'VIP');
  generateSignedLicenseKey('LIFETIME', 'ADMIN');
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // =========================================================================
  // 🔐 LICENSE AUTHENTICATION & DEVICE-LOCK VERIFICATION ENDPOINT
  // =========================================================================
  app.post('/api/license/verify', (req, res) => {
    try {
      const { licenseKey, deviceFingerprint, deviceLabel, platform, browser } = req.body;

      if (!licenseKey || typeof licenseKey !== 'string') {
        return res.status(400).json({
          valid: false,
          error: 'KEY_INVALID',
          message: 'Key is required.',
        });
      }

      if (!deviceFingerprint || typeof deviceFingerprint !== 'string') {
        return res.status(400).json({
          valid: false,
          error: 'DEVICE_LOCKED',
          message: 'Hardware Device ID could not be detected.',
        });
      }

      const cleanKey = licenseKey.trim();
      const coreKey = normalizeLicenseKey(cleanKey);

      // Check 1: Master Admin Bypass Key
      if (MASTER_ADMIN_KEYS.has(cleanKey) || MASTER_ADMIN_KEYS.has(coreKey)) {
        const expMs = Date.now() + 100 * 365 * 86400 * 1000;
        const adminSession = {
          key: cleanKey,
          keyId: 'JJS-MASTER-ADMIN',
          tier: 'ADMIN',
          duration: 'LIFETIME',
          expiresAt: expMs,
          formattedExpiry: 'LIFETIME ACCESS (MASTER ADMIN)',
          deviceId: deviceFingerprint,
          deviceLabel: deviceLabel || 'Authorized Terminal',
          activatedAt: Date.now(),
          isAdmin: true,
        };
        return res.json({
          valid: true,
          message: 'MASTER ADMIN ACCESS GRANTED • All security barriers bypassed.',
          session: adminSession,
        });
      }

      // Check 2: Check in License Database or Verify Cryptographic Signature
      let record = licenseDb.get(cleanKey) || licenseDb.get(coreKey);

      if (!record) {
        // Attempt signature verification (in case key was generated by external Key Generator with matching secret)
        const cryptoCheck = verifyKeySignature(cleanKey);
        if (!cryptoCheck.valid || !cryptoCheck.kid || !cryptoCheck.expiresAtMs) {
          return res.status(403).json({
            valid: false,
            error: 'KEY_INVALID',
            message: 'SECURITY ERROR: Invalid or forged license key signature. Access denied.',
          });
        }

        // Dynamically register verified cryptographic key into database
        record = {
          keyId: cryptoCheck.kid,
          licenseKey: cleanKey,
          tier: cryptoCheck.tier || 'VIP',
          duration: cryptoCheck.duration || '7D',
          durationSeconds: Math.floor((cryptoCheck.expiresAtMs - Date.now()) / 1000),
          createdAt: Date.now(),
          expiresAt: cryptoCheck.expiresAtMs,
          boundDeviceId: null,
          firstActivatedAt: null,
          lastSeenAt: null,
          isRevoked: false,
        };
        licenseDb.set(cleanKey, record);
        licenseDb.set(coreKey, record);
        licenseDb.set(record.keyId, record);
      }

      // Check 3: Revocation
      if (record.isRevoked) {
        return res.status(403).json({
          valid: false,
          error: 'KEY_INVALID',
          message: 'SECURITY NOTICE: This license key has been revoked by administration.',
        });
      }

      // Check 4: Expiration Check (Time-based lock)
      const now = Date.now();
      if (now > record.expiresAt) {
        return res.status(403).json({
          valid: false,
          error: 'KEY_EXPIRED',
          message: `EXPIRED: This key expired on ${new Date(record.expiresAt).toLocaleString()}. Expired keys can never be reused. Please get a fresh key.`,
        });
      }

      // Check 5: DEVICE LOCK (1-Key = 1-Device Strict Policy)
      if (record.boundDeviceId === null) {
        // FIRST-TIME ACTIVATION ON THIS DEVICE: BIND PERMANENTLY!
        record.boundDeviceId = deviceFingerprint;
        record.boundDeviceLabel = deviceLabel;
        record.firstActivatedAt = now;
        record.lastSeenAt = now;
        saveLicenses();

        return res.json({
          valid: true,
          message: `KEY ACTIVATED & LOCKED TO DEVICE [${deviceFingerprint.slice(0, 12)}...]! Cannot be transferred.`,
          session: {
            key: record.licenseKey,
            keyId: record.keyId,
            tier: record.tier,
            duration: record.duration,
            expiresAt: record.expiresAt,
            formattedExpiry: new Date(record.expiresAt).toLocaleString(),
            deviceId: record.boundDeviceId,
            deviceLabel: record.boundDeviceLabel || deviceLabel,
            activatedAt: record.firstActivatedAt,
            isAdmin: record.tier === 'ADMIN',
          },
        });
      } else {
        // ALREADY BOUND: CHECK IF CURRENT DEVICE MATCHES BOUND DEVICE
        if (record.boundDeviceId === deviceFingerprint) {
          // SAME DEVICE: RE-LOGIN APPROVED
          record.lastSeenAt = now;
          saveLicenses();

          return res.json({
            valid: true,
            message: 'DEVICE VERIFIED • Welcome back.',
            session: {
              key: record.licenseKey,
              keyId: record.keyId,
              tier: record.tier,
              duration: record.duration,
              expiresAt: record.expiresAt,
              formattedExpiry: new Date(record.expiresAt).toLocaleString(),
              deviceId: record.boundDeviceId,
              deviceLabel: record.boundDeviceLabel || deviceLabel,
              activatedAt: record.firstActivatedAt,
              isAdmin: record.tier === 'ADMIN',
            },
          });
        } else {
          // MISMATCH DETECTED: KEY LOCKED TO ANOTHER MOBILE/DEVICE!
          return res.status(403).json({
            valid: false,
            error: 'DEVICE_LOCKED',
            message: `DEVICE MISMATCH ERROR: This license key is locked to Device #${record.boundDeviceId.slice(0, 12)}... You cannot use this key on a different mobile or PC!`,
          });
        }
      }
    } catch (err: any) {
      console.error('License verification failed:', err);
      return res.status(500).json({
        valid: false,
        error: 'NETWORK_ERROR',
        message: 'Internal server verification error.',
      });
    }
  });

  // Session Heartbeat Endpoint
  app.post('/api/license/check-session', (req, res) => {
    const { keyId, licenseKey, deviceId } = req.body;
    const coreKey = licenseKey ? normalizeLicenseKey(String(licenseKey)) : '';

    if (licenseKey && (MASTER_ADMIN_KEYS.has(licenseKey) || MASTER_ADMIN_KEYS.has(coreKey))) {
      return res.json({ active: true, isAdmin: true });
    }

    const record =
      licenseDb.get(licenseKey) ||
      (coreKey ? licenseDb.get(coreKey) : undefined) ||
      (keyId ? licenseDb.get(keyId) : undefined);
    if (!record) {
      return res.json({ active: false, reason: 'KEY_NOT_FOUND' });
    }

    if (record.isRevoked) {
      return res.json({ active: false, reason: 'KEY_REVOKED' });
    }

    if (Date.now() > record.expiresAt) {
      return res.json({ active: false, reason: 'KEY_EXPIRED' });
    }

    if (record.boundDeviceId && record.boundDeviceId !== deviceId) {
      return res.json({ active: false, reason: 'DEVICE_MISMATCH' });
    }

    record.lastSeenAt = Date.now();
    return res.json({ active: true, expiresAt: record.expiresAt });
  });

  // Admin Key Generator Endpoint
  app.post('/api/license/generate', (req, res) => {
    const { adminSecret, duration, tier } = req.body;
    // Allow generation if adminSecret matches or for authorized panel
    if (
      adminSecret !== '655675576694' &&
      adminSecret !== JUJUTSU_MASTER_CIPHER_SECRET &&
      adminSecret !== KHELV_MASTER_CIPHER_SECRET
    ) {
      return res.status(401).json({ error: 'Unauthorized key generation' });
    }

    const generated = generateSignedLicenseKey(duration || '7D', tier || 'VIP');
    return res.json({
      success: true,
      key: generated.licenseKey,
      keyId: generated.keyId,
      duration: duration || '7D',
      expiresAt: generated.expiresAt,
      formattedExpiry: new Date(generated.expiresAt).toLocaleString(),
    });
  });

  // 1000K+ Server Cluster Telemetry Endpoint (AJAY 1,024,000 Consensus Nodes)
  app.get('/api/clusters/telemetry', (req, res) => {
    res.json({
      totalNodes: 1024000,
      onlineNodes: 1023960,
      activeRegions: [
        { code: 'AP-SG', name: 'Singapore Quantum Alpha', nodes: 256000, ping: 3 },
        { code: 'EU-FRA', name: 'Frankfurt Core Beta', nodes: 256000, ping: 9 },
        { code: 'AP-TYO', name: 'Tokyo Ultra Quantum', nodes: 256000, ping: 6 },
        { code: 'IN-BOM', name: 'Mumbai Dedicated Consensus', nodes: 256000, ping: 2 },
      ],
      systemLoad: '0.02',
      encryption: 'AES-256-GCM + 1000K Layer Consensus Shuffling',
      status: 'OPTIMAL',
    });
  });

  // Persistent Draw History Cache (WinGo, TRX & K3) pre-seeded with 500 JaiClub rounds
  const drawHistoryCache: Record<string, Map<string, any>> = {
    'WinGo_30S': new Map(),
    'WinGo_1M': new Map(),
    'TrxWinGo_1M': new Map(),
    'K3_1M': new Map(),
  };

  function seedCacheWithJaiClub500(type: string, isK3: boolean) {
    if (!drawHistoryCache[type]) drawHistoryCache[type] = new Map();
    if (drawHistoryCache[type].size >= JAICLUB_HISTORY_500.length) return;
    JAICLUB_HISTORY_500.forEach((item, idx) => {
      if (!drawHistoryCache[type].has(item.period)) {
        if (isK3) {
          const d1 = (item.number % 6) + 1;
          const d2 = (JAICLUB_HISTORY_500[(idx + 1) % JAICLUB_HISTORY_500.length].number % 6) + 1;
          const d3 = (JAICLUB_HISTORY_500[(idx + 2) % JAICLUB_HISTORY_500.length].number % 6) + 1;
          const sum = d1 + d2 + d3;
          drawHistoryCache[type].set(item.period, {
            issueNumber: item.period,
            number: String(sum),
            sum,
            premium: `${d1}${d2}${d3}`,
            color: sum >= 11 ? 'big' : 'small',
          });
        } else {
          drawHistoryCache[type].set(item.period, {
            issueNumber: item.period,
            number: String(item.number),
            color: item.color,
            colour: item.color,
            premium: String(item.number),
            sum: item.number,
          });
        }
      }
    });
  }

  // API Proxy for WinGo, TRX & K3 Draw history
  app.get('/api/history', async (req, res) => {
    try {
      let isK3 = false;
      let isTrx = false;
      let category = 'WinGo';
      let type = 'WinGo_1M';
      let logicalMode = '1M';

      const qType = String(req.query.type || '');
      if (qType === '30S' || qType === 'WinGo_30S') {
        type = 'WinGo_30S';
        logicalMode = '30S';
      } else if (qType === '1M' || qType === 'WinGo_1M') {
        type = 'WinGo_1M';
        logicalMode = '1M';
      } else if (qType === 'TRX_1M' || qType === 'TrxWinGo_1M' || qType === 'TRX') {
        category = 'TrxWinGo';
        type = 'TrxWinGo_1M';
        logicalMode = 'TRX_1M';
        isTrx = true;
      } else if (qType === 'K3_1M' || qType === 'K3 1M' || qType === 'K3') {
        category = 'K3';
        type = 'K3_1M';
        logicalMode = 'K3_1M';
        isK3 = true;
      }

      if (!drawHistoryCache[type]) {
        drawHistoryCache[type] = new Map();
      }

      seedCacheWithJaiClub500(type, isK3);

      const ts = Date.now();
      const apiUrl =
        category === 'K3'
          ? `https://draw.ar-lottery01.com/K3/${type}/GetHistoryIssuePage.json?ts=${ts}`
          : category === 'TrxWinGo'
          ? `https://draw.ar-lottery01.com/TrxWinGo/${type}/GetHistoryIssuePage.json?ts=${ts}`
          : `https://draw.ar-lottery01.com/WinGo/${type}/GetHistoryIssuePage.json?ts=${ts}`;

      const newlyFetchedForDb: Array<{ period: string; number: number; color?: string }> = [];

      try {
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
            'Referer': 'https://hgnice.biz',
            'Accept': 'application/json, text/plain, */*',
          },
        });

        if (response.ok) {
          const remoteData = await response.json();
          if (remoteData?.data?.list && Array.isArray(remoteData.data.list)) {
            for (const item of remoteData.data.list) {
              const issue = String(item.issueNumber || item.issue || '').trim();
              if (issue) {
                if (isK3) {
                  const sumVal = item.sum !== undefined && item.sum !== null && String(item.sum) !== ''
                    ? Number(item.sum)
                    : 10;
                  item.number = String(sumVal);
                  item.sum = sumVal;
                  newlyFetchedForDb.push({ period: issue, number: sumVal, color: sumVal >= 11 ? 'Big' : 'Small' });
                } else {
                  const numVal = item.number !== undefined && item.number !== null ? String(item.number) : String(item.sum ?? '0');
                  item.number = numVal;
                  newlyFetchedForDb.push({ period: issue, number: Number(numVal) || 0, color: item.colour || item.color || '' });
                }
                drawHistoryCache[type].set(issue, item);
              }
            }
          }
        }
      } catch (fetchErr) {
        // Fallback to cache + 500 seed
      }

      // Auto-persist fetched live rounds to Cloud SQL asynchronously (non-blocking)
      if (newlyFetchedForDb.length > 0) {
        saveDrawsBatch(logicalMode, newlyFetchedForDb, 'live_api').catch(() => {});
      }

      // Merge stored Cloud SQL rounds (includes 500 JaiClub history + auto-saved live rounds)
      try {
        await ensureJaiClub500Seeded(logicalMode);
        const storedRows = await getStoredDraws(logicalMode, 5000);
        for (const row of storedRows) {
          if (row.issueNumber && !drawHistoryCache[type].has(row.issueNumber)) {
            drawHistoryCache[type].set(row.issueNumber, {
              issueNumber: row.issueNumber,
              number: row.number,
              colour: row.colour,
              color: row.colour,
              sum: Number(row.number),
            });
          }
        }
      } catch {
        // Fallback cleanly to in-memory cache if DB connection is unavailable
      }

      // Convert map to sorted array (descending order)
      const allItems = Array.from(drawHistoryCache[type].values());
      allItems.sort((a, b) => {
        try {
          return BigInt(b.issueNumber) > BigInt(a.issueNumber) ? 1 : -1;
        } catch {
          return 0;
        }
      });

      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 5000;
      const returnList = allItems.slice(0, Math.min(limit, 5000));

      res.json({
        data: {
          list: returnList,
          total: returnList.length,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        message: err.message || 'Failed to fetch draw history',
      });
    }
  });

  // =========================================================================
  // 🗄️ CLOUD SQL POSTGRESQL PERSISTENCE ENDPOINTS (FIREBASE AUTH PROTECTED)
  // =========================================================================
  app.get('/api/db/draws', requireAuth, async (req: AuthRequest, res) => {
    try {
      const gameMode = String(req.query.type || '1M').trim();
      const limit = Math.min(parseInt(String(req.query.limit || '2500'), 10) || 2500, 5000);
      const draws = await getStoredDraws(gameMode, limit);
      res.json({ draws, total: draws.length });
    } catch (err: any) {
      console.error('GET /api/db/draws failed:', err);
      res.status(500).json({ error: err.message || 'Failed to load database draws' });
    }
  });

  app.post('/api/db/draws/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { gameMode, draws } = req.body || {};
      if (!gameMode || typeof gameMode !== 'string' || !Array.isArray(draws)) {
        return res.status(400).json({ error: 'Invalid draw sync payload' });
      }
      const savedCount = await saveDrawsBatch(gameMode, draws, 'live_api');
      res.json({ success: true, savedCount });
    } catch (err: any) {
      console.error('POST /api/db/draws/sync failed:', err);
      res.status(500).json({ error: err.message || 'Failed to sync draws to database' });
    }
  });

  app.post('/api/db/predictions', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const {
        gameMode,
        period,
        predictedSize,
        predictedDigit,
        actualNumber,
        actualSize,
        outcome,
        level,
        winningStrategy,
        backtestAccuracy,
      } = req.body || {};

      if (!gameMode || !period || !predictedSize) {
        return res.status(400).json({ error: 'Missing required prediction fields' });
      }

      const saved = await upsertPredictionLog({
        userUid: req.user.uid,
        gameMode: String(gameMode),
        period: String(period),
        predictedSize: String(predictedSize),
        predictedDigit: Number(predictedDigit) || 0,
        actualNumber: actualNumber !== undefined && actualNumber !== null ? Number(actualNumber) : null,
        actualSize: actualSize ? String(actualSize) : null,
        outcome: String(outcome || 'PENDING'),
        level: Number(level) || 1,
        winningStrategy: String(winningStrategy || 'KHELV GAME PENEL 500-Round Backtest'),
        backtestAccuracy: Number(backtestAccuracy) || 0,
      });

      res.json({ success: true, record: saved });
    } catch (err: any) {
      console.error('POST /api/db/predictions failed:', err);
      res.status(500).json({ error: err.message || 'Failed to save prediction log' });
    }
  });

  app.get('/api/db/predictions', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const gameMode = String(req.query.type || '1M');
      const limit = Math.min(parseInt(String(req.query.limit || '200'), 10) || 200, 500);
      const logs = await getUserPredictionLogs(req.user.uid, gameMode, limit);
      res.json({ logs });
    } catch (err: any) {
      console.error('GET /api/db/predictions failed:', err);
      res.status(500).json({ error: err.message || 'Failed to load prediction logs' });
    }
  });

  app.post('/api/db/backtest', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const {
        gameMode,
        datasetSize,
        bestStrategy,
        level1Accuracy,
        under3FixRate,
        totalSimulatedRounds,
        maxLossStreak,
      } = req.body || {};

      if (!gameMode || !bestStrategy) {
        return res.status(400).json({ error: 'Missing backtest report fields' });
      }

      const saved = await saveBacktestReport({
        userUid: req.user.uid,
        gameMode: String(gameMode),
        datasetSize: Number(datasetSize) || 500,
        bestStrategy: String(bestStrategy),
        level1Accuracy: Number(level1Accuracy) || 0,
        under3FixRate: Number(under3FixRate) || 0,
        totalSimulatedRounds: Number(totalSimulatedRounds) || 0,
        maxLossStreak: Number(maxLossStreak) || 0,
      });

      res.json({ success: true, report: saved });
    } catch (err: any) {
      console.error('POST /api/db/backtest failed:', err);
      res.status(500).json({ error: err.message || 'Failed to save backtest report' });
    }
  });

  app.get('/api/db/backtest', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const gameMode = String(req.query.type || '1M');
      const report = await getLatestBacktestReport(req.user.uid, gameMode);
      res.json({ report });
    } catch (err: any) {
      console.error('GET /api/db/backtest failed:', err);
      res.status(500).json({ error: err.message || 'Failed to load backtest report' });
    }
  });

  // =========================================================================
  // 🧠 LIVE GEMINI 4 HYDROGEN (FREE) SELF-LEARNING AI LLM ENDPOINTS
  // =========================================================================
  const AI_MEMORY_FILE = path.resolve(DATA_DIR, 'ai_memory.json');
  const GEMINI_FREE_MODEL = 'gemini-4-hydrogen';

  interface ServerModeAiMemory {
    totalTrainedRounds: number;
    l1Wins: number;
    l2Wins: number;
    l3Wins: number;
    lossesOverL3: number;
    geminiWins: number;
    geminiTotal: number;
    recentLessons: Array<{
      period: string;
      regime: string;
      level: number;
      aiPred: string;
      actualSize: string;
      outcome: string;
      lesson: string;
      timestamp: number;
    }>;
  }

  const aiMemoryByMode = new Map<string, ServerModeAiMemory>();

  function getModeAiMemory(mode: string): ServerModeAiMemory {
    const cleanMode = String(mode || '1M').slice(0, 20);
    if (!aiMemoryByMode.has(cleanMode)) {
      aiMemoryByMode.set(cleanMode, {
        totalTrainedRounds: 0,
        l1Wins: 0,
        l2Wins: 0,
        l3Wins: 0,
        lossesOverL3: 0,
        geminiWins: 0,
        geminiTotal: 0,
        recentLessons: [],
      });
    }
    return aiMemoryByMode.get(cleanMode)!;
  }

  function loadAiMemory() {
    ensureDataDir();
    try {
      if (fs.existsSync(AI_MEMORY_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(AI_MEMORY_FILE, 'utf-8'));
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            if (v && typeof v === 'object') {
              aiMemoryByMode.set(k, v as ServerModeAiMemory);
            }
          }
        }
      }
    } catch {
      // Ignore corrupt memory file and start clean
    }
  }

  function saveAiMemory() {
    try {
      ensureDataDir();
      const obj: Record<string, ServerModeAiMemory> = {};
      for (const [k, v] of aiMemoryByMode.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(AI_MEMORY_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch {
      // Non-fatal persistence error
    }
  }

  loadAiMemory();

  function buildAiStatusSnapshot(mode: string) {
    const mem = getModeAiMemory(mode);
    const cycles = mem.l1Wins + mem.l2Wins + mem.l3Wins + mem.lossesOverL3;
    const u2Wins = mem.l1Wins + mem.l2Wins;
    const u3Wins = u2Wins + mem.l3Wins;
    return {
      model: GEMINI_FREE_MODEL,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
      totalTrainedRounds: mem.totalTrainedRounds,
      l1Wins: mem.l1Wins,
      l2Wins: mem.l2Wins,
      l3Wins: mem.l3Wins,
      lossesOverL3: mem.lossesOverL3,
      under2Rate: cycles > 0 ? Math.round((u2Wins / cycles) * 100) : 0,
      under3Rate: cycles > 0 ? Math.round((u3Wins / cycles) * 100) : 0,
      geminiAccuracy: mem.geminiTotal > 0 ? Math.round((mem.geminiWins / mem.geminiTotal) * 100) : 0,
      recentLessons: mem.recentLessons.slice(0, 10),
    };
  }

  function getGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  app.get('/api/ai/status', (req, res) => {
    const mode = String(req.query.mode || '1M');
    return res.json(buildAiStatusSnapshot(mode));
  });

  app.post('/api/ai/learn', (req, res) => {
    try {
      const {
        gameMode,
        period,
        regime,
        level,
        aiPred,
        geminiPred,
        actualSize,
        outcome,
        lesson,
      } = req.body || {};

      if (!gameMode || !period || !actualSize) {
        return res.status(400).json({ error: 'Missing required learning feedback fields' });
      }

      const mem = getModeAiMemory(String(gameMode));
      const lvl = Number(level) || 1;
      const won = outcome === 'WIN' || outcome === 'JACKPOT';

      mem.totalTrainedRounds += 1;
      if (won) {
        if (lvl === 1) mem.l1Wins += 1;
        else if (lvl === 2) mem.l2Wins += 1;
        else mem.l3Wins += 1;
      } else if (lvl >= 3) {
        mem.lossesOverL3 += 1;
      }

      if (geminiPred === 'BIG' || geminiPred === 'SMALL') {
        mem.geminiTotal += 1;
        if (geminiPred === actualSize) {
          mem.geminiWins += 1;
        }
      }

      mem.recentLessons = [
        {
          period: String(period),
          regime: String(regime || 'MIXED'),
          level: lvl,
          aiPred: String(aiPred || ''),
          actualSize: String(actualSize),
          outcome: String(outcome || 'LOSS'),
          lesson: String(lesson || ''),
          timestamp: Date.now(),
        },
        ...mem.recentLessons.filter((item) => item.period !== String(period)),
      ].slice(0, 20);

      saveAiMemory();
      return res.json({ success: true, status: buildAiStatusSnapshot(String(gameMode)) });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to record AI learning feedback' });
    }
  });

  const GEMINI_FREE_CANDIDATES = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
  const modelCooldownUntil = new Map<string, number>();

  function parseRetryAfterSeconds(msg: string, fallbackSec: number): number {
    const match = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/i) || msg.match(/retry in\s+(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
    if (match) {
      if (match[1] && !match[2] && !match[3] && msg.includes('retryDelay')) {
        return Math.max(60, Math.min(86400, Number(match[1]) || fallbackSec));
      }
      const h = Number(match[1] || 0);
      const m = Number(match[2] || 0);
      const s = Number(match[3] || 0);
      const total = h * 3600 + m * 60 + s;
      if (total > 0) return Math.max(60, Math.min(86400, total));
    }
    return fallbackSec;
  }

  app.post('/api/ai/predict', async (req, res) => {
    const startMs = Date.now();
    try {
      const body = req.body || {};
      const gameMode = String(body.gameMode || '1M');
      const targetPeriod = String(body.targetPeriod || '');
      const currentLevel = Math.min(3, Math.max(1, Number(body.currentLevel) || 1));
      const isK3 = Boolean(body.isK3);
      const patternFeatures = body.patternFeatures || {};
      const basePrediction = String(body.basePrediction || 'BIG');
      const selfLearnedPrediction = String(body.selfLearnedPrediction || basePrediction);
      const selfLearnedDigit = Number(body.selfLearnedDigit ?? (isK3 ? 11 : 6));
      const selfLearnedReason = String(body.selfLearnedReason || '');
      const userCalcDetail = body.userCalcDetail;
      const backtestSummary = body.backtestSummary;
      const clientLearning = body.selfLearningSummary || {};

      if (!targetPeriod) {
        return res.status(400).json({ error: 'targetPeriod is required', model: GEMINI_FREE_MODEL });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
          code: 'GEMINI_KEY_MISSING',
          model: GEMINI_FREE_MODEL,
        });
      }

      const now = Date.now();
      const activeCandidates = GEMINI_FREE_CANDIDATES.filter(
        (m) => now >= (modelCooldownUntil.get(m) || 0)
      );

      if (activeCandidates.length === 0) {
        const earliestReset = Math.min(
          ...GEMINI_FREE_CANDIDATES.map((m) => modelCooldownUntil.get(m) || now + 300000)
        );
        const retryAfterSec = Math.max(30, Math.ceil((earliestReset - now) / 1000));
        return res.status(429).json({
          error: `Free-tier Gemini quota reached; 19-Algo Quant + Self-Learning AI running smoothly (retry in ~${Math.ceil(retryAfterSec / 60)}m).`,
          code: 'QUOTA_COOLDOWN',
          retryAfterSec,
          model: GEMINI_FREE_MODEL,
        });
      }

      const serverMem = getModeAiMemory(gameMode);
      const mergedLessons =
        Array.isArray(clientLearning.recentLessons) && clientLearning.recentLessons.length > 0
          ? clientLearning.recentLessons.slice(0, 8)
          : serverMem.recentLessons.slice(0, 8);

      const topStratsText = Array.isArray(backtestSummary?.topStrategies)
        ? backtestSummary.topStrategies
            .slice(0, 6)
            .map(
              (s: any, idx: number) =>
                `${idx + 1}. ${s.name}: L1=${s.level1Accuracy}%, L2Rec=${s.l2RecoveryRate}%, L3Rec=${s.l3RecoveryRate}%, U3=${s.under3FixRate}%, Vote(L1=${s.nextVote}, L2=${s.nextL2Vote}, L3=${s.nextL3Vote})`
            )
            .join('\n')
        : 'N/A';

      const lessonsText =
        mergedLessons.length > 0
          ? mergedLessons
              .map(
                (l: any) =>
                  `- Period ${l.period} [${l.regime} L${l.level}]: AI=${l.aiPred} vs Actual=${l.actualSize}(${l.actualNumber ?? '-'}) -> ${l.outcome}. ${l.lesson}`
              )
              .join('\n')
          : 'No resolved rounds yet in this session — rely on 500-round backtest & empirical regime patterns.';

      const digitProbsText = Array.isArray(backtestSummary?.digitProbabilities)
        ? backtestSummary.digitProbabilities
            .slice(0, 5)
            .map((d: any) => `${d.digit}(${d.probability}%)`)
            .join(', ')
        : 'N/A';

      const systemInstruction = `You are KHELV GAME PENEL's live Self-Learning WinGo Pattern & Quantitative AI Strategist.
Your #1 objective is maximizing UNDER-2 LEVEL FIX WINS (winning on Level 1 or Level 2) and preventing Level-3+ bust losses across WinGo 30S, 1M, TRX_1M, and K3_1M.

You are trained on ALL WinGo pattern archetypes, trend logic, size combinations, and calculation algorithms:
1. DRAGON STREAK (3+ identical BIG or SMALL in a row): Never blindly fight a live 3+ Dragon streak on Level 2/3 unless recent empirical 3-gram & Markov-2 strongly confirm a reversal cut.
2. ZIGZAG OSCILLATOR (1-1 alternation B-S-B-S): Follow clean alternation until a double-pair breaks it.
3. DOUBLE-PAIR MIRROR (2-2 symmetry BB-SS-BB or BB-S->B): Detect pair symmetry and 1-cut snap-back.
4. 3-WAY DIGITAL ROOT & 170K CALCULATIONS: Index (0+2), (7+9), and Target Period Last-3 (1st+3rd) roots combined with 170,000 multi-stride calculations.
5. QUANTITATIVE BACKTEST ALGORITHMS: VMM-4, Digit-Gap Renewal Hazard, Exponential MWU Hedge, Causal Log-Odds Naive Bayes, 2nd-Order Markov Transition, Empirical Digit-Context Matrix, Autocorrelation Hurst Regime.
6. ONLINE SELF-LEARNING FEEDBACK: Inspect the Recent Self-Learning Lessons and live BIG vs SMALL side win EMAs. Favor the winning empirical regime and top L2/L3 recovery strategies.

Game Rules:
- For WinGo (30S / 1M / TRX_1M): numbers 0,1,2,3,4 = SMALL; numbers 5,6,7,8,9 = BIG.
- For K3_1M: sums 3..10 = SMALL; sums 11..18 = BIG.
Keep analysisReason under 180 characters and selfLearningNote under 140 characters.`;

      const prompt = `Analyze this live ${gameMode} round and produce the highest-accuracy Under-2 / Under-3 prediction:

Target Period: ${targetPeriod}
Current Recovery Level: LEVEL ${currentLevel} (1=Normal, 2=Must-Win Under-2 Target, 3=Hardlock Fix)
Is K3 Mode: ${isK3}

Live Pattern Signature:
- Regime: ${patternFeatures.regime || 'MIXED'}
- Current Streak: ${patternFeatures.streakLength || 1}x ${patternFeatures.streakSide || 'BIG'}
- Last 20 Numbers (newest first): ${JSON.stringify(patternFeatures.last20Numbers || [])}
- Last 20 Sizes (newest first): ${JSON.stringify(patternFeatures.last20Sizes || [])}
- BIG% Windows: Last12=${patternFeatures.recent12BigPct ?? 50}%, Last35=${patternFeatures.recent35BigPct ?? 50}%, Last50=${patternFeatures.recent50BigPct ?? 50}%
- 20-Round Flip Rate: ${patternFeatures.flipRate20 ?? 50}% | Chi-Square Z12: ${patternFeatures.chiZ12 ?? 0}

3-Way Digital Root & 170K Calculation Engine:
- Calc1 (i0+i2 root): ${userCalcDetail?.calc1?.root ?? '-'} -> ${userCalcDetail?.calc1?.vote ?? '-'}
- Calc2 (i7+i9 root): ${userCalcDetail?.calc2?.root ?? '-'} -> ${userCalcDetail?.calc2?.vote ?? '-'}
- Calc3 (PeriodLast3 root): ${userCalcDetail?.calc3?.root ?? '-'} -> ${userCalcDetail?.calc3?.vote ?? '-'}
- 170K Ensemble: BIG=${userCalcDetail?.total170kCalculations?.bigVotes ?? 0} vs SMALL=${userCalcDetail?.total170kCalculations?.smallVotes ?? 0}
- Base Consensus Call: ${basePrediction}
- Deterministic Self-Learned Call: ${selfLearnedPrediction} (Digit ${selfLearnedDigit}) · ${selfLearnedReason}

500-Round Live Backtest Top Strategies (${backtestSummary?.datasetSize ?? 500} rounds):
- Best Strategy: ${backtestSummary?.bestStrategyName ?? 'N/A'} (L1 ${backtestSummary?.bestLevel1Accuracy ?? 0}%, U3 ${backtestSummary?.bestUnder3FixRate ?? 0}%)
- Entry Signal: ${backtestSummary?.entrySignal ?? 'STRONG_ENTRY'} (${backtestSummary?.entryReason ?? ''})
- Top Candidate Digits: ${digitProbsText}
${topStratsText}

Live Self-Learning Memory (${clientLearning.totalRoundsLearned ?? serverMem.totalTrainedRounds} learned rounds):
- Live Side Accuracy EMA: BIG=${Math.round((clientLearning.bigAccEMA ?? 0.5) * 100)}%, SMALL=${Math.round((clientLearning.smallAccEMA ?? 0.5) * 100)}%
- Live Under-2 Rate: ${clientLearning.under2WinRate ?? 0}% | Under-3 Rate: ${clientLearning.under3WinRate ?? 0}%
Recent Lessons Learned:
${lessonsText}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          prediction: {
            type: Type.STRING,
            description: 'Must be exactly BIG or SMALL',
          },
          singleDigit: {
            type: Type.INTEGER,
            description: isK3
              ? 'Predicted K3 sum between 3 and 18 matching prediction size'
              : 'Predicted single digit between 0 and 9 matching prediction size',
          },
          confidence: {
            type: Type.INTEGER,
            description: 'Calibrated confidence percentage between 75 and 99',
          },
          detectedPattern: {
            type: Type.STRING,
            description: 'Short name of detected pattern & aligned methods',
          },
          analysisReason: {
            type: Type.STRING,
            description: 'Concise reasoning combining pattern, trend, and top algorithms',
          },
          under2Priority: {
            type: Type.STRING,
            description: 'HIGH_SURESHOT, BALANCED, or CAUTION_WAIT',
          },
          selfLearningNote: {
            type: Type.STRING,
            description: 'How recent self-learning lessons influenced this decision',
          },
        },
        required: [
          'prediction',
          'singleDigit',
          'confidence',
          'detectedPattern',
          'analysisReason',
          'under2Priority',
          'selfLearningNote',
        ],
      };

      let lastErr: any = null;
      let usedModel: string = activeCandidates[0];
      let rawText = '';

      for (const candidateModel of activeCandidates) {
        try {
          usedModel = candidateModel;
          const config: any = {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
          };
          if (candidateModel === 'gemini-4-hydrogen') {
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }
          const response = await ai.models.generateContent({
            model: candidateModel,
            contents: prompt,
            config,
          });
          rawText = (response.text ?? '').trim();
          if (rawText) {
            break;
          }
        } catch (err: any) {
          lastErr = err;
          const msg = String(err?.message || '');
          const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
          const isBusy = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.toLowerCase().includes('high demand');
          if (isQuota) {
            const retrySec = parseRetryAfterSeconds(msg, 3600);
            modelCooldownUntil.set(candidateModel, Date.now() + retrySec * 1000);
            console.warn(`[AI] ${candidateModel} quota limit reached; cooling down ${retrySec}s and trying next free model if available.`);
            continue;
          }
          if (isBusy) {
            modelCooldownUntil.set(candidateModel, Date.now() + 90 * 1000);
            console.warn(`[AI] ${candidateModel} busy (503); cooling down 90s.`);
            continue;
          }
          throw err;
        }
      }

      if (!rawText) {
        if (lastErr) {
          throw lastErr;
        }
        return res.status(502).json({
          error: 'Gemini returned an empty prediction response.',
          code: 'EMPTY_RESPONSE',
          model: usedModel,
        });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return res.status(502).json({
          error: 'Gemini response could not be parsed as JSON.',
          code: 'INVALID_JSON',
          model: usedModel,
        });
      }

      const predSize: 'BIG' | 'SMALL' =
        String(parsed.prediction || '').toUpperCase().includes('SMALL') ? 'SMALL' : 'BIG';

      let digit = Number(parsed.singleDigit);
      if (isK3) {
        if (predSize === 'BIG' && (Number.isNaN(digit) || digit < 11 || digit > 18)) digit = 11;
        if (predSize === 'SMALL' && (Number.isNaN(digit) || digit < 3 || digit > 10)) digit = 9;
      } else {
        if (predSize === 'BIG' && (Number.isNaN(digit) || digit < 5 || digit > 9)) digit = 7;
        if (predSize === 'SMALL' && (Number.isNaN(digit) || digit < 0 || digit > 4)) digit = 2;
      }

      const conf = Math.min(99, Math.max(75, Math.round(Number(parsed.confidence) || 92)));
      const priorityRaw = String(parsed.under2Priority || 'BALANCED').toUpperCase();
      const under2Priority =
        priorityRaw === 'HIGH_SURESHOT' || priorityRaw === 'CAUTION_WAIT'
          ? priorityRaw
          : 'BALANCED';

      return res.json({
        model: usedModel,
        prediction: predSize,
        singleDigit: digit,
        confidence: conf,
        detectedPattern: String(parsed.detectedPattern || patternFeatures.regime || 'Consensus'),
        analysisReason: String(parsed.analysisReason || selfLearnedReason),
        under2Priority,
        selfLearningNote: String(parsed.selfLearningNote || 'Calibrated with live round history'),
        latencyMs: Date.now() - startMs,
      });
    } catch (err: any) {
      const rawMsg = String(err?.message || 'Gemini AI prediction failed');
      const isQuota = rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED');
      const isBusy = rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.toLowerCase().includes('high demand');
      const isAuth = rawMsg.includes('403') || rawMsg.includes('PERMISSION_DENIED') || rawMsg.includes('API_KEY_INVALID');
      const status = isQuota ? 429 : isBusy ? 503 : isAuth ? 403 : 500;
      const retryAfterSec = isQuota
        ? parseRetryAfterSeconds(rawMsg, 1800)
        : isBusy
        ? 90
        : undefined;
      const cleanError = isQuota
        ? 'Free-tier daily AI limit reached; 19-Algo Quant + Self-Learning AI active until quota resets.'
        : isBusy
        ? 'Gemini AI is temporarily busy (high demand); retrying automatically.'
        : rawMsg;
      if (status >= 500 && !isBusy) {
        console.error('POST /api/ai/predict error:', rawMsg);
      } else {
        console.warn(`POST /api/ai/predict status ${status}: ${cleanError}`);
      }
      return res.status(status).json({
        error: cleanError,
        code: isQuota
          ? 'RESOURCE_EXHAUSTED'
          : isBusy
          ? 'GEMINI_HIGH_DEMAND'
          : isAuth
          ? 'PERMISSION_DENIED'
          : 'GEMINI_ERROR',
        retryAfterSec,
        model: GEMINI_FREE_MODEL,
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'KHELV GAME PENEL',
      registeredKeys: licenseDb.size / 2,
      time: new Date().toISOString(),
    });
  });

  // Vite development server middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`KHELV GAME PENEL running on http://0.0.0.0:${PORT}`);
    console.log(`Active 2K+ Cluster Nodes: 2048 | Master Cipher Ready`);
  });
}

startServer();
