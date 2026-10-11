# WhatsApp & Social — Plan

## Summary

- Zernio = transport for WhatsApp (and social, ads, SMS) behind one API key
- TAR owns all business facts; WhatsApp only carries messages
- Every message passes the TAR Gateway (permission, idempotency, audit unchanged)
- Target: our own Meta Tech Provider app, so no per-account middleman
- Build order: `wa.me` now → Zernio bridge → own Meta API (~month 6-12)

## Zernio features

| Area | Feature |
| --- | --- |
| Social | Post, schedule, reply, analytics across 16+ networks |
| Ads | 7 ad managers behind one API |
| Communication | WhatsApp, iMessage, SMS/MMS, calls; one inbox |
| Blogs | WordPress and Shopify articles |
| Integrate | 8 SDKs, REST, hosted MCP server |
| Trust | SOC 2, GDPR, 99.97% uptime |

## How TAR uses it

| Piece | Where / how |
| --- | --- |
| Transport | `channels/providers.ts` adds `whatsapp`; Zernio normalizes inbound to `ChannelEvent` |
| Sender | `resolveSender` maps phone → member identity |
| Inbound | same `commands.ts` / `jobs.ts` path; idempotency key `chat:${id}` |
| Outbound | `message.send` Channel Action, `reach = customer`; driven by source events, never by the model |
| Safety | `canExecute` + Gateway; no inventory, order, payment or accounting forked |

## Ordering flow (moved from launch.md)

1. Customer taps "Order on WhatsApp"
2. Order lands in shop's WhatsApp Business
3. TAR records it
4. Sales, stock, orders show in app
5. Catalog edit updates store → more orders

## Multi-tenant model

- One Zernio key
- One Zernio `profile` per merchant workspace (free)
- One WhatsApp number per profile (merchant's own WhatsApp Business number)

| TAR | Zernio |
| --- | --- |
| merchant workspace | `profile` |
| workspace WhatsApp number | connected `account` |
| connect | `GET /v1/connect/whatsapp` → Meta Embedded Signup → store `account` |

Limits of the model:

| Limit | Effect |
| --- | --- |
| Own number, not bought | no rental; messaging only, no Calls/SMS |
| One number per profile | merchants never share a number |
| WABA required | no personal WhatsApp; new number starts at 250 contacts/day |
| 24-hour window | outside it, outbound must use an approved template |
| Coexistence | merchant keeps WhatsApp Business app; 20 msg/s; no groups or calling |

## Costs

### Zernio (verified 2026, zernio.com/pricing, USD)

| Connected accounts | Price (USD) | Price (INR at ₹95.89) |
| --- | --- | --- |
| 1-2 | free | ₹0 |
| 3-10 | $6/account/mo | ₹575 |
| 11-100 | $3/account/mo | ₹288 |
| 101+ | $1/account/mo | ₹96 |

- Profiles: free
- Messages: first 10,000/month free, then metered. Zernio's pricing page does not show the rate; the earlier ₹96/block figure is unverified.
- Accounts are graduated, so 100 accounts cost about ₹30,520/month.

### Meta (direct, Tech Provider) — per Meta pricing page, effective 1 Oct 2026, India

| Item | Cost |
| --- | --- |
| Platform / Tech Provider | ₹0 |
| Service replies (customer-initiated) | first 1,000 per number/month free, then ₹0.145 |
| Utility template | ₹0.145 |
| Authentication template | ₹0.145 |
| Marketing template | ₹1.09 |

Earlier figures (₹0.115 utility, ₹0.86 marketing) are out of date.

### Per-message total with Zernio transport fee

Zernio fee per message = ₹96 per 10,000-message block ÷ 10,000 = **₹0.0096** (unverified: the rate is from the original plan, not on Zernio's pricing page; confirm in the Zernio dashboard).

| Message type | Meta (India) | + Zernio fee | Total per message |
| --- | --- | --- | --- |
| Utility | ₹0.145 | ₹0.0096 | ₹0.1546 |
| Authentication | ₹0.145 | ₹0.0096 | ₹0.1546 |
| Service (after 1,000 free) | ₹0.145 | ₹0.0096 | ₹0.1546 |
| Marketing | ₹1.09 | ₹0.0096 | ₹1.0996 |

Zernio's first 10,000 messages per month are free, so the ₹0.0096 applies only beyond that. The Meta service allowance (first 1,000 free) applies separately to Meta's charge.

### TAR pricing rule

- Merchants pay TAR in prepaid INR credits via UPI. No cards.
- Costs above are ours; the merchant plan price is set in [launch.md](launch.md).

## Interim options (checked 2026)

| Option | Fit for TAR |
| --- | --- |
| `wa.me` links | ₹0; no API; use from day 1 |
| Zernio | per-account, one profile per merchant; fits the model; costs ₹575/account at tier 3-10 |
| AiSensy | one number ↔ one client account; each merchant must sign up to AiSensy. Does not fit a multi-merchant platform. |
| Meta Tech Provider (direct) | ₹0 platform; fits the model; longest setup |
| WATI / Interakt / Gupshup | per-plan SaaS; not verified for one-number-per-merchant at our scale |

Partner route to check: AiSensy's ISV programme (own embedded signup, no AiSensy branding). Not verified.

## Onboarding — merchant side (Zernio / Meta)

Merchant needs:
- A WhatsApp Business number not already on the WhatsApp app (or delete the app on it)
- Meta Business Manager access as admin
- A business website (AiSensy's requirement; confirm for Meta)

TAR shows the merchant a plain flow: "Use this number" → "Continue" → Meta dialog → done.

### Connect flow (hidden from merchant)

```text
tarapp -> GET /v1/connect/whatsapp (profileId, redirect_url, headless=true)
       -> authUrl -> Meta dialog (login, WABA, own number) -> redirect_url -> store account
       -> tarapp picker only if step=select_phone_number -> webhooks live
```

Steps:

| Step | Call | Note |
| --- | --- | --- |
| Start | `GET /v1/connect/whatsapp?profileId&redirect_url&headless=true` | returns `authUrl` to Meta |
| Signup | Meta dialog | login, WABA, own number |
| Mode | `onboarding=business_app` (coexistence) or `api` | coexistence keeps the app; `api` enables groups and calling |
| Picker | `GET .../select-phone-number` → `POST .../complete` | only if several numbers |
| Store | parse `accountId` on redirect | write `account` on workspace |
| Webhooks | auto-subscribed on connect | route by `account` |

Caveat (Zernio route): Meta's dialog runs on Zernio's Meta app, so Meta may name the partner during consent. The Tech Provider route removes this: the dialog runs on TAR's app.

### Screens

Tools → Connect WhatsApp:

```text
+------------------------------------------+
| TOOLS / Northstar / Owner                |
|------------------------------------------|
| [T] Connect WhatsApp          NOT SET  > |
|     Northstar / channel                  |
+------------------------------------------+
```

Own number:

```text
+------------------------------------------+
| < Tools  Connect WhatsApp                |
| Northstar / Owner · +91 98xxx xxxxx      |
|------------------------------------------|
| Use this WhatsApp Business number        |
|   the number you already use in the app  |
|------------------------------------------|
| [Continue to Meta]                       |
+------------------------------------------+
```

Meta dialog:

```text
+------------------------------------------+
| Meta · WhatsApp Business Setup           |
|------------------------------------------|
| 1 log in to Meta                         |
| 2 create or pick a WABA                  |
| 3 pick your existing number              |
| 4 grant whatsapp_business_* scopes       |
|------------------------------------------|
| coexistence: scan QR from the WhatsApp   |
| Business app → merchant keeps the app    |
+------------------------------------------+
```

Picker (only if several numbers):

```text
step=select_phone_number, tempToken
+------------------------------------------+
| < Setup  Pick a number                   |
| +91 98xxx xxxxx   Sri Murugan  GREEN  >  |
| +91 90xxx xxxxx   Sri Murugan WABA    >  |
|------------------------------------------|
| [Connect]                                |
+------------------------------------------+
```

Connected:

```text
+------------------------------------------+
| < Setup  WhatsApp connected              |
| Northstar / WhatsApp                     |
|------------------------------------------|
| Number   +91 98xxx xxxxx                 |
| Account  acc_66b2e19d...                 |
| Quality  GREEN                           |
|------------------------------------------|
| [Set two-step PIN]  [Business profile]   |
| [Template]                    [Done]     |
+------------------------------------------+
```

Live:

```text
Meta → webhook → account → workspace → Gateway → Action
TAR  → message.send → Meta → customer

+------------------------------------------+
| Northstar / WhatsApp              LIVE   |
| Templates 3 approved                     |
| Tier 250 contacts/day → auto-raised      |
+------------------------------------------+
```

## Own Meta API (Tech Provider) — the tar-only path

```text
verify Meta Business → create Meta app → enrol Tech Provider
   → configure Embedded Signup (Facebook Login for Business)
   → App Review: 3 permissions → live
   → merchant connects inside TAR's own Embedded Signup
```

| # | Step | Self-serve | Cost | Time |
| --- | --- | --- | --- | --- |
| 1 | Verify Meta Business | yes | ₹0 | 2-7 days |
| 2 | Create Meta app | yes | ₹0 | minutes |
| 3 | Enrol as Tech Provider | yes | ₹0 | minutes |
| 4 | Configure Embedded Signup | yes | ₹0 | 1-2 weeks (dev) |
| 5 | App Review, advanced access | yes | ₹0 | 1-3 weeks |
| 6 | Go live | yes | ₹0 | first merchant same day |

Total ≈ 3-6 weeks; App Review can run 2-3 months.

Permissions:

| Permission | Why |
| --- | --- |
| `whatsapp_business_management` | onboard merchants; manage numbers, templates, webhooks |
| `whatsapp_business_messaging` | send and receive for them |
| `business_management` | find the WABA and portfolio to attach |
| `public_profile` | Facebook Login for Business during signup |

Build: reuses `channels/`; 1-2 weeks dev plus ongoing ops.

Success estimates (not Meta-published):

| Gate | Est. pass | Improve |
| --- | --- | --- |
| Business verification | ~90% | match legal name and address to documents |
| Tech Provider enrolment | ~99% | — |
| App Review, first pass | ~70% | screencast: number setup, message sent and received; public privacy policy; per-permission explanation |
| App Review, after resubmit | high | fix flagged items |
| Overall to live | ~85-90% | — |

Cost comparison (monthly, per merchant count):

| Merchants | Zernio ₹575 tier | Zernio ₹96 tier | Meta direct |
| --- | --- | --- | --- |
| 100 | ₹57,500 | ₹9,600 | ₹0 platform |
| 1,000 | ₹5,75,000 | ₹96,000 | ₹0 platform |

## Plan economics (moved from launch.md)

### Add-on pricing

- Merchant add-on: +₹100/month on top of base (₹600 total), for an own WhatsApp number.
- Zernio cost per account at tier 3-10: ₹575. The add-on is revenue toward that, not a full cover.
- Net per add-on account at tier 3-10 = ₹100 − ₹575 = −₹475/month, paid by us.
- Rule (launch): add a paid tier only after paid merchants cover its cost.

### Zernio blended cost per account

| Connected accounts | Blended per account |
| --- | --- |
| 3 | ₹192 |
| 10 | ₹460 (peak) |
| 100 | ₹305 |
| 1,000 | ₹117 |

Zernio cost is our side cost, with no per-merchant allocation in the model.

### Messaging cost (utility + service, no marketing)

Meta: utility ₹0.145/msg; service ₹0.145/msg after 1,000 free per number.
Zernio: first 10,000 messages/month free; then ₹96 per 10,000 (₹0.0096/msg, unverified).

| Messages / month | Mix | Meta | Zernio | Total |
| --- | --- | --- | --- | --- |
| 1,000 | service | ₹0 | ₹0 | ₹0 |
| 5,000 | service | ₹580 | ₹0 | ₹580 |
| 10,000 | service | ₹1,305 | ₹0 | ₹1,305 |
| 20,000 | service | ₹2,851 | ₹96 | ₹2,947 |
| 1,000 | utility | ₹145 | ₹0 | ₹145 |
| 10,000 | utility | ₹1,450 | ₹0 | ₹1,450 |
| 20,000 | utility | ₹2,900 | ₹96 | ₹2,996 |

- Per-merchant messaging is our cost, so it must be priced into the plan or add-on before launch.
- Marketing excluded by decision. If used later: ₹1.09/msg from Meta.

### Plan C messaging cost (up to 3 utility messages per order)

- Home: 90 orders/mo → ~₹39
- Small: 300 orders/mo → ~₹131
- Infra (~₹10/mo), merchant plan total and net per merchant: see [launch.md](launch.md).

### Own WhatsApp API timeline (summary)

| Step | Time | Cost | Needs |
| --- | --- | --- | --- |
| Verify Meta Business | 2-7 days | ₹0 | GST / business docs |
| Create Meta app | minutes | ₹0 | — |
| Tech Provider enrol | minutes | ₹0 | — |
| Embedded Signup (dev) | 1-2 weeks | our dev | — |
| App Review | 1-3 weeks | ₹0 | screencast, privacy policy, use-case notes |
| Go live | same day | ₹0 | first merchant |

- Total ≈ 3-6 weeks; App Review can run 2-3 months.
- Until approved: wa.me and Zernio keep orders running.

## Sources

- zernio.com/pricing; docs.zernio.com (WhatsApp, connection, webhooks, inbox, send message)
- developers.facebook.com/docs/whatsapp/pricing (checked for Oct 2026 rates)
- aisensy.com/pricing; wiki.aisensy.com (number rules, fee, apply)
- developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers/
- developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview/
