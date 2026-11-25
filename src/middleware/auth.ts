import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getOrCreateUser } from '../db/users.ts';

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.JUJUTSU_MASTER_CIPHER_SECRET ||
  'JUJUTSU_KEY_CIPHER_2026_MASTER_SECRET_984712';

export interface SessionClaims {
  uid: string;
  email: string;
  keyId: string;
  tier: string;
  deviceId: string;
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  user?: SessionClaims;
}

export function createSessionToken(claims: Omit<SessionClaims, 'iat'>): string {
  const payload: SessionClaims = {
    ...claims,
    iat: Date.now(),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionClaims | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf-8');
  const expectedBuf = Buffer.from(expectedSig, 'utf-8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SessionClaims;
    if (!decoded || !decoded.uid || typeof decoded.exp !== 'number') {
      return null;
    }
    if (Date.now() > decoded.exp) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const claims = verifySessionToken(token);
  if (!claims) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
  }

  try {
    await getOrCreateUser(claims.uid, claims.email || `${claims.keyId.toLowerCase()}@khelv.local`);
    req.user = claims;
    next();
  } catch (error) {
    console.error('Error syncing user session:', error);
    return res.status(500).json({ error: 'Failed to initialize database session' });
  }
};
