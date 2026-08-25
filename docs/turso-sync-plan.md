# Turso, Personal Privacy, and Offline Sync Plan

## Authority and credentials

Turso remains the operational authority. Tarai is the only service that may
write it. A Turso **group read/write token can access every database in that
group**; it is therefore a Tarai secret only, never an Expo variable, never a
device token, and never a browser token. Keep separate groups for production,
staging, and development. Prefer a per-database platform token for provisioning
where Turso supports it; use the group token only for narrowly scoped Tarai
operations that must reach many tenant databases.

TarApp receives only a short-lived, per-Personal-DB read token through Tarai.
The Sync SDK token callback obtains a fresh token before a pull. TarApp never
receives a Workspace DB URL or token.

## Database choices

| Data | Remote database | Local device database | Sync direction |
| --- | --- | --- | --- |
| Workspace Matter/Motion/Graph | Workspace Turso DB | No replica | Tarai only |
| Personal Matter/Motion/Graph/Inbox/projections | Personal Turso DB | Read-only Personal replica | pull only |
| Requests, drafts, preferences, retry metadata | None | Device DB | local only |

Workspace databases are never synced to a phone. Tarai projects the minimal,
authorized rows into each member's Personal DB; the phone pulls only that DB.
All business writes, including offline requests, go through Tarai with one
idempotency key retained until Tarai accepts the canonical response.

## Strictly private mode

A user may choose `private_local_only` at account creation. In this mode TarApp
creates an encrypted local-only Personal DB and device DB, with no remote
Personal DB, no cross-device restore, no remote agent context, no push, and no
collaboration. This is the lowest-cost and strongest privacy option, but loss
of the device/key means loss of the data.

The default is `private_synced`: a Personal DB exists remotely so the user has
backup, a durable inbox, device replacement, and authorized workspace
projections. Both modes are private from other people by default.

To collaborate, never expose the Personal DB or share its token. The user uses
an explicit `share_personal_record` Tarai action: choose records, fields,
recipients, expiry and purpose; Tarai creates a redacted copy or a workspace
Matter record, records Motion, and writes per-recipient projections. The action
requires confirmation and approval when policy says so. Local-only data must be
explicitly promoted through this action before it can be shared.

## Sync lifecycle

1. Sign in -> Tarai resolves the account and returns Personal DB URL plus a
   short-lived read-only token.
2. TarApp opens a Personal replica with an async token callback and runs pull.
3. Pull on sign-in, foreground, connectivity recovery, push invalidation and
   manual refresh. Never poll every few seconds by default.
4. TarApp reads only its replica; device outbox/drafts use the separate local
   Device DB.
5. Logout, revocation and account switch close and securely delete both local
   files and platform-stored encryption keys. This deletion needs native
   integration verification before release.

The Sync SDK's `remoteEncryption` option applies to a remotely encrypted Turso
database protocol; it is not by itself proof that the device file is encrypted.
Release only after validating native file-at-rest encryption and wipe behavior
on Android and iOS.

## Projection and authorization policy

Every projection policy specifies recipients, roles, fields, row cap, expiry,
source version and tombstone conditions. A record with no explicit assignment
or policy is not broadcast; the transitional default is the workspace owner
only. Members read their Personal DB projections, never the Workspace DB.

## Canvas and workspace UI plan

Tarai derives a versioned canvas from the workspace description, enabled module
set, role policy and current projection availability. The app renders that
declarative canvas only; it never executes canvas SQL or JavaScript.

- **Glance:** offline/security notice and explicit Personal/Workspace mode.
- **Now:** at most three Tarai-provided primary blocks, selected from urgent
  inbox work, active flow stage and the workspace's declared operating module.
- **Act:** three typed chips from the canvas plus the intent field.
- **Matter:** typed lists and record sheets for people, organizations, catalog,
  orders, tickets, assets and documents.
- **Pipelines and flows:** pipeline-card shows only allowed transitions; a flow
  sheet shows pinned definition version, stage, assignee, deadline and history.
- **Inbox:** approvals, assigned work and signals are read from the Personal DB;
  completion is a Tarai action.
- **Configuration:** owners propose canvas changes, see permission impact, and
  apply a versioned patch with rollback.

The next delivery slice is: persist workspace description/module selection in
D1, compile it to a default canvas at provisioning, expose typed Tarai data
views, and replace the remaining generic UI fallbacks with those data views.
