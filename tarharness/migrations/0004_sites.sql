-- CONTROL is the authority for publicly served site releases.
CREATE TABLE sites (
  workspace TEXT PRIMARY KEY REFERENCES workspaces(id),
  site TEXT NOT NULL,
  release TEXT NOT NULL,
  hash TEXT NOT NULL,
  epoch INTEGER NOT NULL CHECK(epoch > 0),
  domain TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'host' CHECK(mode IN ('host','path')),
  status TEXT NOT NULL CHECK(status IN ('active','paused')),
  updated INTEGER NOT NULL
);

CREATE TABLE hosts (
  name TEXT PRIMARY KEY,
  workspace TEXT NOT NULL REFERENCES workspaces(id),
  site TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','pending')),
  updated INTEGER NOT NULL
);
CREATE INDEX hostworkspace ON hosts(workspace);

CREATE TABLE previews (
  token TEXT PRIMARY KEY,
  workspace TEXT NOT NULL REFERENCES workspaces(id),
  site TEXT NOT NULL,
  release TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX previewexpires ON previews(expires);
