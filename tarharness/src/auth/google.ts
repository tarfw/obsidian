import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Effect } from 'effect';
import { unauthorized } from '../errors.ts';
import type { Identity } from '../types.ts';

type AuthEnv = { readonly OIDC_ISSUER: string; readonly OIDC_AUDIENCE: string; readonly OIDC_JWKS_URL: string; };
const jwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function verifyGoogleIdentity(header: string | null, env: AuthEnv): Effect.Effect<Identity, ReturnType<typeof unauthorized>> {
  return Effect.tryPromise({
    try: async () => {
      if (!header?.startsWith('Bearer ')) throw new Error('missing bearer token');
      if (!env.OIDC_AUDIENCE || env.OIDC_AUDIENCE.startsWith('REPLACE_')) throw new Error('OIDC audience is not configured');
      let keySet = jwks.get(env.OIDC_JWKS_URL);
      if (!keySet) { keySet = createRemoteJWKSet(new URL(env.OIDC_JWKS_URL)); jwks.set(env.OIDC_JWKS_URL, keySet); }
      const verified = await jwtVerify(header.slice(7), keySet, {
        issuer: env.OIDC_ISSUER.split(',').map((value) => value.trim()).filter(Boolean),
        audience: env.OIDC_AUDIENCE,
        algorithms: ['RS256', 'ES256'],
      });
      const id = typeof verified.payload.sub === 'string' ? verified.payload.sub : '';
      const email = typeof verified.payload.email === 'string' ? verified.payload.email.toLowerCase() : '';
      const verifiedEmail = verified.payload.email_verified === true;
      if (!id || !email || !verifiedEmail) throw new Error('missing verified Google identity');
      return { id, email, name: typeof verified.payload.name === 'string' ? verified.payload.name : null };
    },
    catch: () => unauthorized(),
  });
}
