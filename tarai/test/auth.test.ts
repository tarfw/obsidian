import { describe, it, expect, beforeEach } from 'vitest';
import { resolveAuthContext, parseJwtPayload } from '../src/domain/auth.ts';
import { createDatabaseClient, initializeSchema } from '../src/data/turso.ts';
import { MemberRepository } from '../src/data/repositories/member.ts';
import { WorkspaceRepository } from '../src/data/repositories/workspace.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Authentication & Immediate Revocation Gate', () => {
  let client: ReturnType<typeof createDatabaseClient>;
  let memberRepo: MemberRepository;
  let workspaceRepo: WorkspaceRepository;

  beforeEach(async () => {
    client = createDatabaseClient({ TURSO_DATABASE_URL: 'file::memory:' });
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../src/data/schema.sql'), 'utf-8');
    await initializeSchema(client, schemaSql);

    memberRepo = new MemberRepository(client);
    workspaceRepo = new WorkspaceRepository(client);

    await workspaceRepo.create({
      id: 'ws_alpha',
      name: 'Alpha Workspace',
      slug: 'alpha',
      currency: 'USD',
      settings: {},
    });
  });

  it('correctly parses claims from a valid JWT', () => {
    // Header: {"alg":"none","typ":"JWT"}, Payload: {"sub":"user_123","workspaceId":"ws_alpha","email":"user@example.com"}
    const token = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ1c2VyXzEyMyIsIndvcmtzcGFjZUlkIjoid3NfYWxwaGEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ.';
    const parsed = parseJwtPayload(token);
    expect(parsed).toEqual({
      sub: 'user_123',
      workspaceId: 'ws_alpha',
      email: 'user@example.com',
    });
  });

  it('fails closed when no JWT signature verifier is configured', async () => {
    const res = await resolveAuthContext(
      'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ1c2VyXzEyMyIsIndvcmtzcGFjZUlkIjoid3NfYWxwaGEifQ.',
      async () => ({ role: 'member', status: 'active' }),
    );
    expect(res.valid).toBe(false);
    expect(res.error).toContain('signature');
  });

  it('authenticates active member successfully', async () => {
    await memberRepo.create({
      id: 'mem_1',
      workspaceId: 'ws_alpha',
      userId: 'user_123',
      email: 'user@example.com',
      role: 'member',
      status: 'active',
    });

    const authHeader = 'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ1c2VyXzEyMyIsIndvcmtzcGFjZUlkIjoid3NfYWxwaGEiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ.';
    const res = await resolveAuthContext(authHeader, async (u, w) => {
      const m = await memberRepo.findByUserIdAndWorkspace(u, w);
      return m ? { role: m.role, status: m.status } : null;
    }, { issuer: 'test', audience: 'test', jwksUrl: 'https://test.invalid/keys', verifyToken: async (token) => parseJwtPayload(token)! });

    expect(res.valid).toBe(true);
    expect(res.context?.role).toBe('member');
    expect(res.context?.status).toBe('active');
    expect(res.context?.workspaceId).toBe('ws_alpha');
  });

  it('immediately rejects revoked or suspended member', async () => {
    await memberRepo.create({
      id: 'mem_revoked',
      workspaceId: 'ws_alpha',
      userId: 'user_bad',
      email: 'bad@example.com',
      role: 'member',
      status: 'active',
    });

    // 1. First request is valid
    const authHeader = 'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ1c2VyX2JhZCIsIndvcmtzcGFjZUlkIjoid3NfYWxwaGEiLCJlbWFpbCI6ImJhZEBleGFtcGxlLmNvbSJ9.';
    const check1 = await resolveAuthContext(authHeader, async (u, w) => {
      const m = await memberRepo.findByUserIdAndWorkspace(u, w);
      return m ? { role: m.role, status: m.status } : null;
    }, { issuer: 'test', audience: 'test', jwksUrl: 'https://test.invalid/keys', verifyToken: async (token) => parseJwtPayload(token)! });
    expect(check1.valid).toBe(true);

    // 2. Revoke member in database
    await memberRepo.updateStatus('mem_revoked', 'ws_alpha', 'revoked');

    // 3. Immediate rejection on subsequent request
    const check2 = await resolveAuthContext(authHeader, async (u, w) => {
      const m = await memberRepo.findByUserIdAndWorkspace(u, w);
      return m ? { role: m.role, status: m.status } : null;
    }, { issuer: 'test', audience: 'test', jwksUrl: 'https://test.invalid/keys', verifyToken: async (token) => parseJwtPayload(token)! });
    expect(check2.valid).toBe(false);
    expect(check2.error).toContain('Access denied: Member status is revoked');
  });
});
