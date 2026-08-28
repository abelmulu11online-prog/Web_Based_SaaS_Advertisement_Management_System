# Implementation Plan: Subscription & Payment System (Phase 6)

## Overview

Implements the revenue engine for the Ethiopian SaaS advertisement management platform. Every advertiser must hold an active subscription plan (FREE, BASIC, PRO, or BUSINESS) to publish listings. Plans are priced in ETB and paid via Chapa. The system adds five database tables/triggers, a new `subscriptions` module (repository → service → controller → routes → webhook handler), enforcement in the existing `advertisements.service.js`, a daily cron job, and a React frontend flow (PricingPage → Checkout → CallbackPage → SuccessPage).

## Tasks

- [x] 1. Database migrations 016–020
  - [x] 1.1 Create migration `016_create_subscription_plans.sql`
    - Create `subscription_plans` table with `id`, `name` (CHECK FREE|BASIC|PRO|BUSINESS), `display_name`, `price_etb`, `max_active_ads`, `max_images_per_ad`, `is_featured`, `is_active`, `sort_order`, `created_at`
    - Seed all four plan rows (FREE 0 ETB/1 ad/3 img, BASIC 99/5/5, PRO 299/20/10, BUSINESS 799/100/10) with `ON CONFLICT (name) DO NOTHING`
    - _Requirements: 1.1, 1.5_

  - [x] 1.2 Create migration `017_create_user_subscriptions.sql`
    - Create `subscription_status` ENUM ('FREE', 'ACTIVE', 'EXPIRED')
    - Create `user_subscriptions` table with UNIQUE on `user_id`, FK to `subscription_plans`, nullable `current_period_start` and `current_period_end`
    - Add indexes on `status`, `current_period_end` (partial WHERE NOT NULL), and `user_id`
    - _Requirements: 1.3, 1.4_

  - [x] 1.3 Create migration `018_create_payment_records.sql`
    - Create `payment_record_status` ENUM ('PENDING', 'SUCCESS', 'FAILED')
    - Create `payment_records` table with UNIQUE on `tx_ref`, FK to `users` and `subscription_plans`, `amount_etb` CHECK > 0, `chapa_response` JSONB
    - Add indexes on `user_id`, `tx_ref`, `status`
    - _Requirements: 3.1, 9.2_

  - [x] 1.4 Create migration `019_create_payment_events.sql`
    - Create `payment_events` table with UNIQUE on `chapa_tx_ref`, `event_type`, `payload` JSONB, `processed_at`
    - The UNIQUE constraint on `chapa_tx_ref` serves as the distributed idempotency lock
    - _Requirements: 4.3, 4.5, 9.1, 9.3_

  - [x] 1.5 Create migration `020_add_free_subscription_trigger.sql`
    - Create PL/pgSQL function `assign_free_subscription()` that SELECTs the FREE plan UUID and INSERTs into `user_subscriptions` for the newly created user
    - Create trigger `trg_assign_free_subscription` AFTER INSERT ON `users` FOR EACH ROW
    - _Requirements: 1.3_

- [x] 2. Backend infrastructure — config, dependencies, and module scaffold
  - [x] 2.1 Add Chapa config keys to `config/index.js` and `.env.example`
    - Add `chapa.secretKey` via `env('CHAPA_SECRET_KEY', '', true)` and `chapa.webhookSecret` via `env('CHAPA_WEBHOOK_SECRET', '', true)` inside the exported `config` object
    - Add `CHAPA_SECRET_KEY=CHASECK_test_...` and `CHAPA_WEBHOOK_SECRET=your_webhook_secret_string_here` entries to `backend/.env.example`
    - _Requirements: 8.5_

  - [x] 2.2 Install `node-cron` dependency
    - Run `npm install node-cron@^3.0.3` in `backend/`; verify it appears in `package.json` dependencies
    - _Requirements: 7.1_

  - [x] 2.3 Create `subscriptions.schemas.js`
    - Export `checkoutSchema` — Zod object with `.strict()` allowing only `plan_id` (UUID) in body; wraps in `{ body: ... }`
    - Export `paymentStatusParamSchema` — validates `params.tx_ref` matches `/^sub_[a-zA-Z0-9_-]+$/`
    - Export `paymentHistoryQuerySchema` — validates optional `page` and `page_size` (positive int, max 100)
    - _Requirements: 3.7, 8.1, 8.2, 8.3_

- [x] 3. Repository layer — `subscriptions.repository.js`
  - [x] 3.1 Implement read-only repository functions
    - Implement `findAllActivePlans()` — SELECT all `is_active = TRUE` plans ordered by `sort_order ASC`
    - Implement `findPlanById(planId)` — SELECT active plan by ID; returns `null` if not found
    - Implement `findFreePlan()` — SELECT plan WHERE `name = 'FREE'`
    - Implement `findByUserId(userId)` — JOIN `user_subscriptions` with `subscription_plans`, return combined row
    - Implement `countPublishedAdsByUserId(userId)` — COUNT advertisements WHERE `user_id = $1 AND status = 'PUBLISHED'`
    - _Requirements: 1.2, 5.1_

  - [x] 3.2 Implement payment write/read repository functions
    - Implement `createPaymentRecord({ userId, planId, txRef, amountEtb })` — INSERT PENDING row, RETURNING *
    - Implement `findPaymentByTxRef(txRef)` — JOIN `payment_records` with `subscription_plans`, return combined row
    - Implement `activateSubscription({ txRef, chapaTxId, paymentMethod, chapaResponse, userId, planId })` — atomic transaction: UPDATE `payment_records` to SUCCESS + UPDATE `user_subscriptions` to ACTIVE with `current_period_end = NOW() + INTERVAL '30 days'`
    - _Requirements: 3.1, 4.7, 9.2_

  - [x] 3.3 Implement webhook audit and expiry repository functions
    - Implement `paymentEventExists(txRef)` — SELECT 1 from `payment_events` WHERE `chapa_tx_ref = $1`
    - Implement `insertPaymentEvent({ txRef, eventType, payload })` — INSERT into `payment_events`
    - Implement `findExpiredActiveSubscriptions()` — SELECT WHERE `status = 'ACTIVE' AND current_period_end < NOW()`
    - Implement `expireSubscription(subscriptionId, userId, freePlanId)` — atomic transaction: UPDATE subscription to EXPIRED + UPDATE `advertisements` SET PAUSED WHERE `user_id = $1 AND status = 'PUBLISHED'`, return `rowCount`
    - Implement `findPaymentHistory(userId, page, pageSize)` — paginated JOIN with `subscription_plans`, ordered `created_at DESC`
    - _Requirements: 4.3, 4.5, 7.2, 9.1, 5.4_

- [ ] 4. Read-only subscription endpoints
  - [x] 4.1 Implement `listPlans()` in `subscriptions.service.js`
    - Call `repo.findAllActivePlans()` and return the rows directly
    - _Requirements: 1.2_

  - [x] 4.2 Implement `getMySubscription(userId)` in `subscriptions.service.js`
    - Call `repo.findByUserId(userId)` and `repo.countPublishedAdsByUserId(userId)`
    - Compute `days_remaining` as `Math.ceil((period_end - now) / 86400000)` or `null` for FREE
    - Return structured response with nested `plan` and `usage` objects
    - _Requirements: 5.1_

  - [x] 4.3 Implement `subscriptions.controller.js` handlers for plans and my-subscription
    - Implement `getPlans(req, res, next)` — calls `service.listPlans()`, uses `sendSuccess`
    - Implement `getMySubscription(req, res, next)` — calls `service.getMySubscription(req.user.id)`, uses `sendSuccess`
    - Always derive `userId` from `req.user.id`, never from body or query
    - _Requirements: 5.1, 8.4_

  - [x] 4.4 Implement `subscriptions.routes.js` and register in `app.js`
    - Mount webhook route first with `express.raw({ type: 'application/json' })` before all other subscription routes
    - Mount `GET /plans` (public), `GET /my` (authenticate), `POST /checkout` (authenticate + validate), `GET /payment-status/:tx_ref` (authenticate + validate), `GET /history` (authenticate + validate)
    - Register `router` in `app.js` at `/api/subscriptions`
    - _Requirements: 1.2, 5.1, 4.10_

  - [ ]* 4.5 Write unit tests for `listPlans` and `getMySubscription`
    - Test `listPlans` returns all 4 active plans in sort_order; inactive plans excluded
    - Test `getMySubscription` for FREE user: returns `days_remaining: null`, `status: 'FREE'`
    - Test `getMySubscription` for ACTIVE user: computes correct `days_remaining` and `remaining_ads`
    - _Requirements: 1.2, 5.1_

- [x] 5. Webhook handler — `subscriptions.webhook.js`
  - [x] 5.1 Implement `verifyChapaSignature(rawBody, signatureHeader)`
    - Compute `HMAC-SHA256(config.chapa.webhookSecret, rawBody).digest('hex')`
    - Compare using `crypto.timingSafeEqual` with length guard before comparison
    - Return `false` for missing header, length mismatch, or any thrown error
    - _Requirements: 4.1, 4.2_

  - [x] 5.2 Implement `handleWebhook(req, res)` — Layer 1 (HMAC) and Layer 2 (idempotency)
    - Reject with HTTP 400 `WEBHOOK_SIGNATURE_INVALID` when `verifyChapaSignature` returns false
    - Parse raw buffer to JSON; reject on missing `tx_ref`
    - Check `repo.paymentEventExists(txRef)`; return HTTP 200 `{ received: true }` if duplicate
    - Insert `payment_events` row first; catch `err.code === '23505'` and return 200 for concurrent race
    - Return 200 without activating for non-success payload status
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 9.1_

  - [x] 5.3 Implement `handleWebhook` — Layer 3 (Chapa Verify API + activation)
    - Call `fetch(CHAPA_VERIFY_URL/${txRef})` with Bearer auth from `config.chapa.secretKey`
    - On verify non-success: log warning, return HTTP 200
    - Fetch `payment_records` by `txRef`; log and return 200 on not-found
    - Call `activateSubscriptionFromVerify({ txRef, verifyData, paymentRecord })` from service
    - Catch activation errors; log, return 200 to avoid Chapa retry storm
    - _Requirements: 4.6, 4.7, 4.8, 4.9_

  - [ ]* 5.4 Write property test for webhook idempotency (Property 4)
    - **Property 4: Payment Activation Is Idempotent**
    - **Validates: Requirements 4.3, 4.4, 4.5, 9.3**
    - For any valid `tx_ref`, calling `handleWebhook` twice with the same valid signed payload produces exactly one `payment_events` insert and one HTTP 200 on each call; subscription is activated only once
    - Use `fast-check` arbitrary or manual generator to produce random `tx_ref` values in format `sub_<id>_<ts>`

  - [ ]* 5.5 Write unit tests for HMAC signature verification
    - Test `verifyChapaSignature` returns `true` for correctly signed body with correct secret
    - Test returns `false` for wrong secret, wrong body, missing header, and malformed hex strings
    - _Requirements: 4.1, 4.2_

- [ ] 6. Checkpoint — verify read endpoints and webhook compile and pass basic smoke tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Checkout endpoint
  - [ ] 7.1 Implement `activateSubscriptionFromVerify` shared helper in `subscriptions.service.js`
    - Parse `verifiedAmount` and `expectedAmount` as floats; throw HTTP 400 `PAYMENT_AMOUNT_MISMATCH` on mismatch
    - Call `repo.activateSubscription(...)` with correct args; log activation at `info` level
    - _Requirements: 4.7, 4.9, 5.7_

  - [ ] 7.2 Implement `initializeCheckout(userId, planId, userProfile)` in `subscriptions.service.js`
    - Validate plan via `repo.findPlanById`; throw HTTP 404 `PLAN_NOT_FOUND` for missing/inactive plans
    - Throw HTTP 409 `FREE_PLAN_NO_CHECKOUT` when `plan.name === 'FREE'`
    - Generate `txRef = 'sub_' + userId + '_' + Date.now()` — never from client input
    - Call `repo.createPaymentRecord(...)` before calling Chapa
    - Call Chapa initialize API via `fetch`; throw HTTP 502 `CHAPA_ERROR` on non-success or missing `checkout_url`; leave PENDING record for reconciliation
    - Return `{ checkout_url, tx_ref }`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 7.3 Implement `createCheckout` controller handler
    - Build `userProfile` from `req.user` (email, first_name, last_name)
    - Call `service.initializeCheckout(req.user.id, req.body.plan_id, userProfile)`
    - Respond with `sendSuccess(res, result, 201)`
    - _Requirements: 3.1, 8.4_

  - [ ]* 7.4 Write property test for server-side tx_ref generation (Property 3)
    - **Property 3: tx_ref Is Server-Generated and Unforgeable**
    - **Validates: Requirements 3.2, 8.1**
    - For any checkout request (valid plan, authenticated user), the `tx_ref` in the inserted `payment_records` row always starts with `sub_` and contains the authenticated `userId` — never a client-supplied value

  - [ ]* 7.5 Write property test for amount integrity (Property 5)
    - **Property 5: Amount Integrity Is Enforced End-to-End**
    - **Validates: Requirements 3.3, 4.7, 4.9**
    - For any plan, the `amount_etb` in the PENDING payment record equals `subscription_plans.price_etb`; for any verified amount that differs from `payment_records.amount_etb`, `activateSubscriptionFromVerify` throws `PAYMENT_AMOUNT_MISMATCH`

  - [ ]* 7.6 Write unit tests for checkout edge cases
    - Test `initializeCheckout` throws `FREE_PLAN_NO_CHECKOUT` for the FREE plan UUID
    - Test throws `PLAN_NOT_FOUND` for unknown or inactive plan UUID
    - Test that `createPaymentRecord` is called before the Chapa fetch (mock ordering)
    - Test returns `CHAPA_ERROR` when Chapa returns non-success
    - _Requirements: 3.4, 3.5, 3.6, 3.7_

- [ ] 8. Payment status fallback — `GET /payment-status/:tx_ref`
  - [ ] 8.1 Implement `checkPaymentStatus(txRef, userId)` in `subscriptions.service.js`
    - Call `repo.findPaymentByTxRef(txRef)`; throw HTTP 404 `PAYMENT_NOT_FOUND` if not found or `user_id` does not match `userId`
    - If `status === 'SUCCESS'`: call `getMySubscription(userId)` and return `{ status: 'success', subscription }`
    - If still PENDING: call Chapa Verify API as fallback; if verify returns success, call `activateSubscriptionFromVerify`; re-fetch subscription and return success
    - Return `{ status: 'pending' }` if verify is not success
    - _Requirements: 5.2, 5.3, 5.7_

  - [ ] 8.2 Implement `getPaymentStatus` controller handler
    - Call `service.checkPaymentStatus(req.params.tx_ref, req.user.id)`
    - Use `sendSuccess(res, result)`
    - _Requirements: 5.2_

  - [ ]* 8.3 Write unit tests for payment status fallback
    - Test returns `{ status: 'success', subscription }` when record is already SUCCESS
    - Test returns `{ status: 'pending' }` when Chapa verify returns non-success
    - Test throws `PAYMENT_NOT_FOUND` for wrong user's tx_ref
    - Test activates and returns success when Chapa verify succeeds (fallback path)
    - _Requirements: 5.2, 5.3, 5.7_

- [ ] 9. Payment history — `GET /history`
  - [ ] 9.1 Implement `getPaymentHistory(userId, query)` in `subscriptions.service.js`
    - Compute `page = Math.max(1, query.page || 1)` and `pageSize = Math.min(100, query.page_size || 20)`
    - Call `repo.findPaymentHistory(userId, page, pageSize)`
    - Return `{ payments: rows, pagination: { page, page_size, total, total_pages, has_next, has_prev } }`
    - _Requirements: 5.4, 5.5, 5.6_

  - [ ] 9.2 Implement `getPaymentHistory` controller handler
    - Call `service.getPaymentHistory(req.user.id, req.query || {})`
    - Use `sendSuccess(res, result)`
    - _Requirements: 5.4_

  - [ ]* 9.3 Write unit tests for payment history pagination
    - Test `page_size` of 100 returns at most 100 rows
    - Test Zod validator rejects `page_size = 101` with HTTP 422
    - Test pagination metadata is correct for multi-page result sets
    - _Requirements: 5.5, 5.6_

- [ ] 10. Subscription enforcement in `advertisements.service.js`
  - [ ] 10.1 Inject subscription publish gate into `publishAdvertisement()`
    - Add `import * as subsRepo from '../subscriptions/subscriptions.repository.js'` at top of file
    - After ownership and status validation, call `subsRepo.findByUserId(userId)`
    - Compute `isActivePaid` (`status === 'ACTIVE' AND current_period_end > now`) and `isOnFreePlan` (`status === 'FREE'`)
    - If neither, throw HTTP 402 `SUBSCRIPTION_REQUIRED`
    - Count published ads via `subsRepo.countPublishedAdsByUserId(userId)`; throw HTTP 409 `PLAN_LIMIT_REACHED` if `activeAdCount >= planMaxAds`
    - Remove the existing hardcoded `MAX_IMAGES` constant usage from publish flow if applicable
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [ ] 10.2 Replace hardcoded `MAX_IMAGES` check in `addImage()` with plan-derived limit
    - Call `subsRepo.findByUserId(userId)` to get `max_images_per_ad` from the joined plan
    - Fall back to `3` (FREE tier) if subscription row is absent
    - Replace `if (imageCount >= MAX_IMAGES)` with `if (imageCount >= planImageLimit)` and throw HTTP 409 `IMAGE_LIMIT_REACHED` with plan name in message
    - _Requirements: 6.4, 6.5_

  - [ ]* 10.3 Write property test for publish gate — Plan Ad Limit (Property 6)
    - **Property 6: Plan Ad Limit Is Enforced for All Plans**
    - **Validates: Requirements 6.2, 6.3**
    - For any plan with `max_active_ads = N`, when a user's PUBLISHED ad count equals N, `publishAdvertisement` throws `PLAN_LIMIT_REACHED`; when count is N-1, it succeeds

  - [ ]* 10.4 Write property test for FREE plan first publish (Property 7)
    - **Property 7: FREE Plan Users Are Never Subscription-Blocked on First Publish**
    - **Validates: Requirements 6.3, 1.3**
    - For any FREE plan user with 0 published advertisements, `publishAdvertisement` does not throw `SUBSCRIPTION_REQUIRED` or `PLAN_LIMIT_REACHED`

  - [ ]* 10.5 Write property test for expiry enforcement using both status and date (Property 8)
    - **Property 8: Expiry Enforcement Uses Both Status and Date**
    - **Validates: Requirements 6.1, 6.6**
    - For any subscription row where `status = 'ACTIVE'` but `current_period_end < NOW()`, `publishAdvertisement` throws `SUBSCRIPTION_REQUIRED` — not `PLAN_LIMIT_REACHED`

  - [ ]* 10.6 Write property test for plan-derived image limit (Property 9)
    - **Property 9: Image Limit Is Always Plan-Derived**
    - **Validates: Requirements 6.4, 6.5**
    - For any plan with `max_images_per_ad = M`, when an ad's image count equals M, `addImage` throws `IMAGE_LIMIT_REACHED`; with M-1 images it succeeds

  - [ ]* 10.7 Write unit tests for enforcement edge cases
    - Test EXPIRED subscription (correct status, future date) → HTTP 402
    - Test ACTIVE subscription past `current_period_end` → HTTP 402 (dual-check enforcement)
    - Test FREE user with 1 published ad → HTTP 409 `PLAN_LIMIT_REACHED`
    - Test PRO user at 20 ads → HTTP 409; at 19 → publish succeeds
    - Test FREE image limit: 3rd image succeeds, 4th throws `IMAGE_LIMIT_REACHED`
    - _Requirements: 6.1, 6.2, 6.4, 6.6_

- [ ] 11. Checkpoint — verify all backend tests pass after enforcement injection
  - Ensure all tests pass, including existing Phase 5 advertisement tests, ask the user if questions arise.

- [ ] 12. Expiry cron job
  - [ ] 12.1 Create `subscriptions.cron.js` with `runExpiryJob` and `startExpiryJob`
    - Implement `runExpiryJob()`: fetch free plan via `repo.findFreePlan()`, then `repo.findExpiredActiveSubscriptions()`, iterate and call `repo.expireSubscription(sub.id, sub.user_id, freePlan.id)`
    - Log `info` with `userId`, `subscriptionId`, `pausedAds` count per expired subscription; log `error` per failed transaction but continue loop
    - Export `startExpiryJob()` — uses `cron.schedule('5 0 * * *', ...)` and logs startup message
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 12.2 Register `startExpiryJob()` in `server.js`
    - Add `import { startExpiryJob } from './modules/subscriptions/subscriptions.cron.js'`
    - Call `startExpiryJob()` after the HTTP server starts listening
    - _Requirements: 7.1_

  - [ ]* 12.3 Write property test for atomic expiry sweep (Property 10)
    - **Property 10: Expiry Sweep Is Atomic Per Subscription**
    - **Validates: Requirements 7.1, 7.2**
    - For any expired ACTIVE subscription, calling `repo.expireSubscription(...)` either commits all three changes (status = EXPIRED, plan = FREE, ads = PAUSED) or rolls back all; no partial state persists after a simulated mid-transaction failure

  - [ ]* 12.4 Write unit tests for cron job behaviour
    - Test cron processes multiple expired subscriptions independently (one failure doesn't abort others)
    - Test logging: `info` contains `userId`, `subscriptionId`, `pausedAds` fields
    - Test that subscriptions with `status = 'FREE'` or future `current_period_end` are NOT in the expired set
    - _Requirements: 7.1, 7.3, 7.4_

- [ ] 13. Frontend — `subscriptionsService.js` and React Query hooks
  - [ ] 13.1 Create `frontend/src/features/subscriptions/services/subscriptionsService.js`
    - Implement `getPlans()` — GET `/api/subscriptions/plans`
    - Implement `getMySubscription()` — GET `/api/subscriptions/my` (authenticated)
    - Implement `createCheckout({ plan_id })` — POST `/api/subscriptions/checkout`, returns `{ checkout_url, tx_ref }`
    - Implement `getPaymentStatus(txRef)` — GET `/api/subscriptions/payment-status/:tx_ref`
    - Implement `getPaymentHistory({ page })` — GET `/api/subscriptions/history`
    - Use the existing Axios instance with auth header from context
    - _Requirements: 2.1, 2.4, 2.5_

  - [ ] 13.2 Create `frontend/src/features/subscriptions/hooks/useSubscriptions.js`
    - Export `useSubscriptionPlans()` — `useQuery` with `staleTime: 60 * 60 * 1000`
    - Export `useMySubscription()` — `useQuery` for authenticated user subscription
    - Export `usePaymentHistory(page)` — `useQuery` for paginated history
    - Export `usePaymentStatus(txRef)` — `useQuery` enabled only when `txRef` truthy, `refetchInterval` of 3000 ms while `status === 'pending'`, stops when resolved
    - Export `useCreateCheckoutSession()` — `useMutation` that calls `api.createCheckout`, on success redirects `window.location.href` to `data.checkout_url`
    - _Requirements: 2.4, 2.5, 2.6_

- [ ] 14. Frontend — subscription UI components
  - [ ] 14.1 Create `PlanCard.jsx` in `frontend/src/features/subscriptions/components/`
    - Display `display_name`, `price_etb` (formatted as "ETB X/month"), `max_active_ads`, `max_images_per_ad`
    - Show a featured badge for plans where `is_featured = true`
    - Render a "Subscribe" CTA button that calls `useCreateCheckoutSession().mutate({ planId: plan.id })`
    - Disable button and show "Current Plan" label when this plan matches the user's active plan
    - _Requirements: 2.1, 2.4_

  - [ ] 14.2 Create `SubscriptionStatus.jsx` and `UsageBar.jsx` in `frontend/src/features/subscriptions/components/`
    - `SubscriptionStatus`: display plan badge (`status`, `display_name`), `current_period_end` formatted date, `days_remaining` count
    - `UsageBar`: render "X of Y ads used" progress bar using `usage.active_ads` and `plan.max_active_ads`
    - _Requirements: 2.2_

  - [ ] 14.3 Create `ExpiryCountdown.jsx` in `frontend/src/features/subscriptions/components/`
    - Render a banner with "Expires in N days — Renew Now" when `days_remaining <= 3` and subscription `status === 'ACTIVE'`
    - Banner includes a link/button to navigate to `/pricing`
    - Return `null` when `days_remaining > 3` or subscription is FREE
    - _Requirements: 2.3_

- [ ] 15. Frontend — pages
  - [ ] 15.1 Create `PricingPage.jsx` at `frontend/src/pages/PricingPage.jsx`
    - Use `useSubscriptionPlans()` to fetch all active plans
    - Render a grid of `PlanCard` components for each plan, sorted by `sort_order`
    - Show loading skeleton while fetching; show error state on failure
    - Route: `/pricing` (public — no auth required)
    - _Requirements: 2.1_

  - [ ] 15.2 Create `SubscriptionPage.jsx` at `frontend/src/pages/SubscriptionPage.jsx`
    - Use `useMySubscription()` to fetch the authenticated user's subscription
    - Render `SubscriptionStatus`, `UsageBar`, and `ExpiryCountdown` components with live data
    - Include a "Change Plan" button linking to `/pricing`
    - Route: `/dashboard/subscription` (auth required)
    - _Requirements: 2.2, 2.3_

  - [ ] 15.3 Create `PaymentCallbackPage.jsx` at `frontend/src/pages/PaymentCallbackPage.jsx`
    - Extract `tx_ref` from URL query params (`useSearchParams`)
    - Use `usePaymentStatus(txRef)` which polls every 3 seconds while `status === 'pending'`
    - Render a "Processing payment…" spinner with tx_ref while pending
    - When status resolves to `success`, navigate to `/subscription/success` with subscription data
    - When status resolves to `failed`, show failure message with retry link to `/pricing`
    - Route: `/subscription/callback` (auth required)
    - _Requirements: 2.5, 2.6_

  - [ ] 15.4 Create `SubscriptionSuccessPage.jsx` at `frontend/src/pages/SubscriptionSuccessPage.jsx`
    - Display activated plan name and `current_period_end` formatted as a readable date
    - Show a success confirmation message and a "Go to Dashboard" button
    - Use `useMySubscription()` to get the latest subscription data
    - Route: `/subscription/success` (auth required)
    - _Requirements: 2.6_

  - [ ] 15.5 Register new routes in `App.jsx` (or router config)
    - Add routes for `/pricing` (public), `/dashboard/subscription` (protected), `/subscription/callback` (protected), `/subscription/success` (protected)
    - Add "Pricing" link in the main navigation
    - Add "Subscription" link in the authenticated dashboard navigation
    - _Requirements: 2.1, 2.2_

- [ ] 16. Integration test suite — `backend/tests/subscriptions.test.js`
  - [ ] 16.1 Write subscription plan and my-subscription integration tests
    - `GET /api/subscriptions/plans` — returns all 4 active plans with correct ETB prices; inactive plans excluded
    - `GET /api/subscriptions/my` — new test user returns `status: 'FREE'`, `days_remaining: null`; returns 401 without auth
    - Verify FREE subscription is auto-assigned on user creation (trigger test)
    - _Requirements: 1.1, 1.2, 1.3, 5.1_

  - [ ] 16.2 Write checkout integration tests
    - `POST /api/subscriptions/checkout` with PRO `plan_id` — returns 201 with `checkout_url` and `tx_ref` starting with `sub_`; PENDING record exists in DB
    - `POST /checkout` with FREE `plan_id` — returns 409 `FREE_PLAN_NO_CHECKOUT`
    - `POST /checkout` with extra field `{ plan_id, amount: 1 }` — Zod rejects with 422 `VALIDATION_ERROR`
    - `POST /checkout` without auth — returns 401
    - _Requirements: 3.1, 3.2, 3.4, 3.7_

  - [ ] 16.3 Write webhook security integration tests
    - Valid HMAC + valid payload → 200, subscription activated
    - Wrong HMAC secret → 400 `WEBHOOK_SIGNATURE_INVALID`
    - Missing `x-chapa-signature` header → 400
    - Duplicate `tx_ref` (send twice) → both return 200, subscription activated only once
    - Webhook payload `status: 'failed'` → 200, subscription NOT activated
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 16.4 Write webhook verify-layer and amount-mismatch integration tests
    - Mock Chapa Verify API returning `status: 'failed'` → subscription NOT activated; `payment_events` row exists; `payment_records` remains PENDING
    - Mock Chapa Verify returning wrong amount → subscription NOT activated; `payment_events` row exists
    - Full happy path: valid HMAC → idempotency passes → verify returns success with matching amount → status ACTIVE, `current_period_end ≈ NOW + 30d`
    - _Requirements: 4.6, 4.7, 4.8, 4.9, 9.4_

  - [ ] 16.5 Write advertisement enforcement integration tests
    - FREE user publishes 1st ad → succeeds; 2nd publish → 409 `PLAN_LIMIT_REACHED`
    - EXPIRED subscription (set `current_period_end = NOW() - 1s`) → 402 `SUBSCRIPTION_REQUIRED`
    - ACTIVE subscription past `current_period_end` (without cron) → 402 (dual-check enforcement)
    - FREE ad: 3rd image succeeds; 4th → 409 `IMAGE_LIMIT_REACHED`
    - PRO ad (10 images limit): 10th image succeeds; 11th → 409
    - Verify existing Phase 5 ad tests still pass
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [ ] 16.6 Write expiry cron and payment history integration tests
    - Cron sweep: set an ACTIVE subscription to `current_period_end = NOW() - 1s`, run `runExpiryJob()`, verify status = EXPIRED, ads = PAUSED, plan = FREE
    - `GET /api/subscriptions/history` — returns paginated records for user; 401 without auth; Zod rejects `page_size=101` with 422
    - `GET /api/subscriptions/payment-status/:invalid_format` — 422 `VALIDATION_ERROR`
    - `GET /api/subscriptions/payment-status/:tx_ref` for another user's tx_ref → 404 `PAYMENT_NOT_FOUND`
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 7.1, 7.2, 8.2, 8.3_

- [ ] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass (`npm test` in `backend/`), including both Phase 5 and Phase 6 test suites; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Implementation language is JavaScript (Node.js + Express + React) matching the existing codebase
- The webhook route requires `express.raw({ type: 'application/json' })` applied inline on the route — not globally in `app.js`
- Property tests use the Node.js built-in `node:test` runner; consider adding `fast-check` as a devDependency for arbitrary generation (`npm install --save-dev fast-check`)
- Chapa sandbox credentials (`CHASECK_test_...`) can be used for local integration tests — set in `backend/.env`
- The `subscriptions` module folder already exists with stub files; tasks 3–9 fill in the implementation
- Frontend `features/subscriptions/` folder exists with only a README; tasks 13–15 build the complete UI
- Migrations must run in order 016 → 020; migration 020 depends on 016 being seeded first (trigger references `subscription_plans`)
- Each task references specific requirements for traceability
- Checkpoints at task 6, 11, and 17 ensure incremental validation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4"] },
    { "id": 3, "tasks": ["1.5", "2.1", "2.2"] },
    { "id": 4, "tasks": ["2.3", "3.1"] },
    { "id": 5, "tasks": ["3.2", "3.3"] },
    { "id": 6, "tasks": ["4.1", "4.2"] },
    { "id": 7, "tasks": ["4.3", "5.1"] },
    { "id": 8, "tasks": ["4.4", "5.2"] },
    { "id": 9, "tasks": ["4.5", "5.3", "5.5"] },
    { "id": 10, "tasks": ["5.4", "7.1"] },
    { "id": 11, "tasks": ["7.2", "7.3", "8.1"] },
    { "id": 12, "tasks": ["7.4", "7.5", "7.6", "8.2", "9.1"] },
    { "id": 13, "tasks": ["8.3", "9.2", "10.1"] },
    { "id": 14, "tasks": ["9.3", "10.2"] },
    { "id": 15, "tasks": ["10.3", "10.4", "10.5", "10.6", "12.1", "13.1"] },
    { "id": 16, "tasks": ["10.7", "12.2", "12.3", "13.2"] },
    { "id": 17, "tasks": ["12.4", "14.1", "14.2", "14.3"] },
    { "id": 18, "tasks": ["15.1", "15.2", "15.3", "15.4"] },
    { "id": 19, "tasks": ["15.5"] },
    { "id": 20, "tasks": ["16.1", "16.2", "16.3"] },
    { "id": 21, "tasks": ["16.4", "16.5"] },
    { "id": 22, "tasks": ["16.6"] }
  ]
}
```
