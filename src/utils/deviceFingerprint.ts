/**
 * JUJUTSU CYBER SECURITY - HARDWARE DEVICE FINGERPRINTING
 * Generates a deterministic, persistent hardware/browser fingerprint
 * to strictly enforce 1-Key = 1-Device locking policy.
 */

// Simple fast SHA-256 implementation using Web Crypto API or fallback
async function sha256Hex(str: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(str);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  // Fallback simple 32-bit hash
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

/**
 * Generates or retrieves a persistent Device Unique GUID stored on device
 */
function getPersistentDeviceUUID(): string {
  if (typeof window === 'undefined') return 'SERVER-DEVICE-NODE';
  const STORAGE_KEY = 'jujutsu_hw_persistent_uuid';
  let stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    stored = 'JJS-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    localStorage.setItem(STORAGE_KEY, stored);
  }
  return stored;
}

/**
 * Collects hardware signals:
 * Screen, Color Depth, Hardware Concurrency, Memory, WebGL Vendor, Platform, Language, Persistent UUID
 */
export async function getDeviceFingerprint(): Promise<{
  deviceId: string;
  shortId: string;
  deviceLabel: string;
  platform: string;
  browser: string;
}> {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'DEV-NODE-SERVER-HOST',
      shortId: 'DEV-SRV',
      deviceLabel: 'Host Server',
      platform: 'Linux',
      browser: 'Node.js',
    };
  }

  const nav = window.navigator;
  const scr = window.screen;

  // WebGL renderer info for GPU fingerprint
  let glRenderer = 'STANDARD_GPU';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        glRenderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'WEBGL';
      }
    }
  } catch {
    // Ignore canvas errors
  }

  const persistentId = getPersistentDeviceUUID();

  // Combine parameters
  const hardwareRaw = [
    persistentId,
    nav.userAgent || '',
    nav.platform || '',
    nav.language || '',
    scr.width + 'x' + scr.height + 'x' + scr.colorDepth,
    nav.hardwareConcurrency || 4,
    (nav as any).deviceMemory || 8,
    glRenderer,
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  ].join('||');

  const fullHash = await sha256Hex(hardwareRaw);
  const part1 = fullHash.substring(0, 4).toUpperCase();
  const part2 = fullHash.substring(4, 8).toUpperCase();
  const part3 = fullHash.substring(8, 12).toUpperCase();
  const part4 = fullHash.substring(12, 16).toUpperCase();

  const deviceId = `DEV-${part1}-${part2}-${part3}-${part4}`;
  const shortId = `DEV-${part1}-${part2}`;

  // Human friendly label
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent);
  const platform = /iPhone|iPad/i.test(nav.userAgent)
    ? 'Apple iOS'
    : /Android/i.test(nav.userAgent)
    ? 'Android Mobile'
    : /Windows/i.test(nav.userAgent)
    ? 'Windows PC'
    : /Macintosh/i.test(nav.userAgent)
    ? 'macOS'
    : 'Linux Workstation';

  const browser = /Edg/i.test(nav.userAgent)
    ? 'Edge'
    : /Chrome/i.test(nav.userAgent)
    ? 'Chrome'
    : /Firefox/i.test(nav.userAgent)
    ? 'Firefox'
    : /Safari/i.test(nav.userAgent)
    ? 'Safari'
    : 'Browser';

  const deviceLabel = `${platform} (${isMobile ? 'Mobile' : 'Desktop'}) - ${browser}`;

  return {
    deviceId,
    shortId,
    deviceLabel,
    platform,
    browser,
  };
}
