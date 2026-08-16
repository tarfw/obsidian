/**
 * Manages per-workspace Turso databases.
 *
 * Each workspace gets its own Turso DB with 4 tables:
 *   matter   — current state (stock, orders, staff, customers, settings)
 *   motion   — selective user-visible event log
 *   graph    — relationships (links between items)
 *   inbox    — actionable tasks/notifications requiring human attention
 *
 * Creation flow:
 *   1. Check D1 cache for existing DB
 *   2. Create Turso DB via Platform API
 *   3. Create auth token (365d expiry)
 *   4. Store URL + token in D1 workspaces table
 *   5. Apply 4-table schema via pipeline
 *   6. Return { url, authToken } to caller
 */

import { SCHEMA_STATEMENTS, PERSONAL_SCHEMA_STATEMENTS } from './schema';
import { envContext } from './db';

const TURSO_API = 'https://api.turso.tech/v1/organizations';
const ORG_SLUG = 'tarapp';

interface UserDbRecord {
  user_id: string;
  turso_db_name: string;
  turso_url: string;
  turso_auth_token: string;
}

/**
 * Get or create a per-user Personal Turso database.
 * Returns { url, authToken } for the user's personal DB.
 */
export async function getOrCreateUserDb(
  db: D1Database,
  userId: string,
  platformToken: string
): Promise<{ url: string; authToken: string }> {
  const cleanUserId = userId.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '') || 'default';

  // 1. Check D1 cache
  const existing = await db
    .prepare('SELECT user_id, turso_db_name, turso_url, turso_auth_token FROM users WHERE user_id = ?')
    .bind(userId)
    .first<UserDbRecord>();

  if (existing?.turso_url && existing?.turso_auth_token) {
    console.log(`[user-db] Found cached DB for ${userId}: ${existing.turso_url}`);
    return { url: existing.turso_url, authToken: existing.turso_auth_token };
  }

  // 2. Create new Turso database in default group (clean name, no prefix)
  const dbName = cleanUserId;
  console.log(`[user-db] Creating Personal Turso DB: ${dbName}`);

  const createRes = await fetch(`${TURSO_API}/${ORG_SLUG}/databases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${platformToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: dbName, group: 'default' }),
  });

  const createBody = await createRes.text();
  console.log(`[user-db] Create response: ${createRes.status} ${createBody}`);

  if (!createRes.ok && createRes.status !== 409) {
    throw new Error(`Failed to create Personal Turso DB: ${createRes.status} ${createBody}`);
  }

  // 3. Get hostname from API response or fallback
  let hostname = '';
  if (createRes.ok) {
    try {
      const createData = JSON.parse(createBody);
      hostname = createData?.database?.Hostname || createData?.Hostname || '';
    } catch {}
  }
  if (!hostname) {
    hostname = `${dbName}-${ORG_SLUG}.aws-eu-west-1.turso.io`;
  }

  const tursoUrl = hostname.includes('.turso.io')
    ? `libsql://${hostname}`
    : `libsql://${hostname}.turso.io`;

  console.log(`[user-db] Turso URL: ${tursoUrl}`);

  let authToken = '';
  try {
    const env = envContext.getStore();
    if (env?.TURSO_GROUP_TOKEN) {
      authToken = env.TURSO_GROUP_TOKEN;
    }
  } catch (err) {
    console.warn('[user-db] Failed to check env context for TURSO_GROUP_TOKEN:', err);
  }

  if (!authToken) {
    const tokenRes = await fetch(`${TURSO_API}/${ORG_SLUG}/databases/${dbName}/auth/tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${platformToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiration: '365d' }),
    });

    const tokenBody = await tokenRes.text();
    if (!tokenRes.ok) {
      throw new Error(`Failed to create Turso token: ${tokenRes.status} ${tokenBody}`);
    }

    try {
      const tokenData = JSON.parse(tokenBody);
      authToken = tokenData?.jwt || tokenData?.token || '';
    } catch {}

    if (!authToken) {
      throw new Error('No token returned from Turso API');
    }
  }

  // 4. Store in D1 users table
  await db
    .prepare(
      `INSERT INTO users (user_id, turso_db_name, turso_url, turso_auth_token)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET turso_url = excluded.turso_url, turso_auth_token = excluded.turso_auth_token`
    )
    .bind(userId, dbName, tursoUrl, authToken)
    .run();

  console.log(`[user-db] Stored in D1: ${userId} → ${tursoUrl}`);

  // 5. Apply Personal schema statements to the new database
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const cleanHostname = hostname.replace('libsql://', '').replace('.turso.io', '') + '.turso.io';
      const pipelineUrl = `https://${cleanHostname}/v2/pipeline`;
      const statements = PERSONAL_SCHEMA_STATEMENTS.map(sql => ({
        type: 'execute',
        stmt: { sql },
      }));
      const pipeRes = await fetch(pipelineUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: statements }),
      });
      const pipeBody = await pipeRes.text();
      console.log(`[user-db] Schema pipeline attempt ${attempt}: ${pipeRes.status}`);
      if (pipeRes.ok) break;
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
    } catch (schemaErr) {
      console.warn(`[user-db] Schema attempt ${attempt} failed:`, schemaErr);
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }

  return { url: tursoUrl, authToken };
}

interface WorkspaceDbRecord {
  subdomain: string;
  scope: string;
  turso_url?: string;
  turso_auth_token?: string;
}

/**
 * Get or create a per-workspace Turso database.
 * Returns { url, authToken } for the workspace DB.
 */
export async function getOrCreateWorkspaceDb(
  db: D1Database,
  subdomain: string,
  scope: string,
  platformToken: string
): Promise<{ url: string; authToken: string }> {
  // 1. Check D1 cache
  const existing = await db
    .prepare('SELECT subdomain, scope, turso_url, turso_auth_token FROM workspaces WHERE subdomain = ?')
    .bind(subdomain)
    .first<WorkspaceDbRecord>();

  if (existing?.turso_url && existing?.turso_auth_token) {
    console.log(`[workspace-db] Found cached DB for ${subdomain}: ${existing.turso_url}`);
    return { url: existing.turso_url, authToken: existing.turso_auth_token };
  }

  // 2. Create new Turso database in default group (clean name, no prefix)
  const dbName = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  console.log(`[workspace-db] Creating Turso DB: ${dbName}`);

  const createRes = await fetch(`${TURSO_API}/${ORG_SLUG}/databases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${platformToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: dbName, group: 'default' }),
  });

  const createBody = await createRes.text();
  console.log(`[workspace-db] Create response: ${createRes.status} ${createBody}`);

  if (!createRes.ok && createRes.status !== 409) {
    throw new Error(`Failed to create Turso DB: ${createRes.status} ${createBody}`);
  }

  // 3. Get hostname from API response or fallback
  let hostname = '';
  if (createRes.ok) {
    try {
      const createData = JSON.parse(createBody);
      hostname = createData?.database?.Hostname || createData?.Hostname || '';
    } catch {}
  }
  if (!hostname) {
    hostname = `${dbName}-${ORG_SLUG}.aws-eu-west-1.turso.io`;
  }

  const tursoUrl = hostname.includes('.turso.io')
    ? `libsql://${hostname}`
    : `libsql://${hostname}.turso.io`;

  console.log(`[workspace-db] Turso URL: ${tursoUrl}`);

  let authToken = '';
  try {
    const env = envContext.getStore();
    if (env?.TURSO_GROUP_TOKEN) {
      console.log('[workspace-db] Reusing shared TURSO_GROUP_TOKEN');
      authToken = env.TURSO_GROUP_TOKEN;
    }
  } catch (err) {
    console.warn('[workspace-db] Failed to check env context for TURSO_GROUP_TOKEN:', err);
  }

  if (!authToken) {
    // 4. Create auth token
    const tokenRes = await fetch(`${TURSO_API}/${ORG_SLUG}/databases/${dbName}/auth/tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${platformToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiration: '365d' }),
    });

    const tokenBody = await tokenRes.text();
    console.log(`[workspace-db] Token response: ${tokenRes.status}`);

    if (!tokenRes.ok) {
      throw new Error(`Failed to create Turso token: ${tokenRes.status} ${tokenBody}`);
    }

    try {
      const tokenData = JSON.parse(tokenBody);
      authToken = tokenData?.jwt || tokenData?.token || '';
    } catch {}

    if (!authToken) {
      throw new Error('No token returned from Turso API');
    }
  }

  // 5. Update workspaces table in D1
  await db
    .prepare(
      'UPDATE workspaces SET turso_url = ?, turso_auth_token = ? WHERE subdomain = ?'
    )
    .bind(tursoUrl, authToken, subdomain)
    .run();

  console.log(`[workspace-db] Stored in D1: ${subdomain} → ${tursoUrl}`);

  // 6. Apply schema statements to the new database
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const cleanHostname = hostname.replace('libsql://', '').replace('.turso.io', '') + '.turso.io';
      const pipelineUrl = `https://${cleanHostname}/v2/pipeline`;
      const statements = SCHEMA_STATEMENTS.map(sql => ({
        type: 'execute',
        stmt: { sql },
      }));
      const pipeRes = await fetch(pipelineUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: statements }),
      });
      const pipeBody = await pipeRes.text();
      console.log(`[workspace-db] Schema pipeline attempt ${attempt}: ${pipeRes.status}`);
      if (pipeRes.ok) break;
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
    } catch (schemaErr) {
      console.warn(`[workspace-db] Schema attempt ${attempt} failed:`, schemaErr);
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }

  return { url: tursoUrl, authToken };
}
