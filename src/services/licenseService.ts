/**
 * KHELV PENEL / JUJUTSU ENCRYPTED LICENSE CLIENT SERVICE
 * Handles Key verification, device locking validation, session heartbeats, and expiry.
 * Supports both backend Express verification and standalone cryptographic verification (Vercel / static hosting).
 */

import { getDeviceFingerprint } from '../utils/deviceFingerprint';

export interface LicenseSession {
  key: string;
  keyId: string;
  tier: 'VIP' | 'PREMIUM' | 'ENTERPRISE' | 'ADMIN' | 'USER';
  duration: string;
  expiresAt: number; // Unix timestamp ms
  formattedExpiry: string;
  deviceId: string;
  deviceLabel: string;
  activatedAt: number;
  isAdmin: boolean;
  authToken?: string;
}

let inMemoryAuthToken: string | null = null;

export function getMemoryAuthToken(): string | null {
  return inMemoryAuthToken;
}

export function setMemoryAuthToken(token: string | null): void {
  inMemoryAuthToken = token;
}

export interface VerificationResponse {
  valid: boolean;
  error?: 'KEY_INVALID' | 'KEY_EXPIRED' | 'DEVICE_LOCKED' | 'RATE_LIMITED' | 'NETWORK_ERROR';
  message: string;
  session?: LicenseSession;
}

const STORAGE_SESSION_KEY = 'jujutsu_active_license_session';
const LOCAL_DEVICE_BINDINGS_KEY = 'khelv_penel_device_bindings_v1';
const MASTER_CIPHER_SECRET = 'JUJUTSU_KEY_CIPHER_2026_MASTER_SECRET_984712';
const KHELV_MASTER_CIPHER_SECRET = 'KHELV_PENEL_KEY_CIPHER_2026_MASTER_SECRET_984712';

const MASTER_ADMIN_KEYS = new Set([
  'MASTER-ADMIN-655675576694',
  'JUJUTSU-ADMIN-SUPER-2026',
  'KHELVPENEL-ADMIN-SUPER-2026',
  '655675576694',
]);

export function normalizeLicenseKey(keyString: string): string {
  return keyString
    .trim()
    .replace(/^(?:KHELV[\s_-]*PENEL[\s_-]*)+/i, '')
    .trim()
    .toUpperCase();
}

// Pure-JS SHA-256 + HMAC-SHA256 fallback (works even in non-HTTPS contexts where crypto.subtle may be absent)
function sha256Bytes(data: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const bitLen = data.length * 8;
  const padLen = ((data.length + 9 + 63) & ~63);
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  const W = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, H[i], false);
  return out;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBytes = enc.encode(secret);
  const msgBytes = enc.encode(message);

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sigBuf = await window.crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
      return Array.from(new Uint8Array(sigBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    } catch {
      // Fallback to pure-JS implementation
    }
  }

  const blockSize = 64;
  let k = keyBytes.length > blockSize ? sha256Bytes(keyBytes) : keyBytes;
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(k);

  const oKeyPad = new Uint8Array(blockSize + 32);
  const iKeyPad = new Uint8Array(blockSize + msgBytes.length);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }
  iKeyPad.set(msgBytes, blockSize);
  const innerHash = sha256Bytes(iKeyPad);
  oKeyPad.set(innerHash, blockSize);
  const finalHash = sha256Bytes(oKeyPad);

  return Array.from(finalHash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

async function verifyKeySignatureClient(keyString: string): Promise<{
  valid: boolean;
  tier?: 'VIP' | 'PREMIUM' | 'ENTERPRISE' | 'ADMIN' | 'USER';
  duration?: string;
  kid?: string;
  expiresAtMs?: number;
}> {
  const upperRaw = keyString.trim().toUpperCase().replace(/^KHELV\s+PENEL(?=[-\s])/, 'KHELVPENEL');
  let parts = upperRaw.split('-');

  if (parts.length === 7 && parts[0] === 'KHELVPENEL' && parts[1] === 'JUJUTSU') {
    parts = parts.slice(1);
  }
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

  const secrets = [KHELV_MASTER_CIPHER_SECRET, MASTER_CIPHER_SECRET];
  const payloads = [
    `KLP:${tier}:${duration}:${kid}:${expSec}`,
    `JJS:${tier}:${duration}:${kid}:${expSec}`,
    `KHELV:${tier}:${duration}:${kid}:${expSec}`,
    `${prefix}:${tier}:${duration}:${kid}:${expSec}`,
  ];

  for (const secret of secrets) {
    for (const payload of payloads) {
      const expectedFull = await hmacSha256Hex(secret, payload);
      if (sig === expectedFull.slice(0, 16)) {
        return {
          valid: true,
          tier: tier as any,
          duration,
          kid: prefix === 'JUJUTSU' ? `JJS-${kid}` : `KLP-${kid}`,
          expiresAtMs: expSec * 1000,
        };
      }
    }
  }

  return { valid: false };
}

function getLocalDeviceBindings(): Record<string, { deviceId: string; deviceLabel: string; activatedAt: number }> {
  try {
    const raw = localStorage.getItem(LOCAL_DEVICE_BINDINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalDeviceBinding(kid: string, deviceId: string, deviceLabel: string, activatedAt: number) {
  try {
    const bindings = getLocalDeviceBindings();
    bindings[kid] = { deviceId, deviceLabel, activatedAt };
    localStorage.setItem(LOCAL_DEVICE_BINDINGS_KEY, JSON.stringify(bindings));
  } catch {
    // Ignore storage errors
  }
}

async function verifyLicenseKeyLocally(
  cleanKey: string,
  hw: { deviceId: string; deviceLabel: string }
): Promise<VerificationResponse> {
  const coreKey = normalizeLicenseKey(cleanKey);

  // Check 1: Master Admin Bypass Keys
  if (MASTER_ADMIN_KEYS.has(cleanKey) || MASTER_ADMIN_KEYS.has(coreKey)) {
    const expMs = Date.now() + 100 * 365 * 86400 * 1000;
    const adminSession: LicenseSession = {
      key: cleanKey,
      keyId: 'JJS-MASTER-ADMIN',
      tier: 'ADMIN',
      duration: 'LIFETIME',
      expiresAt: expMs,
      formattedExpiry: 'LIFETIME ACCESS (MASTER ADMIN)',
      deviceId: hw.deviceId,
      deviceLabel: hw.deviceLabel || 'Authorized Terminal',
      activatedAt: Date.now(),
      isAdmin: true,
    };
    saveSession(adminSession);
    return {
      valid: true,
      message: 'MASTER ADMIN ACCESS GRANTED • All security barriers bypassed.',
      session: adminSession,
    };
  }

  // Check 2: Cryptographic HMAC-SHA256 Verification
  const cryptoCheck = await verifyKeySignatureClient(cleanKey);
  if (!cryptoCheck.valid || !cryptoCheck.kid || !cryptoCheck.expiresAtMs) {
    return {
      valid: false,
      error: 'KEY_INVALID',
      message: 'SECURITY ERROR: Invalid or forged license key signature. Access denied.',
    };
  }

  // Check 3: Expiration Check
  const now = Date.now();
  if (now > cryptoCheck.expiresAtMs) {
    return {
      valid: false,
      error: 'KEY_EXPIRED',
      message: `EXPIRED: This key expired on ${new Date(cryptoCheck.expiresAtMs).toLocaleString()}. Expired keys can never be reused. Please get a fresh key.`,
    };
  }

  // Check 4: 1-Device Lock (Local Persistence)
  const bindings = getLocalDeviceBindings();
  const existing = bindings[cryptoCheck.kid];
  let activatedAt = now;

  if (existing) {
    if (existing.deviceId !== hw.deviceId) {
      return {
        valid: false,
        error: 'DEVICE_LOCKED',
        message: `DEVICE MISMATCH ERROR: This license key is locked to Device #${existing.deviceId.slice(0, 12)}... You cannot use this key on a different mobile or PC!`,
      };
    }
    activatedAt = existing.activatedAt || now;
  } else {
    saveLocalDeviceBinding(cryptoCheck.kid, hw.deviceId, hw.deviceLabel, now);
  }

  const session: LicenseSession = {
    key: cleanKey,
    keyId: cryptoCheck.kid,
    tier: cryptoCheck.tier || 'VIP',
    duration: cryptoCheck.duration || '7D',
    expiresAt: cryptoCheck.expiresAtMs,
    formattedExpiry: new Date(cryptoCheck.expiresAtMs).toLocaleString(),
    deviceId: hw.deviceId,
    deviceLabel: hw.deviceLabel,
    activatedAt,
    isAdmin: cryptoCheck.tier === 'ADMIN',
  };

  saveSession(session);
  return {
    valid: true,
    message: existing
      ? 'DEVICE VERIFIED • Welcome back.'
      : `KEY ACTIVATED & LOCKED TO DEVICE [${hw.deviceId.slice(0, 12)}...]! Cannot be transferred.`,
    session,
  };
}

/**
 * Returns null so key is required every time the app is opened as requested
 */
export function getSavedSession(): LicenseSession | null {
  return null;
}

/**
 * Saves verified session to sessionStorage for the current tab only
 */
export function saveSession(session: LicenseSession): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore quota errors
  }
}

/**
 * Clears current session
 */
export function clearSession(): void {
  inMemoryAuthToken = null;
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_SESSION_KEY);
}

/**
 * Verifies a key against the backend license verification authority,
 * with seamless cryptographic verification fallback when deployed without backend (e.g. Vercel).
 */
export async function verifyLicenseKey(keyToVerify: string): Promise<VerificationResponse> {
  const cleanKey = keyToVerify.trim();
  if (!cleanKey) {
    return {
      valid: false,
      error: 'KEY_INVALID',
      message: 'Please enter a valid encrypted license key.',
    };
  }

  // Get current hardware device fingerprint
  const hw = await getDeviceFingerprint();

  try {
    const res = await fetch('/api/license/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey: cleanKey,
        deviceFingerprint: hw.deviceId,
        deviceLabel: hw.deviceLabel,
        platform: hw.platform,
        browser: hw.browser,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json') || res.status === 404 || res.status === 405 || res.status >= 500) {
      // Backend API unavailable (e.g. static deployment on Vercel) -> verify cryptographically locally
      return await verifyLicenseKeyLocally(cleanKey, hw);
    }

    const data = await res.json();

    if (res.ok && data.valid && data.session) {
      if (data.session.authToken) {
        setMemoryAuthToken(data.session.authToken);
      }
      saveSession(data.session);
      return {
        valid: true,
        message: data.message || 'Key verified and bound to this device successfully!',
        session: data.session,
      };
    } else {
      return {
        valid: false,
        error: data.error || 'KEY_INVALID',
        message: data.message || 'Verification rejected by security authority.',
      };
    }
  } catch {
    // Network unreachable or non-JSON response -> verify cryptographically locally
    return await verifyLicenseKeyLocally(cleanKey, hw);
  }
}

/**
 * Checks session validity with server heartbeat
 */
export async function checkSessionHeartbeat(session: LicenseSession): Promise<{
  active: boolean;
  reason?: string;
}> {
  if (session.expiresAt && Date.now() > session.expiresAt) {
    clearSession();
    return {
      active: false,
      reason: 'KEY_EXPIRED',
    };
  }

  try {
    const hw = await getDeviceFingerprint();
    const res = await fetch('/api/license/check-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyId: session.keyId,
        licenseKey: session.key,
        deviceId: hw.deviceId,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return { active: Date.now() < session.expiresAt };
    }

    const data = await res.json();
    if (!data.active) {
      // If server restarted or doesn't have the key in memory, verify cryptographically before terminating
      if (data.reason === 'KEY_NOT_FOUND') {
        const coreKey = normalizeLicenseKey(session.key);
        if (MASTER_ADMIN_KEYS.has(session.key) || MASTER_ADMIN_KEYS.has(coreKey)) {
          return { active: true };
        }
        const sigCheck = await verifyKeySignatureClient(session.key);
        if (sigCheck.valid && (!sigCheck.expiresAtMs || Date.now() < sigCheck.expiresAtMs)) {
          return { active: true };
        }
      }
      clearSession();
      return {
        active: false,
        reason: data.reason || 'REVOKED_OR_EXPIRED',
      };
    }
    return { active: true };
  } catch {
    return { active: Date.now() < session.expiresAt };
  }
}

/**
 * Format remaining time in a readable string
 */
export function formatRemainingTime(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'EXPIRED';

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 365) return 'LIFETIME (VIP)';
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
