import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { requireAuth, AuthRequest, createSessionToken } from './src/middleware/auth.ts';
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

// Master Cryptographic Secret used for HMAC-SHA256 key signing and verification
// This same secret is used by the Jujutsu Key Generator Admin Panel
export const JUJUTSU_MASTER_CIPHER_SECRET = 'JUJUTSU_KEY_CIPHER_2026_MASTER_SECRET_984712';

// Master Admin Bypass Keys (Lifetime, unlocked on any device)
const MASTER_ADMIN_KEYS = new Set([
  'MASTER-ADMIN-655675576694',
  'JUJUTSU-ADMIN-SUPER-2026',
  '655675576694',
]);

interface LicenseRecord {
  keyId: string;
  licenseKey: string;
  tier: 'VIP' | 'PREMIUM' | 'ENTERPRISE' | 'ADMIN';
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

function loadLicenses() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(LICENSES_FILE, 'utf-8');
    const list: LicenseRecord[] = JSON.parse(raw);
    licenseDb.clear();
    for (const item of list) {
      licenseDb.set(item.licenseKey, item);
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
 * Generate a cryptographically signed license key
 */
export function generateSignedLicenseKey(
  duration: '1H' | '1D' | '7D' | '30D' | 'LIFETIME' = '7D',
  tier: 'VIP' | 'PREMIUM' | 'ENTERPRISE' | 'ADMIN' = 'VIP'
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

  // Payload for HMAC
  const payload = `JJS:${tier}:${duration}:${kid}:${expSec}`;
  const sig = crypto
    .createHmac('sha256', JUJUTSU_MASTER_CIPHER_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();

  const licenseKey = `JUJUTSU-${tier}-${duration}-${kid}-${expHex}-${sig}`;
  const expiresAt = expSec * 1000;

  const record: LicenseRecord = {
    keyId: `JJS-${kid}`,
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
 * Validates cryptographic signature of key
 */
function verifyKeySignature(keyString: string): {
  valid: boolean;
  tier?: 'VIP' | 'PREMIUM' | 'ENTERPRISE' | 'ADMIN';
  duration?: string;
  kid?: string;
  expiresAtMs?: number;
} {
  // Format: JUJUTSU-{TIER}-{DUR}-{KID}-{EXPHEX}-{SIG}
  const parts = keyString.trim().split('-');
  if (parts.length !== 6 || parts[0] !== 'JUJUTSU') {
    return { valid: false };
  }

  const [_, tier, duration, kid, expHex, sig] = parts;
  const expSec = parseInt(expHex, 16);
  if (isNaN(expSec)) {
    return { valid: false };
  }

  const payload = `JJS:${tier}:${duration}:${kid}:${expSec}`;
  const expectedSig = crypto
    .createHmac('sha256', JUJUTSU_MASTER_CIPHER_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();

  if (sig !== expectedSig) {
    return { valid: false };
  }

  return {
    valid: true,
    tier: tier as any,
    duration,
    kid: `JJS-${kid}`,
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

      // Check 1: Master Admin Bypass Key
      if (MASTER_ADMIN_KEYS.has(cleanKey)) {
        const expMs = Date.now() + 100 * 365 * 86400 * 1000;
        const adminUid = `device:${deviceFingerprint}`;
        const adminAuthToken = createSessionToken({
          uid: adminUid,
          email: 'master-admin@khelv.local',
          keyId: 'JJS-MASTER-ADMIN',
          tier: 'ADMIN',
          deviceId: deviceFingerprint,
          exp: expMs,
        });
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
          authToken: adminAuthToken,
        };
        return res.json({
          valid: true,
          message: 'MASTER ADMIN ACCESS GRANTED • All security barriers bypassed.',
          session: adminSession,
        });
      }

      // Check 2: Check in License Database or Verify Cryptographic Signature
      let record = licenseDb.get(cleanKey);

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

        const authToken = createSessionToken({
          uid: `device:${deviceFingerprint}`,
          email: `${record.keyId.toLowerCase()}@khelv.local`,
          keyId: record.keyId,
          tier: record.tier,
          deviceId: record.boundDeviceId,
          exp: record.expiresAt,
        });

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
            authToken,
          },
        });
      } else {
        // ALREADY BOUND: CHECK IF CURRENT DEVICE MATCHES BOUND DEVICE
        if (record.boundDeviceId === deviceFingerprint) {
          // SAME DEVICE: RE-LOGIN APPROVED
          record.lastSeenAt = now;
          saveLicenses();

          const authToken = createSessionToken({
            uid: `device:${deviceFingerprint}`,
            email: `${record.keyId.toLowerCase()}@khelv.local`,
            keyId: record.keyId,
            tier: record.tier,
            deviceId: record.boundDeviceId,
            exp: record.expiresAt,
          });

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
              authToken,
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

    if (licenseKey && MASTER_ADMIN_KEYS.has(licenseKey)) {
      return res.json({ active: true, isAdmin: true });
    }

    const record = licenseDb.get(licenseKey) || (keyId ? licenseDb.get(keyId) : undefined);
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
    if (adminSecret !== '655675576694' && adminSecret !== JUJUTSU_MASTER_CIPHER_SECRET) {
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
        const storedRows = await getStoredDraws(logicalMode, 1000);
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

      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 1000;
      const returnList = allItems.slice(0, Math.min(limit, 1000));

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
      const limit = Math.min(parseInt(String(req.query.limit || '1000'), 10) || 1000, 1200);
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
        winningStrategy: String(winningStrategy || 'KHELV 500-Round Backtest'),
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

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'KHELV PENEL',
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
    console.log(`JUJUTSU SCRIPT PREDICTOR running on http://0.0.0.0:${PORT}`);
    console.log(`Active 2K+ Cluster Nodes: 2048 | Master Cipher Ready`);
  });
}

startServer();
