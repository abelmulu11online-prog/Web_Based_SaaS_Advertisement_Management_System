# Phase 6 — Subscriptions & Payments (Ethiopia)

> **Version:** 2.0.0
> **Phase:** 6 — Subscriptions & Payments
> **Status:** Planning
> **Last updated:** August 2026
> **Currency:** Ethiopian Birr (ETB)
> **Payment providers:** Chapa (Telebirr + CBE Birr + more)
> **Depends on:** Phase 5 (Advertisement System) ✅

---

## Table of Contents

1. [What This Phase Does](#1-what-this-phase-does)
2. [Why Ethiopian Payments Are Different From Stripe](#2-why-ethiopian-payments-are-different-from-stripe)
3. [Payment Provider Decision: Chapa](#3-payment-provider-decision-chapa)
4. [How Telebirr and CBE Birr Actually Work](#4-how-telebirr-and-cbe-birr-actually-work)
5. [The Big Picture — How It All Works](#5-the-big-picture--how-it-all-works)
6. [Subscription Plans — The Business Rules](#6-subscription-plans--the-business-rules)
7. [Database Design](#7-database-design)
8. [Payment Flow — Step by Step](#8-payment-flow--step-by-step)
9. [Webhook Security — The Most Critical Part](#9-webhook-security--the-most-critical-part)
10. [Manual Payment Verification Flow](#10-manual-payment-verification-flow)
11. [API Endpoints](#11-api-endpoints)
12. [Enforcement — Connecting Subscriptions to Advertisements](#12-enforcement--connecting-subscriptions-to-advertisements)
13. [Frontend Pages and Components](#13-frontend-pages-and-components)
14. [Error Codes](#14-error-codes)
15. [Database Migrations](#15-database-migrations)
16. [Security Checklist](#16-security-checklist)
17. [Testing Plan](#17-testing-plan)
18. [What Is NOT in Phase 6](#18-what-is-not-in-phase-6)
19. [Implementation Order](#19-implementation-order)
20. [Environment Variables Required](#20-environment-variables-required)
21. [Key Concept Summary](#21-key-concept-summary)

---

## 1. What This Phase Does

Phase 6 adds the **revenue engine** of the platform. Right now, any registered user can
create unlimited advertisements for free. That changes in this phase.

After Phase 6:

- Every advertiser must be on a **subscription plan** to publish listings.
- Plans are priced in **Ethiopian Birr (ETB)**.
- Payment is collected through **Telebirr**, **CBE Birr**, and other local Ethiopian methods
  via the **Chapa** payment gateway.
- A **free tier** exists so new users can try the platform without paying.
- Subscription status is checked **server-side, every time** before an advertiser can
  publish an advertisement.
- Subscriptions are **monthly** — not annual (can be added later).

### What does NOT change

- Public browsing of published advertisements remains free and open.
- Creating a DRAFT advertisement is still possible on the free tier.
- The advertisement lifecycle (DRAFT → PUBLISHED etc.) from Phase 5 is unchanged.
  Phase 6 adds a **gate** in front of the publish action.

---

## 2. Why Ethiopian Payments Are Different From Stripe

This is important to understand before writing a single line of code.

### The fundamental difference

| Stripe (International) | Chapa / Telebirr / CBE (Ethiopia) |
|---|---|
| Recurring subscriptions are managed by Stripe — they auto-charge the card each month | **No automatic recurring billing.** The user must manually pay each month. |
| Stripe sends a webhook when payment succeeds | Chapa sends a webhook when payment succeeds |
| Stripe handles failed payment retries automatically | You must remind the user and they re-initiate payment |
| One integration covers all cards globally | Need local integration for each method (Telebirr, CBE, etc.) — Chapa unifies these |
| Sandbox is easy to use with test cards | Chapa has a sandbox with test credentials |

### What this means for our system

Because there is no automatic recurring billing, our subscription model works differently:

- A subscription has a **start date** and an **end date** (30 days from payment).
- At the end of 30 days, the subscription **expires** unless the user pays again.
- We send a reminder notification before expiry (Phase 6 or later).
- If the user does not renew, their ads are automatically **paused**.
- Renewing means starting a **new payment flow** — the user pays again through
  Telebirr/CBE and gets another 30 days.

This is simpler than Stripe's subscription object, but requires you to manage the
billing cycle yourself.

---

## 3. Payment Provider Decision: Chapa

### Why Chapa, not direct Telebirr or CBE integration?

| Option | Problem |
|---|---|
| Direct Telebirr API | Requires a business agreement with Ethio Telecom, RSA key management, encrypted payloads (complex). Only handles Telebirr users. |
| Direct CBE Birr API | Separate integration entirely, different protocol, requires CBE business account. |
| **Chapa (recommended)** | **One integration covers Telebirr, CBE Birr, Awash, Dashen, M-Pesa, and more. Has a sandbox for development. Has a Node.js npm package. Ethiopian company, ETB-native.** |

Chapa ([chapa.co](https://chapa.co)) is an Ethiopian payment gateway — essentially
"Stripe for Ethiopia." It was built by Ethiopians, settles in ETB, and is the standard
choice for Ethiopian SaaS products.

### How Chapa works (high level)

1. Your backend calls Chapa's API: "I need to collect 299.99 ETB for this transaction"
2. Chapa gives you a `checkout_url`
3. You redirect the user to that URL
4. The user chooses their payment method (Telebirr, CBE Birr, etc.) on Chapa's hosted page
5. Payment completes on Chapa's servers
6. Chapa sends a webhook to your server: "tx_ref XYZ was paid"
7. Your backend verifies the webhook, then verifies the transaction with Chapa's API
8. You activate the subscription

This is very similar to Stripe Checkout — and that's intentional. The security model
is identical.

### Chapa API credentials you need

- `CHAPA_SECRET_KEY` — your server-side API key (starts with `CHASECK_`)
- `CHAPA_WEBHOOK_SECRET` — a secret hash you set in the Chapa dashboard for
  verifying webhook signatures

---

## 4. How Telebirr and CBE Birr Actually Work

Understanding what happens on the user's side helps you build a better experience.

### Telebirr (Ethio Telecom mobile money)

- Telebirr is a **mobile wallet** tied to an Ethiopian phone number (Ethio Telecom SIM).
- When a user pays via Telebirr through Chapa, they enter their phone number on
  Chapa's checkout page and confirm the payment with their Telebirr PIN on their phone.
- The user **does not need a bank account** — it is airtime-wallet-based.
- Very common for everyday users across Ethiopia.

### CBE Birr (Commercial Bank of Ethiopia mobile banking)

- CBE Birr is the **mobile banking app** of the Commercial Bank of Ethiopia.
- Users have a CBE bank account and pay using their CBE Birr app or card.
- More common among business users and people with formal bank accounts.

### What this means for you

You do not need to handle any of this. Chapa's hosted checkout page presents both
options (and more) to the user. Your code only sees:
- The amount you requested
- The `tx_ref` (transaction reference) you generated
- Whether Chapa tells you it was paid

---

## 5. The Big Picture — How It All Works

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        USER PAYMENT JOURNEY                                 │
│                                                                             │
│  1. User on free plan tries to publish a 2nd ad → blocked (plan limit)     │
│  2. User visits /pricing → sees plan options in ETB                        │
│  3. User clicks "Subscribe to Pro (299.99 ETB/month)"                      │
│                                                                             │
│  4. Our backend:                                                            │
│     - Generates a unique tx_ref (e.g. "sub_userid_timestamp")              │
│     - Saves a PENDING payment record in the DB                             │
│     - Calls Chapa API: "initialize transaction for 299.99 ETB"             │
│     - Chapa returns a checkout_url                                         │
│     - Backend returns checkout_url to the frontend                         │
│                                                                             │
│  5. Frontend redirects user to Chapa's hosted checkout page                │
│     (User sees Telebirr / CBE Birr / other payment options)                │
│                                                                             │
│  6. User pays using Telebirr on their phone                                │
│                                                                             │
│  7. TWO things happen simultaneously:                                       │
│     A. Chapa sends a webhook to our server (instant notification)          │
│     B. Chapa redirects the user back to our callback_url                   │
│                                                                             │
│  8. Webhook handler (server-side):                                         │
│     - Verifies HMAC signature using CHAPA_WEBHOOK_SECRET                  │
│     - Checks payment_events table (idempotency)                            │
│     - Calls Chapa Verify API to double-check the payment                   │
│     - Updates user_subscriptions: ACTIVE, +30 days                        │
│     - Writes to payment_events log                                         │
│                                                                             │
│  9. User arrives at our success page                                        │
│     - Frontend fetches GET /api/subscriptions/my                           │
│     - Shows: "You are now on the Pro plan — valid until [date]"            │
│                                                                             │
│ 10. User can now publish up to 20 ads                                      │
└────────────────────────────────────────────────────────────────────────────┘
```

### The double-verification principle

Notice steps 7A and 7B. We do not trust the redirect alone (anyone could visit the
success URL manually). We do not fully trust the webhook alone either.

After receiving the webhook we call **Chapa's Verify API**:
```
GET https://api.chapa.co/v1/transaction/verify/{tx_ref}
Authorization: Bearer CHASECK_your_secret_key
```

Only if this returns `status: "success"` do we activate the subscription.
This is the double-verification principle — the webhook tells us to check,
the verify call confirms the truth.

---

## 6. Subscription Plans — The Business Rules

### Plan tiers (in Ethiopian Birr)

| Plan | Price (ETB/month) | Max Active Ads | Max Images/Ad | Features |
|---|---|---|---|---|
| **FREE** | 0 ETB | 1 | 3 | Basic listing |
| **BASIC** | 99 ETB/month | 5 | 5 | Standard listing |
| **PRO** | 299 ETB/month | 20 | 10 | Featured badge, priority placement |
| **BUSINESS** | 799 ETB/month | 100 | 10 | All PRO + analytics (Phase 8) |

> These prices are stored in the `subscription_plans` database table.
> Changing prices means a DB update, not a code deploy.

### Subscription lifecycle

```
  ┌─────────────────────────────────────────────────────────────┐
  │                        FREE                                  │
  │  Auto-assigned on registration. No payment. No expiry.      │
  └───────────────────────┬─────────────────────────────────────┘
                          │ user pays
                          ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                       ACTIVE                                 │
  │  Paid plan. Full features. Expires in 30 days.              │
  └──────┬──────────────────────────────────┬───────────────────┘
         │                                  │
         │ user renews before expiry         │ user does not renew
         │                                  ▼
         │                    ┌─────────────────────────────────┐
         │                    │           EXPIRED                │
         │                    │  Plan lapsed. Ads auto-paused.  │
         │                    │  Downgraded to FREE.            │
         │                    └─────────────────────────────────┘
         │
         │ user pays again (new 30-day cycle)
         ▼
      ACTIVE (new period)
```

### Rules

- Every new user gets the **FREE plan** automatically (database trigger).
- A paid subscription lasts exactly **30 days** from the payment confirmation date.
- There is no automatic renewal — the user must pay again.
- If a subscription expires, the user's PUBLISHED ads are **automatically paused** by
  a scheduled job that runs daily.
- The user can reactivate by paying for another month at any time.
- Upgrading mid-month is allowed — the new plan takes effect immediately.
  No prorating (keep it simple for now).

### The "can I publish?" check

Before any advertisement is published:

```
1. Does the user have an ACTIVE subscription AND current_period_end > NOW()?
   → if no: block (402 SUBSCRIPTION_REQUIRED)

2. What plan are they on? → get plan limits

3. How many PUBLISHED ads do they currently have?
   → count from DB atomically

4. Is count < plan.max_active_ads?
   → if no: block (409 PLAN_LIMIT_REACHED)

5. OK — allow publish
```

---

## 7. Database Design

### Tables overview

```
subscription_plans          — the plan catalogue (FREE, BASIC, PRO, BUSINESS)
      │
      │ (one plan has many subscriptions)
      ▼
user_subscriptions          — which plan each user is on, and its status/expiry
      │
      │ (one subscription has many payment records)
      ▼
payment_records             — every payment attempt (PENDING, SUCCESS, FAILED)
      │
      │ (every webhook received is logged here)
      ▼
payment_events              — immutable log of every Chapa webhook event received
```

### 7.1 `subscription_plans` table (migration 016)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | TEXT | `FREE`, `BASIC`, `PRO`, `BUSINESS` |
| `display_name` | TEXT | Human-readable: "Pro Plan" |
| `price_etb` | NUMERIC(10,2) | In ETB. `0.00` for FREE |
| `max_active_ads` | INTEGER | How many PUBLISHED ads at once |
| `max_images_per_ad` | INTEGER | Image limit per advertisement |
| `is_featured` | BOOLEAN | Ads get a "Featured" badge |
| `is_active` | BOOLEAN | `false` = plan retired |
| `sort_order` | INTEGER | Display order on pricing page |
| `created_at` | TIMESTAMPTZ | Auto-set |

### 7.2 `user_subscriptions` table (migration 017)

One row per user. Updated only by the payment webhook handler and the expiry job.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `users(id)` CASCADE. **UNIQUE** (one sub per user) |
| `plan_id` | UUID | FK → `subscription_plans(id)` RESTRICT |
| `status` | subscription_status enum | `FREE`, `ACTIVE`, `EXPIRED` |
| `current_period_start` | TIMESTAMPTZ | When current paid period started. NULL for FREE. |
| `current_period_end` | TIMESTAMPTZ | When current paid period ends. NULL for FREE (never expires). |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-updated |

**Custom enum:**
```sql
CREATE TYPE subscription_status AS ENUM (
  'FREE',      -- on free plan, no payment required, no expiry
  'ACTIVE',    -- on a paid plan, current_period_end is in the future
  'EXPIRED'    -- paid plan ended, downgraded to FREE behaviour until renewed
);
```

**Indexes:**
- `UNIQUE idx_user_sub_user_id` — one subscription per user
- `idx_user_sub_status` — for queries like "find all EXPIRED subscriptions"
- `idx_user_sub_period_end` — for the daily expiry job

### 7.3 `payment_records` table (migration 018)

Tracks every payment attempt. One record per payment, including failed ones.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `users(id)` CASCADE |
| `plan_id` | UUID | FK → `subscription_plans(id)` RESTRICT |
| `tx_ref` | TEXT | **UNIQUE.** Our generated reference. Format: `sub_{userId}_{timestamp}` |
| `chapa_tx_id` | TEXT | Chapa's own transaction ID (filled after payment) |
| `amount_etb` | NUMERIC(10,2) | Amount charged in ETB |
| `status` | payment_record_status enum | `PENDING`, `SUCCESS`, `FAILED` |
| `payment_method` | TEXT | e.g. `telebirr`, `cbe_birr` (filled by webhook) |
| `chapa_response` | JSONB | Full verify response from Chapa (for audit) |
| `created_at` | TIMESTAMPTZ | When user initiated checkout |
| `updated_at` | TIMESTAMPTZ | When status was last changed |

**Custom enum:**
```sql
CREATE TYPE payment_record_status AS ENUM (
  'PENDING',   -- checkout started, user has not paid yet
  'SUCCESS',   -- payment confirmed by Chapa verify API
  'FAILED'     -- payment failed or expired without completion
);
```

**Indexes:**
- `UNIQUE idx_payment_records_tx_ref` — fast lookup by our transaction reference
- `idx_payment_records_user_id` — user payment history
- `idx_payment_records_status` — find pending/failed payments

### 7.4 `payment_events` table (migration 019)

Immutable audit log of every webhook POST Chapa sends us.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `chapa_tx_ref` | TEXT | The tx_ref from the webhook payload |
| `event_type` | TEXT | Chapa event type (e.g. `charge.completed`) |
| `payload` | JSONB | Full raw webhook payload |
| `processed_at` | TIMESTAMPTZ | When we handled it |
| `created_at` | TIMESTAMPTZ | Auto-set |

**Index:**
- `UNIQUE idx_payment_events_tx_ref` — idempotency: do not process the same tx_ref twice

---

## 8. Payment Flow — Step by Step

### Flow A: User subscribes to a paid plan

```
STEP 1 — User chooses a plan
  Frontend: user clicks "Subscribe to Pro (299 ETB/month)"
  → POST /api/subscriptions/checkout
  → Body: { plan_id: "uuid-of-pro-plan" }
  → authenticate middleware runs → req.user.id is set

STEP 2 — Backend initializes the Chapa transaction
  - Generate a unique tx_ref: "sub_<userId>_<unixTimestampMs>"
  - Save a PENDING record in payment_records table
  - Call Chapa API:
      POST https://api.chapa.co/v1/transaction/initialize
      Authorization: Bearer CHASECK_your_key
      Body: {
        amount: "299.99",
        currency: "ETB",
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        tx_ref: "sub_abc123_1724000000000",
        callback_url: "https://yoursite.com/subscription/callback",
        return_url: "https://yoursite.com/subscription/success",
        customization: {
          title: "Pro Plan Subscription",
          description: "Monthly subscription to the Pro plan"
        }
      }
  - Chapa returns: { status: "success", data: { checkout_url: "https://checkout.chapa.co/..." } }
  - Backend returns checkout_url to frontend

STEP 3 — User is redirected to Chapa's hosted checkout
  - User sees: "Pay with Telebirr / CBE Birr / Awash / etc."
  - User picks Telebirr, enters their phone number
  - Telebirr sends a USSD prompt to user's phone: "Confirm payment of 299.99 ETB?"
  - User confirms with their Telebirr PIN

STEP 4 — Two things happen simultaneously:

  A. Chapa sends a webhook to our server:
     POST /api/subscriptions/webhook
     Header: x-chapa-signature: <HMAC-SHA256 signature>
     Body: { tx_ref: "sub_abc123_...", status: "success", ... }

  B. Chapa redirects user to our return_url:
     https://yoursite.com/subscription/success?tx_ref=sub_abc123_...

STEP 5 — Webhook handler processes the payment (server-side only)
  1. Verify HMAC signature (see Section 9)
  2. Check payment_events: is this tx_ref already in the table? → if yes, return 200 and stop
  3. Log the event into payment_events immediately (before any other DB work)
  4. Call Chapa Verify API to confirm:
       GET https://api.chapa.co/v1/transaction/verify/sub_abc123_...
       Authorization: Bearer CHASECK_your_key
  5. Check verify response: status === "success" AND amount matches plan price
  6. Update payment_records: status = SUCCESS, chapa_tx_id, payment_method
  7. Update user_subscriptions:
       SET plan_id = pro_plan_id,
           status = 'ACTIVE',
           current_period_start = NOW(),
           current_period_end = NOW() + INTERVAL '30 days'
  8. Return 200 to Chapa

STEP 6 — User sees the success page
  - Frontend calls GET /api/subscriptions/my
  - Returns: status=ACTIVE, plan=PRO, expires 30 days from now
  - User can now publish up to 20 ads
```

### Flow B: Subscription expires (user did not renew)

```
Daily cron job runs at midnight:

SELECT * FROM user_subscriptions
WHERE status = 'ACTIVE'
  AND current_period_end < NOW();

For each expired subscription:
  1. UPDATE user_subscriptions SET status = 'EXPIRED' WHERE id = $id
  2. UPDATE user_subscriptions SET plan_id = free_plan_id WHERE id = $id
  3. UPDATE advertisements SET status = 'PAUSED'
     WHERE user_id = $userId AND status = 'PUBLISHED'
  4. Log: "User $userId subscription expired, X ads paused"
  5. (Future Phase): Send renewal reminder email
```

### Flow C: User renews an expired subscription

The renewal flow is **identical to Flow A**. There is no special "renew" endpoint.
The user simply pays again — the webhook handler updates `current_period_end` to
`NOW() + 30 days` and sets `status = 'ACTIVE'`. Their paused ads are NOT
automatically re-published (the user re-publishes them manually to avoid publishing
stale ads they forgot about).

---

## 9. Webhook Security — The Most Critical Part

This section is the most important in the entire document. Read it carefully.

### The threat

Anyone on the internet can send a POST request to `/api/subscriptions/webhook`.
Without protection, an attacker could send a fake "payment succeeded" event and
get a free Pro subscription. This is webhook spoofing.

### Chapa's webhook signature (x-chapa-signature)

When Chapa sends a webhook, it includes an `x-chapa-signature` header. This is an
**HMAC-SHA256** hash computed over the raw request body using your
`CHAPA_WEBHOOK_SECRET`.

```
x-chapa-signature = HMAC-SHA256(CHAPA_WEBHOOK_SECRET, rawRequestBody)
```

Your verification code:

```javascript
import crypto from 'crypto';

function verifyChapaWebhook(rawBody, signatureHeader) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.CHAPA_WEBHOOK_SECRET)
    .update(rawBody)           // rawBody must be a Buffer or string — NOT parsed JSON
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  const expected = Buffer.from(expectedSignature, 'hex');
  const received = Buffer.from(signatureHeader, 'hex');

  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(expected, received);
}
```

**If verification fails → return HTTP 400 immediately. Do not process. Do not log
the contents (could be a probe). Do log the IP.**

### Raw body requirement (same as Stripe)

The webhook route must use `express.raw()` — not `express.json()` — because you
need the original bytes to recompute the hash:

```javascript
// In app.js — this must come BEFORE app.use(express.json())
app.use(
  '/api/subscriptions/webhook',
  express.raw({ type: 'application/json' }),
  webhookRouter
);

// Global body parser for all other routes
app.use(express.json({ limit: '1mb' }));
```

### Idempotency — the second line of defence

Chapa may deliver the same webhook more than once (network retries). Before processing
any webhook:

```javascript
const existing = await db.query(
  'SELECT id FROM payment_events WHERE chapa_tx_ref = $1',
  [txRef]
);
if (existing.rows.length > 0) {
  return res.status(200).json({ received: true }); // already handled
}

// Insert into payment_events FIRST (before any subscription update)
// This acts as a distributed lock — if two instances process simultaneously,
// the UNIQUE constraint on chapa_tx_ref will reject the second one.
await db.query(
  'INSERT INTO payment_events (chapa_tx_ref, event_type, payload, processed_at) VALUES ($1, $2, $3, NOW())',
  [txRef, eventType, JSON.stringify(payload)]
);
```

### Double-verification — the third line of defence

Even after a valid signature, we call Chapa's Verify API to independently confirm
the payment. Why? Because a signature only proves Chapa sent the message — it does
not protect against Chapa's own systems having a bug that sends a "success" event
for a payment that actually failed.

```javascript
const verifyResponse = await fetch(
  `https://api.chapa.co/v1/transaction/verify/${txRef}`,
  { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` } }
);
const data = await verifyResponse.json();

if (data.status !== 'success') {
  // Log this — it means the webhook said success but verify says no
  logger.error({ txRef, data }, 'Webhook/verify mismatch — not activating subscription');
  return res.status(200).json({ received: true }); // tell Chapa we got it
}

// Also verify the amount matches what we expected
const paymentRecord = await getPaymentRecordByTxRef(txRef);
if (parseFloat(data.data.amount) !== parseFloat(paymentRecord.amount_etb)) {
  logger.error({ txRef }, 'Amount mismatch — possible tampering');
  return res.status(200).json({ received: true });
}
```

### Three layers of defence summary

```
Layer 1: HMAC signature check   → proves the webhook came from Chapa
Layer 2: Idempotency check      → prevents the same event being processed twice
Layer 3: Verify API call        → independently confirms the payment is real and amount is correct
```

All three layers must pass before the subscription is activated.

---

## 10. Manual Payment Verification Flow

Chapa handles the webhook automatically, but sometimes users may come back to the
site after payment and the webhook hasn't arrived yet (network delay).

For these cases, a **"Check my payment status"** button on the success page triggers:

```
GET /api/subscriptions/payment-status/:tx_ref

→ Backend calls Chapa Verify API directly
→ If paid: activate subscription (same logic as webhook)
→ If pending: return { status: "pending" }
→ Frontend shows appropriate message
```

This is a fallback, not the primary flow. The webhook is always the primary.

---

## 11. API Endpoints

Base path: `/api/subscriptions`

### Public endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/subscriptions/plans` | List all active plans with ETB pricing |

### Authenticated endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/subscriptions/my` | Current subscription, plan details, and usage |
| `POST` | `/api/subscriptions/checkout` | Initialize Chapa checkout, returns `checkout_url` |
| `GET` | `/api/subscriptions/payment-status/:tx_ref` | Manual fallback: check a payment status |
| `GET` | `/api/subscriptions/history` | User's payment history |

### Webhook endpoint (called by Chapa only)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/subscriptions/webhook` | Chapa webhook receiver — HMAC-verified only |

### Response examples

#### GET /api/subscriptions/plans
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "FREE",
      "display_name": "Free",
      "price_etb": 0,
      "max_active_ads": 1,
      "max_images_per_ad": 3,
      "is_featured": false
    },
    {
      "id": "uuid",
      "name": "PRO",
      "display_name": "Pro",
      "price_etb": 299.00,
      "max_active_ads": 20,
      "max_images_per_ad": 10,
      "is_featured": true
    }
  ]
}
```

#### GET /api/subscriptions/my
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "ACTIVE",
    "current_period_end": "2026-09-24T00:00:00Z",
    "days_remaining": 29,
    "plan": {
      "name": "PRO",
      "display_name": "Pro",
      "price_etb": 299.00,
      "max_active_ads": 20,
      "max_images_per_ad": 10,
      "is_featured": true
    },
    "usage": {
      "active_ads": 7,
      "remaining_ads": 13
    }
  }
}
```

#### POST /api/subscriptions/checkout
```json
// Request
{ "plan_id": "uuid-of-pro-plan" }

// Response
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.chapa.co/checkout/payment/...",
    "tx_ref": "sub_abc123_1724000000000"
  }
}
```

---

## 12. Enforcement — Connecting Subscriptions to Advertisements

### Where the enforcement lives

The check is added to `advertisements.service.js` in the `publishAdvertisement`
function. This is the only code path that can move an ad to PUBLISHED status.
The check cannot be bypassed from a client.

### The updated publish flow

```javascript
// In advertisements.service.js — publishAdvertisement()

export async function publishAdvertisement(id, userId) {
  // [existing: fetch ad, verify ownership, check current status]

  // ── NEW: Subscription enforcement ──────────────────────────────────────
  const subscription = await subsRepo.findActiveByUserId(userId);

  const isOnFreePlan = !subscription || subscription.status === 'FREE';
  const hasExpired = subscription?.status === 'EXPIRED';
  const isActive = subscription?.status === 'ACTIVE'
                   && new Date(subscription.current_period_end) > new Date();

  if (!isActive && !isOnFreePlan) {
    throw createError(
      'Your subscription has expired. Please renew to publish advertisements.',
      402,
      'SUBSCRIPTION_REQUIRED'
    );
  }

  const plan = subscription.plan;
  const activeAdCount = await adsRepo.countPublishedByUserId(userId);

  if (activeAdCount >= plan.max_active_ads) {
    throw createError(
      `Your ${plan.display_name} plan allows ${plan.max_active_ads} active ad(s). ` +
      `Upgrade your plan or archive an existing ad first.`,
      409,
      'PLAN_LIMIT_REACHED'
    );
  }
  // ── End enforcement ─────────────────────────────────────────────────────

  // [existing: updateStatus, log, return]
}
```

### Image limit enforcement

In `advertisements.service.js` — `addImage()`:

```javascript
// Get plan limit instead of hardcoded MAX_IMAGES
const subscription = await subsRepo.findActiveByUserId(userId);
const planImageLimit = subscription?.plan?.max_images_per_ad ?? 3; // FREE fallback

if (imageCount >= planImageLimit) {
  throw createError(
    `Your ${subscription?.plan?.display_name || 'Free'} plan allows ` +
    `${planImageLimit} images per advertisement.`,
    409,
    'IMAGE_LIMIT_REACHED'
  );
}
```

---

## 13. Frontend Pages and Components

### New routes

| Path | Component | Auth | Description |
|---|---|---|---|
| `/pricing` | `PricingPage` | Public | Plan comparison with ETB pricing and Subscribe buttons |
| `/dashboard/subscription` | `SubscriptionPage` | Protected | Current plan, usage bar, expiry countdown, renew button |
| `/subscription/success` | `SubscriptionSuccessPage` | Protected | Post-payment confirmation page |
| `/subscription/callback` | `PaymentCallbackPage` | Protected | Handles Chapa redirect, polls payment status |

### New components

```
frontend/src/features/subscriptions/
├── components/
│   ├── PlanCard.jsx              ← one plan in the pricing grid (price in ETB)
│   ├── PlanComparisonTable.jsx   ← feature comparison table
│   ├── SubscriptionStatus.jsx    ← current plan badge + expiry date in dashboard
│   ├── UsageBar.jsx              ← "7 of 20 ads used" progress bar
│   └── ExpiryCountdown.jsx       ← "Expires in 3 days — Renew Now" banner
└── hooks/
    └── useSubscriptions.js       ← React Query hooks
```

### React Query hooks

```javascript
// Query hooks
useSubscriptionPlans()            // GET /api/subscriptions/plans  (stale: 1 hour)
useMySubscription()               // GET /api/subscriptions/my
usePaymentHistory()               // GET /api/subscriptions/history
usePaymentStatus(txRef)           // GET /api/subscriptions/payment-status/:tx_ref

// Mutation hooks
useCreateCheckoutSession()        // POST /api/subscriptions/checkout
```

### Dashboard upgrade prompts (added to Phase 5's DashboardPage)

Show a banner when:
- User is on FREE and has 1 ad published (limit reached) → "Upgrade to publish more"
- Subscription expires in ≤ 7 days → "Your plan expires in X days — Renew now"
- Subscription status is EXPIRED → "Your subscription has expired — Renew to re-publish"

---

## 14. Error Codes

| HTTP | Code | Meaning |
|---|---|---|
| 402 | `SUBSCRIPTION_REQUIRED` | Subscription expired or missing — cannot publish |
| 409 | `PLAN_LIMIT_REACHED` | Active ad count is at plan maximum |
| 409 | `IMAGE_LIMIT_REACHED` | Image count is at plan maximum for this ad |
| 404 | `PLAN_NOT_FOUND` | `plan_id` does not reference an active plan |
| 409 | `ALREADY_ON_ACTIVE_PLAN` | User already has an active paid subscription |
| 409 | `FREE_PLAN_NO_CHECKOUT` | Cannot create a Chapa checkout for the FREE plan |
| 400 | `WEBHOOK_SIGNATURE_INVALID` | Chapa HMAC signature check failed |
| 400 | `PAYMENT_AMOUNT_MISMATCH` | Verified amount does not match expected plan price |
| 404 | `PAYMENT_NOT_FOUND` | tx_ref does not match any payment record |
| 422 | `VALIDATION_ERROR` | Request body failed validation |

---

## 15. Database Migrations

| File | Creates |
|---|---|
| `016_create_subscription_plans.sql` | `subscription_plans` table, seeded with 4 plans in ETB |
| `017_create_user_subscriptions.sql` | `subscription_status` enum, `user_subscriptions` table |
| `018_create_payment_records.sql` | `payment_record_status` enum, `payment_records` table |
| `019_create_payment_events.sql` | `payment_events` audit log table |
| `020_add_free_subscription_trigger.sql` | Trigger: auto-creates FREE subscription on new user |

### Migration 020 detail — auto-assign FREE plan trigger

```sql
CREATE OR REPLACE FUNCTION assign_free_subscription()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id
  FROM subscription_plans
  WHERE name = 'FREE'
  LIMIT 1;

  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, free_plan_id, 'FREE');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assign_free_subscription
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION assign_free_subscription();
```

This runs inside the database. Every new user — whether created by your API, a seed
script, admin tools, or tests — automatically gets a FREE subscription. No application
code needed.

---

## 16. Security Checklist

Work through every item before marking Phase 6 as complete.

### Chapa keys
- [ ] `CHAPA_SECRET_KEY` is in `.env`, never logged, never returned in any API response
- [ ] `CHAPA_WEBHOOK_SECRET` is in `.env`, never logged, never in any response
- [ ] Both are in `.env.example` as empty placeholders with descriptive comments
- [ ] `config/index.js` reads both via the `env()` helper with `requiredInProd = true`

### Webhook handler
- [ ] `/api/subscriptions/webhook` route uses `express.raw()`, mounted BEFORE `express.json()`
- [ ] HMAC verification runs before any DB query
- [ ] `crypto.timingSafeEqual()` used for signature comparison (not `===`)
- [ ] Failed signature returns `400`, logs the IP, and stops — nothing else
- [ ] `payment_events` is checked for duplicate `chapa_tx_ref` before processing
- [ ] `payment_events` row is inserted FIRST, then subscription update (atomic ordering)
- [ ] Chapa Verify API is called to double-confirm the payment
- [ ] Amount is cross-checked against the expected plan price
- [ ] Webhook handler always returns `200` to Chapa after processing
  (non-200 causes Chapa to retry — only intentional)

### Subscription status
- [ ] `status` in `user_subscriptions` is NEVER written from a client request body
- [ ] The only writers are: webhook handler, expiry cron job
- [ ] `current_period_end` is NEVER accepted from the client

### Checkout
- [ ] `tx_ref` is generated by the backend using `crypto.randomUUID()` or similar —
  never from the client
- [ ] The `user_id` is taken from `req.user.id` (JWT) — never from the request body
- [ ] FREE plan triggers `409 FREE_PLAN_NO_CHECKOUT` before calling Chapa
- [ ] Amount sent to Chapa is taken from `subscription_plans` table — never from client

### Enforcement
- [ ] Subscription check in `publishAdvertisement()` runs BEFORE the DB status update
- [ ] Expiry date is checked (not just status — status could be stale between cron runs)
- [ ] Image limit uses plan limit, not hardcoded constant
- [ ] Both enforcement points are covered by tests

---

## 17. Testing Plan

```
backend/tests/subscriptions.test.js
```

### Test cases

| Category | Tests |
|---|---|
| **Plans API** | Returns 4 active plans with ETB prices; inactive plans not returned; no auth required |
| **My subscription** | New user has FREE plan; 401 without auth; returns usage counts |
| **Checkout** | Returns checkout_url for valid paid plan; 409 for FREE plan; 401 without auth; tx_ref stored as PENDING |
| **Webhook — signature** | Valid HMAC → processes; wrong secret → 400; missing header → 400 |
| **Webhook — idempotency** | Duplicate tx_ref → 200, no DB change, subscription unchanged |
| **Webhook — verify mismatch** | Webhook says success, mock verify says failed → subscription NOT activated |
| **Webhook — amount mismatch** | Verified amount < plan price → subscription NOT activated |
| **Webhook — success** | Valid webhook + valid verify → subscription ACTIVE, period_end = +30 days |
| **Enforcement — publish** | FREE user can publish 1 ad; FREE user blocked on 2nd (409); ACTIVE PRO user can publish 20; 21st blocked (409); EXPIRED user blocked (402) |
| **Enforcement — images** | FREE user capped at 3 images; PRO user capped at 10; upgrading mid-session uses new limit |
| **Expiry job** | ACTIVE subscription past period_end gets marked EXPIRED; published ads are paused |
| **Renewal** | EXPIRED user pays again → ACTIVE, new period_end, paused ads remain paused (user re-publishes manually) |
| **Auto-assign** | New user registration auto-creates FREE subscription row |
| **Payment history** | Returns all payment records for the user; 401 without auth |

---

## 18. What Is NOT in Phase 6

| Feature | Phase |
|---|---|
| Renewal reminder emails/SMS | Phase 6 stretch goal or Phase 8 |
| Annual billing / discount | Future |
| Admin subscription management | Phase 8 |
| Refund processing via Chapa | Future |
| Usage analytics per plan | Phase 8 |
| Interactive map, GPS | Phase 7 |
| S3 image upload | Phase 9 |

---

## 19. Implementation Order

Follow this exact order. Each step builds on the previous one.

```
STEP 1 — Set up Chapa account
  - Register at chapa.co (use test/sandbox mode for development)
  - Get your CHASECK_test_... secret key from the dashboard
  - Set a Webhook Secret in the dashboard (you choose this string)
  - Note: you will need a real business account for production

STEP 2 — Database migrations
  - Write and run migrations 016 through 020
  - Verify: existing users do NOT yet have a subscription row (trigger fires on new inserts)
  - Verify: creating a new test user auto-creates a FREE subscription row

STEP 3 — Backend: read-only endpoints
  - subscriptions.repository.js: findPlans(), findByUserId(), findByTxRef()
  - subscriptions.service.js: listPlans(), getMySubscription()
  - subscriptions.controller.js: GET handlers
  - subscriptions.routes.js: GET /plans, GET /my
  - Test: GET /api/subscriptions/plans → returns 4 plans

STEP 4 — Backend: webhook handler (do this BEFORE checkout)
  - Create subscriptions.webhook.js
  - Mount with express.raw() BEFORE express.json() in app.js
  - Implement signature verification using crypto.timingSafeEqual()
  - Implement idempotency check against payment_events
  - Implement Chapa Verify API call
  - Implement subscription activation: UPDATE user_subscriptions
  - Test with Chapa's test webhook tool in the dashboard
  - Write webhook tests before moving to checkout

STEP 5 — Backend: checkout endpoint
  - POST /api/subscriptions/checkout
  - Generate tx_ref
  - Save PENDING payment_record
  - Call Chapa initialize API
  - Return checkout_url
  - Test end-to-end in sandbox: pay with test Telebirr number

STEP 6 — Backend: payment status fallback endpoint
  - GET /api/subscriptions/payment-status/:tx_ref
  - Calls Chapa Verify API
  - Activates subscription if confirmed (same logic as webhook)

STEP 7 — Enforcement
  - Add subscription check to advertisements.service.js publishAdvertisement()
  - Add plan-aware image limit to advertisements.service.js addImage()
  - Test: FREE user cannot publish a 2nd ad

STEP 8 — Expiry cron job
  - Write a daily job: find ACTIVE subscriptions past period_end
  - Mark them EXPIRED, downgrade to FREE plan_id, pause their published ads
  - Use node-cron or a simple setInterval (upgrade to proper job queue in Phase 9)

STEP 9 — Frontend
  - PricingPage (ETB prices, plan comparison)
  - SubscriptionPage in dashboard (status, usage bar, expiry countdown)
  - PaymentCallbackPage (handles return from Chapa, polls /payment-status)
  - SubscriptionSuccessPage
  - Dashboard upgrade banners (7-day expiry warning, limit reached)

STEP 10 — Tests
  - Write all test cases from Section 17
  - Run full test suite — all Phase 5 tests must still pass
```

---

## 20. Environment Variables Required

Add to `backend/.env` and `backend/.env.example`:

```bash
# Chapa (Ethiopian payment gateway)
# Get these from your Chapa dashboard at chapa.co
# Use CHASECK_test_... for development/sandbox
CHAPA_SECRET_KEY=CHASECK_test_...
# Set this string yourself in the Chapa dashboard → Developer → Webhooks
CHAPA_WEBHOOK_SECRET=your_webhook_secret_string_here
```

---

## 21. Key Concept Summary (Plain English)

Before you start coding, make sure you understand these five ideas:

**1. There is no automatic recurring billing in Ethiopia.**
Ethiopian payment methods (Telebirr, CBE Birr) do not support automatic monthly charges
like a credit card subscription. Each month the user must initiate a new payment manually.
Your system tracks the expiry date and nudges the user to renew.

**2. Chapa is the bridge between your app and all Ethiopian payment methods.**
Instead of integrating Telebirr and CBE separately (complex, requires separate business
agreements), Chapa provides one API that covers both — and also Awash, Dashen, M-Pesa,
and others. You integrate Chapa once.

**3. Three security layers protect every payment: signature → idempotency → verify.**
The webhook signature proves Chapa sent it. The idempotency check prevents duplicates.
The Verify API call independently confirms the payment is real and the amount is correct.
All three must pass before you activate a subscription.

**4. The database is the source of truth. The client can never write subscription status.**
A user's subscription status is only ever changed by: the webhook handler (payment confirmed)
or the expiry cron job (period ended). No API endpoint accepts status from the request body.

**5. The free plan is a valid, permanent subscription — not a missing subscription.**
Every user always has exactly one row in `user_subscriptions`. The free plan row has
`status = 'FREE'` and no expiry date. This makes enforcement code simple: always join
to the subscription, check the plan limits, proceed or block.
