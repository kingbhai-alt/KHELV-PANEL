/**
 * JUJUTSU ENCRYPTED LICENSE CLIENT SERVICE
 * Handles Key verification, device locking validation, session heartbeats, and expiry.
 */

import { getDeviceFingerprint } from '../utils/deviceFingerprint';

export interface LicenseSession {
  key: string;
  keyId: string;
  tier: 'VIP' | 'PREMIUM' | 'ENTERPRISE' | 'ADMIN';
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

/**
 * Returns null so key is required every time the app is opened as requested
 */
export function getSavedSession(): LicenseSession | null {
  // Always return null on fresh app launch so user must enter key every time
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
 * Verifies a key against the backend license verification authority
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
  } catch (err: any) {
    // If offline or network error, check if existing cached session matches
    const saved = getSavedSession();
    if (saved && saved.key === cleanKey && saved.deviceId === hw.deviceId) {
      if (Date.now() < saved.expiresAt) {
        return {
          valid: true,
          message: 'Offline verification active (Device Verified).',
          session: saved,
        };
      }
    }

    return {
      valid: false,
      error: 'NETWORK_ERROR',
      message: 'Connection failed while reaching license verification authority.',
    };
  }
}

/**
 * Checks session validity with server heartbeat
 */
export async function checkSessionHeartbeat(session: LicenseSession): Promise<{
  active: boolean;
  reason?: string;
}> {
  // If expired in local time
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

    const data = await res.json();
    if (!data.active) {
      clearSession();
      return {
        active: false,
        reason: data.reason || 'REVOKED_OR_EXPIRED',
      };
    }
    return { active: true };
  } catch {
    // Allow transient network glitch if still within time window
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
