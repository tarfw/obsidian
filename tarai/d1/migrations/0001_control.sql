PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT 'apac',
  db TEXT,
  host TEXT,
  schema INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'provisioning' CHECK (state IN ('provisioning', 'active', 'error', 'blocked')),
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE TABLE spaces (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES users(id),
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  db TEXT,
  host TEXT,
  schema INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'provisioning' CHECK (state IN ('provisioning', 'active', 'grace', 'readonly', 'archived', 'cold', 'restoring', 'error')),
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  space TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'guest')),
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'suspended', 'revoked')),
  budget INTEGER NOT NULL DEFAULT 0 CHECK (budget >= 0),
  spent INTEGER NOT NULL DEFAULT 0 CHECK (spent >= 0),
  reset INTEGER NOT NULL,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  UNIQUE (space, user)
);

CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(id) UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE TABLE ledger (
  id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL REFERENCES wallets(id),
  amount INTEGER NOT NULL CHECK (amount <> 0),
  kind TEXT NOT NULL CHECK (kind IN ('trial', 'purchase', 'workspace', 'site', 'agent', 'refund', 'adjust')),
  ref TEXT,
  idem TEXT NOT NULL UNIQUE,
  meta TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta)),
  created INTEGER NOT NULL
);

CREATE TRIGGER ledger_funds
BEFORE INSERT ON ledger
BEGIN
  SELECT CASE
    WHEN (SELECT balance FROM wallets WHERE id = NEW.wallet) IS NULL
      THEN RAISE(ABORT, 'wallet_missing')
    WHEN NEW.amount < 0 AND (SELECT balance FROM wallets WHERE id = NEW.wallet) + NEW.amount < 0
      THEN RAISE(ABORT, 'funds')
  END;
END;

CREATE TRIGGER ledger_balance
AFTER INSERT ON ledger
BEGIN
  UPDATE wallets
  SET balance = balance + NEW.amount, updated = NEW.created
  WHERE id = NEW.wallet;
END;

CREATE TRIGGER ledger_update
BEFORE UPDATE ON ledger
BEGIN
  SELECT RAISE(ABORT, 'ledger_immutable');
END;

CREATE TRIGGER ledger_delete
BEFORE DELETE ON ledger
BEGIN
  SELECT RAISE(ABORT, 'ledger_immutable');
END;

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(id),
  space TEXT REFERENCES spaces(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('workspace', 'site')),
  credits INTEGER NOT NULL CHECK (credits > 0),
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'grace', 'paused', 'ended')),
  renewal INTEGER NOT NULL,
  grace INTEGER,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  UNIQUE (space, kind)
);

CREATE TABLE packs (
  id TEXT PRIMARY KEY,
  credits INTEGER NOT NULL CHECK (credits > 0),
  price INTEGER NOT NULL CHECK (price > 0),
  currency TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'inactive'))
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(id),
  pack TEXT NOT NULL REFERENCES packs(id),
  provider TEXT NOT NULL,
  checkout TEXT NOT NULL UNIQUE,
  receipt TEXT UNIQUE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  state TEXT NOT NULL DEFAULT 'created' CHECK (state IN ('created', 'paid', 'failed', 'refunded')),
  idem TEXT NOT NULL UNIQUE,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE TABLE mandates (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,
  ref TEXT NOT NULL UNIQUE,
  pack TEXT NOT NULL REFERENCES packs(id),
  threshold INTEGER NOT NULL CHECK (threshold >= 0),
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'paused', 'ended')),
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  action TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  version INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'inactive')),
  updated INTEGER NOT NULL
);

CREATE TABLE models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  input INTEGER NOT NULL CHECK (input >= 0),
  output INTEGER NOT NULL CHECK (output >= 0),
  cached INTEGER NOT NULL CHECK (cached >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  version INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'inactive')),
  updated INTEGER NOT NULL,
  UNIQUE (provider, name, version)
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL REFERENCES users(id),
  space TEXT REFERENCES spaces(id),
  agent TEXT NOT NULL REFERENCES agents(id),
  credits INTEGER NOT NULL CHECK (credits > 0),
  model TEXT REFERENCES models(id),
  input INTEGER NOT NULL DEFAULT 0 CHECK (input >= 0),
  output INTEGER NOT NULL DEFAULT 0 CHECK (output >= 0),
  cached INTEGER NOT NULL DEFAULT 0 CHECK (cached >= 0),
  cost INTEGER NOT NULL DEFAULT 0 CHECK (cost >= 0),
  state TEXT NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved', 'running', 'done', 'failed', 'refunded')),
  idem TEXT NOT NULL UNIQUE,
  created INTEGER NOT NULL,
  ended INTEGER
);

CREATE TRIGGER runs_budget
BEFORE INSERT ON runs
WHEN NEW.space IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM members
      WHERE space = NEW.space AND user = NEW.user AND state = 'active'
    ) THEN RAISE(ABORT, 'access')
    WHEN EXISTS (
      SELECT 1 FROM members
      WHERE space = NEW.space AND user = NEW.user AND state = 'active' AND role <> 'owner'
        AND spent + NEW.credits > budget
    ) THEN RAISE(ABORT, 'budget')
  END;
END;

CREATE TRIGGER runs_spend
AFTER INSERT ON runs
WHEN NEW.space IS NOT NULL
BEGIN
  UPDATE members
  SET spent = spent + NEW.credits, updated = NEW.created
  WHERE space = NEW.space AND user = NEW.user AND role <> 'owner';
END;

CREATE TRIGGER runs_refund
AFTER UPDATE OF state ON runs
WHEN OLD.state <> 'refunded' AND NEW.state = 'refunded' AND NEW.space IS NOT NULL
BEGIN
  UPDATE members
  SET spent = MAX(0, spent - NEW.credits), updated = COALESCE(NEW.ended, NEW.created)
  WHERE space = NEW.space AND user = NEW.user AND role <> 'owner';
END;

CREATE INDEX spaces_owner ON spaces(owner, state);
CREATE INDEX members_user ON members(user, state);
CREATE INDEX ledger_wallet ON ledger(wallet, created DESC);
CREATE INDEX services_renewal ON services(state, renewal);
CREATE INDEX runs_space ON runs(space, created DESC);
CREATE INDEX runs_user ON runs(user, created DESC);
