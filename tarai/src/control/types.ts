import type { MemberStatus, Role } from '../domain/types.ts';

export type ControlState = 'provisioning' | 'active' | 'grace' | 'readonly' | 'archived' | 'cold' | 'restoring' | 'error';

export interface ControlUser {
  id: string;
  email: string;
  name: string;
  region: string;
  db: string | null;
  host: string | null;
  schema: number;
  state: string;
  created: number;
  updated: number;
}

export interface ControlSpace {
  id: string;
  owner: string;
  slug: string;
  name: string;
  region: string;
  db: string | null;
  host: string | null;
  schema: number;
  state: ControlState;
  role?: Role;
  created: number;
  updated: number;
}

export interface ControlMember {
  id: string;
  space: string;
  user: string;
  role: Role;
  state: MemberStatus;
  budget: number;
  spent: number;
  reset: number;
}

export interface Wallet {
  id: string;
  user: string;
  balance: number;
  created: number;
  updated: number;
}

export interface AgentRate {
  id: string;
  name: string;
  action: string;
  credits: number;
  version: number;
}

export interface AgentRun {
  id: string;
  user: string;
  space: string | null;
  agent: string;
  credits: number;
  model: string | null;
  input: number;
  output: number;
  cached: number;
  cost: number;
  state: 'reserved' | 'running' | 'done' | 'failed' | 'refunded';
  idem: string;
  created: number;
  ended: number | null;
}

export interface MemberRoute {
  user: string;
  role: Role;
  db: string | null;
  host: string | null;
  region: string;
  state: string;
}

export interface Service {
  id: string;
  user: string;
  space: string | null;
  kind: 'workspace' | 'site';
  credits: number;
  state: 'active' | 'grace' | 'paused' | 'ended';
  renewal: number;
  grace: number | null;
}

export class ControlError extends Error {
  constructor(
    public readonly code: 'funds' | 'budget' | 'access' | 'conflict' | 'missing' | 'unavailable',
    message: string,
  ) {
    super(message);
    this.name = 'ControlError';
  }
}
