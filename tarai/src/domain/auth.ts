/**
 * TARAI Authentication & Tenant Resolution
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { AuthContext, MemberStatus, Role } from './types.ts';

export interface AuthVerificationOptions {
  issuer: string;
  audience: string;
  jwksUrl: string;
  verifyToken?: (token: string) => Promise<Record<string, unknown>>;
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export interface VerifyTokenResult {
  valid: boolean;
  context?: AuthContext;
  error?: string;
}

export interface VerifiedIdentity {
  userId: string;
  email: string;
}

export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Resolves authentication context from headers and verified member records
 */
export function resolveAuthContext(
  authHeader: string | undefined,
  getMemberFn: (userId: string, workspaceId: string) => Promise<{ role: Role; status: MemberStatus } | null>,
  verification?: AuthVerificationOptions,
): Promise<VerifyTokenResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Promise.resolve({ valid: false, error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.slice(7).trim();
  return verifyAccessToken(token, verification).then((payload) => {
    if (!payload) return { valid: false, error: 'JWT signature or claims could not be verified' };

    const userId = String(payload.sub || payload.userId || '');
    const workspaceId = String(payload.workspaceId || payload.tenantId || '');
    const email = String(payload.email || '');

    if (!userId || !workspaceId) {
      return { valid: false, error: 'Token missing userId or workspaceId claims' };
    }

    return getMemberFn(userId, workspaceId).then((member) => {
    if (!member) {
      return { valid: false, error: 'Member not found in workspace' };
    }

    // Critical: Immediate access revocation check
    if (member.status !== 'active') {
      return { valid: false, error: `Access denied: Member status is ${member.status}` };
    }

    let audience: AuthContext['audience'] = 'member';
    if (member.role === 'owner') {
      audience = 'owner';
    } else if (member.role === 'guest') {
      audience = 'customer';
    }

    return {
      valid: true,
      context: {
        userId,
        workspaceId,
        email,
        role: member.role,
        status: member.status,
        audience,
      },
    };
    });
  });
}

/**
 * Verifies an OIDC identity without accepting a caller-supplied workspace.
 * Routes resolve workspace membership after signature validation.
 */
export async function resolveVerifiedIdentity(
  authHeader: string | undefined,
  verification?: AuthVerificationOptions,
): Promise<{ valid: boolean; identity?: VerifiedIdentity; error?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or malformed Authorization header' };
  }

  const payload = await verifyAccessToken(authHeader.slice(7).trim(), verification);
  if (!payload) return { valid: false, error: 'JWT signature or claims could not be verified' };

  const userId = String(payload.sub || payload.userId || '');
  const email = String(payload.email || '').toLowerCase();
  if (!userId || !email || payload.email_verified !== true) {
    return { valid: false, error: 'Token missing a verified subject or email claim' };
  }

  return { valid: true, identity: { userId, email } };
}

async function verifyAccessToken(
  token: string,
  verification?: AuthVerificationOptions,
): Promise<Record<string, unknown> | null> {
  try {
    // Never trust an unverified JWT payload. The injected verifier is only for
    // tests or an explicitly trusted internal adapter.
    if (verification?.verifyToken) return await verification.verifyToken(token);
    if (!verification?.issuer || !verification.audience || !verification.jwksUrl) return null;

    let jwks = jwksCache.get(verification.jwksUrl);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(verification.jwksUrl));
      jwksCache.set(verification.jwksUrl, jwks);
    }

    const result = await jwtVerify(token, jwks, {
      // Google documents both forms of its issuer claim.
      issuer: verification.issuer.split(',').map((issuer) => issuer.trim()).filter(Boolean),
      audience: verification.audience,
      algorithms: ['RS256', 'ES256'],
    });
    return result.payload as JWTPayload as Record<string, unknown>;
  } catch (error) {
    // Do not expose token details to callers. The error name is sufficient for
    // Worker log diagnostics when an OAuth client is misconfigured.
    console.warn('OIDC token verification rejected', error instanceof Error ? error.name : 'unknown_error');
    return null;
  }
}
