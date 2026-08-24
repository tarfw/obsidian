# Setup

Set secrets before first use. Run from `tarai/`.

## Required secrets

```bash
cd tarai

wrangler secret put TURSO_DATABASE_URL    # Tarai's dedicated libsql database
wrangler secret put TURSO_AUTH_TOKEN      # Turso auth token (read/write)
```

## Local dev

Copy `.env.example` to `.env` and fill in values. The `.env` file is gitignored.

## Worker URL

| Worker | URL |
|---|---|
| tarai | https://tarai.tar-54d.workers.dev |
