# Members and team chat

TAR owns workspace membership and business permissions. Canvas and Inbox are views; team chat is another input interface. Provider roles never grant TAR permissions.

## Deployment

Apply D1 migration `0003_team_chat.sql` before deploying the updated Worker. No Turso migration is required. Existing members retain their current access (`work_role=general`). Owner is protected; only owners can grant/change Manager access. Cook and Cashier are restricted member presets.

Configure any or all providers on the Worker. Unconfigured providers remain visible but cannot link. Keep secrets in Worker secrets or an ignored `.dev.vars`, never the client bundle.

| Provider | Required configuration | Provider setup |
|---|---|---|
| Slack | `SLACK_SIGNING_SECRET` | Register `/tar` with request URL `/v1/channels/slack/events`. Install the TAR Slack app in the team's Slack workspace. |
| Discord | `DISCORD_PUBLIC_KEY` | Set interactions URL `/v1/channels/discord/events`. Register the `/tar` command below and install in the team's server. |
| Google Chat | `GOOGLE_CHAT_AUDIENCE` | Set HTTP endpoint `/v1/channels/google-chat/events`. Use **HTTP endpoint URL** authentication audience, set this variable to that exact URL, and enable interaction events. Project-number JWT audience mode is not supported. |

Optional `SLACK_INSTALL_URL`, `DISCORD_INSTALL_URL`, `GOOGLE_CHAT_INSTALL_URL` point to your published app installation/setup pages. They must be HTTPS links. Provider app registration/distribution and any OAuth installation callback required by its published install link are deployment prerequisites, not implemented by TAR's identity proof flow. Each provider's account/organization installation policies still apply.

Discord application command registration:

```json
{"name":"tar","description":"Use your TAR workspace","type":1,"options":[{"name":"request","description":"TAR command, such as help or done <task-id>","type":3,"required":true}]}
```

## Owner setup and member onboarding

1. In a work workspace, open **Members & chat**. Add a member's Google email and role. Access activates when that verified Google identity next signs in; TAR does not send an invitation email automatically.
2. Choose Slack, Discord or Google Chat. Create/select a team destination in that provider and add the TAR app. Start **Link team channel** in TAR.
3. Send the generated command in the intended destination. The signed provider request supplies the destination and sender IDs. Review both in TAR and confirm. The owner is also linked automatically. Optionally supply the provider's invitation URL for other members.
4. Each member uses **Join team channel**, if necessary, then **Connect my account**. Send their short-lived command, refresh, review and confirm. No member IDs or business roles are entered in the provider.

Link tokens expire in ten minutes, are stored only as hashes, and can be proved once. Confirmation requires the initiating TAR account, live membership, and matching destination. An external identity cannot be shared by two TAR members in the same workspace. Replacing a destination requires disconnecting first, which clears its identity links and pending proofs.

## Commands and execution

Supported commands are `help`, `status`, `done <task-id>`, `start <order-id> <product-id>`, and `ready <order-id> <product-id>`. Use full TAR IDs; Google Chat users mention TAR, while Slack/Discord users use `/tar`. Payments, refunds and other consequential operations use the existing TAR screens. Free-form AI intent interpretation is not enabled.

Business commands are persisted in D1 before acknowledgement and queued by ID. Each attempt resolves the current destination, member identity and TAR permissions. A five-minute recovery scan repairs missed queue wakeups and expired leases; five attempts end in a visible failure. Gateway idempotency prevents repeating accepted effects after interruption. `status` and **Your recent chat requests** show outcomes; an acknowledgement means saved, not completed.

Replies are private/ephemeral and contain status rather than business payloads. Business data remains in TAR. This release does not mirror every order into group messages, create provider groups automatically, provision provider accounts, or remove people from the external platform. Members use the provider's invitation flow. Removing TAR membership deletes identity links and blocks subsequent chat Actions; existing provider conversations and memberships remain with the provider.

## Validation

`npm test` covers the D1 migrations, invitations, owner protection, role filtering, identity proof/confirmation, provider signature checks, expired/cross-channel links, revocation, and duplicate command recovery. Run `npm run check` and `wrangler deploy --dry-run` before deployment. Live installation and message delivery require configured provider apps and must be checked against each selected provider before enabling it for users.
