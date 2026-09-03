# Requirements Document

## Introduction

Phase 6 adds the subscription and payment system to the Ethiopian SaaS advertisement management platform. Before this phase, registered users can publish advertisements without restriction. After Phase 6, every advertiser must hold an active subscription plan to publish beyond the free tier limits. Plans are priced in Ethiopian Birr (ETB) and paid through Chapa — the Ethiopian payment gateway that unifies Telebirr, CBE Birr, Awash, Dashen, and M-Pesa under a single API.

Because Ethiopian mobile-money systems do not support automatic recurring charges, subscriptions are manual-renewal monthly cycles. Each subscription grants exactly 30 days of access from the payment confirmation date. A daily cron job expires lapsed subscriptions and pauses the user's published advertisements. Every new user is automatically assigned to the FREE plan via a database trigger, ensuring every advertiser always has exactly one subscription row and consistent enforcement logic.

This document covers six functional areas: (1) subscription plan catalogue, (2) checkout and payment initialization, (3) webhook security and payment confirmation, (4) subscription status and payment history APIs, (5) advertisement publish and image-upload enforcement, and (6) automated subscription expiry.

---

## Glossary

- **Advertisement_Service**: The Node.js/Express service module (`advertisements.service.js`) responsible for advertisement lifecycle operations, including publish and image-add flows, with subscription enforcement injected in Phase 6.
- **Chapa**: The Ethiopian payment gateway (chapa.co) that aggregates Telebirr, CBE Birr, Awash, Dashen, and M-Pesa under a single API. Used for all paid subscription checkout flows.
- **Expiry_Cron_Job**: The daily `node-cron` scheduled job (`subscriptions.cron.js`) that sweeps for expired ACTIVE subscriptions, downgrades them to FREE, and pauses their published advertisements.
- **FREE_Plan**: The 0 ETB subscription plan that allows 1 active advertisement and 3 images per advertisement. Auto-assigned to every new user; never requires a Chapa checkout.
- **Payment_Record**: A row in the `payment_records` table representing one Chapa transaction, tracked from PENDING through SUCCESS or FAILED.
- **Payment_Event**: An immutable row in the `payment_events` table recording each received webhook event; its UNIQUE constraint on `chapa_tx_ref` serves as the idempotency lock.
- **Subscription_Service**: The Node.js/Express service module (`subscriptions.service.js`) responsible for plan listing, checkout initialization, payment status checks, and subscription activation.
- **Webhook_Handler**: The isolated module (`subscriptions.webhook.js`) that receives Chapa webhook POST requests and applies three-layer security (HMAC → idempotency → Verify API) before activating a subscription.
- **Zod_Validator**: The Zod 4 schema middleware (`subscriptions.schemas.js`) applied to subscription API routes to validate and sanitize incoming request data.
- **tx_ref**: A server-generated unique transaction reference in the format `sub_{userId}_{timestampMs}`, used to correlate a Chapa payment session with a `payment_records` row.
- **ACTIVE**: Subscription status indicating a paid subscription with `current_period_end` in the future.
- **EXPIRED**: Subscription status set by the Expiry_Cron_Job when `current_period_end` has passed.
- **ETB**: Ethiopian Birr — the currency used for all plan prices and payment amounts.

---

## Requirements

### Requirement 1: Subscription Plan Catalogue

**User Story:** As an advertiser, I want to view the available subscription plans with their ETB prices and limits, so that I can choose the plan that best fits my advertising needs.

#### Acceptance Criteria

1. THE Subscription_Service SHALL maintain four subscription plans — FREE (0 ETB, 1 ad, 3 images/ad), BASIC (99 ETB, 5 ads, 5 images/ad), PRO (299 ETB, 20 ads, 10 images/ad), and BUSINESS (799 ETB, 100 ads, 10 images/ad) — seeded in the `subscription_plans` database table.
2. WHEN a client calls `GET /api/subscriptions/plans`, THE Subscription_Service SHALL return all plans where `is_active = TRUE`, ordered by `sort_order` ascending, including `id`, `name`, `display_name`, `price_etb`, `max_active_ads`, `max_images_per_ad`, `is_featured`, and `sort_order` for each plan.
3. WHEN a new user account is created, THE system SHALL automatically assign a FREE plan subscription row to that user via a database trigger on the `users` table, setting `status = 'FREE'` with `current_period_start` and `current_period_end` as NULL.
4. THE system SHALL enforce a UNIQUE constraint on `user_subscriptions.user_id` so that every user has exactly one subscription row at all times.
5. THE system SHALL store plan prices exclusively in the `subscription_plans` database table so that price changes require only a database update and no application code deployment.

---

### Requirement 2: Subscription Pricing and Dashboard UI

**User Story:** As an advertiser, I want to see my current subscription plan, expiry date, and usage on a dashboard, so that I know when to renew and how many ads I have remaining.

#### Acceptance Criteria

1. WHEN a user visits the pricing page (`/pricing`), THE system SHALL display all active subscription plans rendered with plan name, ETB price, maximum active ads, maximum images per advertisement, and a featured badge for PRO and BUSINESS plans.
2. WHEN an authenticated user visits the subscription dashboard (`/dashboard/subscription`), THE system SHALL display the user's current plan name, subscription status, `current_period_end` date, `days_remaining` count, and current active advertisement count versus the plan maximum.
3. WHEN a user's subscription has `days_remaining` of 3 or fewer, THE system SHALL display an ExpiryCountdown banner with a call-to-action to renew the subscription.
4. WHEN an authenticated user selects a paid plan and clicks the checkout button, THE system SHALL call `POST /api/subscriptions/checkout` and redirect the browser to the Chapa-hosted payment page using the returned `checkout_url`.
5. WHEN the user is redirected back from the Chapa payment page to the callback URL, THE system SHALL display the PaymentCallbackPage and poll `GET /api/subscriptions/payment-status/:tx_ref` every 3 seconds until the status is no longer `pending`.
6. WHEN the payment status resolves to `success`, THE system SHALL navigate the user to the SubscriptionSuccessPage showing the activated plan name and new `current_period_end`.

---

### Requirement 3: Checkout and Payment Initialization

**User Story:** As an advertiser, I want to initiate a payment for a subscription plan, so that I can upgrade my account and publish more advertisements.

#### Acceptance Criteria

1. WHEN an authenticated user submits `POST /api/subscriptions/checkout` with a valid paid `plan_id`, THE Subscription_Service SHALL create a PENDING `payment_records` row before calling the Chapa initialize API, and then return `{ checkout_url, tx_ref }` with HTTP 201.
2. THE Subscription_Service SHALL generate `tx_ref` server-side in the format `sub_{userId}_{timestampMs}` and SHALL NOT accept `tx_ref` from the client request body.
3. THE Subscription_Service SHALL set the payment amount sent to Chapa from `subscription_plans.price_etb` in the database and SHALL NOT accept an amount from the client request body.
4. IF the `plan_id` in `POST /checkout` references the FREE plan, THEN THE Subscription_Service SHALL return HTTP 409 with error code `FREE_PLAN_NO_CHECKOUT`.
5. IF the `plan_id` in `POST /checkout` does not reference an `is_active = TRUE` plan, THEN THE Subscription_Service SHALL return HTTP 404 with error code `PLAN_NOT_FOUND`.
6. IF the Chapa initialize API returns a non-success response or no `checkout_url`, THEN THE Subscription_Service SHALL return HTTP 502 with error code `CHAPA_ERROR` and the PENDING `payment_records` row SHALL remain in the database for reconciliation.
7. THE Zod_Validator SHALL apply `.strict()` validation to the `POST /checkout` request body, rejecting any fields beyond `plan_id` with HTTP 422 `VALIDATION_ERROR`.

---

### Requirement 4: Webhook Security and Payment Confirmation

**User Story:** As the platform operator, I want payment webhooks from Chapa to be verified securely and processed exactly once, so that subscriptions are activated only for genuine, non-tampered payments.

#### Acceptance Criteria

1. WHEN Chapa posts to `POST /api/subscriptions/webhook`, THE Webhook_Handler SHALL verify the HMAC-SHA256 signature by computing `HMAC(CHAPA_WEBHOOK_SECRET, rawBody)` and comparing it to the `x-chapa-signature` header using `crypto.timingSafeEqual`.
2. IF the `x-chapa-signature` header is absent or the HMAC comparison fails, THEN THE Webhook_Handler SHALL return HTTP 400 with error code `WEBHOOK_SIGNATURE_INVALID` and SHALL NOT process the payload further.
3. WHEN a webhook event with a valid signature is received, THE Webhook_Handler SHALL check whether a `payment_events` row with the same `chapa_tx_ref` already exists before any further processing.
4. WHEN a `payment_events` row for the `chapa_tx_ref` already exists, THE Webhook_Handler SHALL return HTTP 200 `{ received: true }` without modifying `payment_records` or `user_subscriptions`.
5. WHEN the webhook event is new (no existing `payment_events` row), THE Webhook_Handler SHALL insert a `payment_events` row first — before calling the Chapa Verify API — using the UNIQUE constraint on `chapa_tx_ref` as a distributed lock against concurrent duplicate delivery.
6. WHEN the `payment_events` INSERT succeeds and the webhook payload `status` is `success`, THE Webhook_Handler SHALL call the Chapa Verify API (`GET /v1/transaction/verify/:tx_ref`) to independently confirm the payment.
7. WHEN the Chapa Verify API confirms `status: success` and the verified `amount` equals `payment_records.amount_etb`, THE Webhook_Handler SHALL atomically update `payment_records.status` to `SUCCESS` and `user_subscriptions` to `status = 'ACTIVE'`, `current_period_start = NOW()`, and `current_period_end = NOW() + 30 days`.
8. IF the Chapa Verify API returns a status other than `success`, THEN THE Webhook_Handler SHALL log a warning and return HTTP 200 without activating the subscription.
9. IF the verified payment amount does not equal `payment_records.amount_etb`, THEN THE Webhook_Handler SHALL log a security alert and return HTTP 200 without activating the subscription.
10. THE `POST /api/subscriptions/webhook` route SHALL use `express.raw({ type: 'application/json' })` as its body parser so the raw request buffer is available for HMAC computation.

---

### Requirement 5: Subscription Status and Payment History APIs

**User Story:** As an advertiser, I want to check my current subscription details and payment history through the API, so that I can track my account status and past transactions.

#### Acceptance Criteria

1. WHEN an authenticated user calls `GET /api/subscriptions/my`, THE Subscription_Service SHALL return the user's `status`, `current_period_start`, `current_period_end`, `days_remaining` (integer days until `current_period_end`, or `null` for FREE), and `plan` object (`id`, `name`, `display_name`, `price_etb`, `max_active_ads`, `max_images_per_ad`, `is_featured`), and `usage` object (`active_ads`, `remaining_ads`).
2. WHEN an authenticated user calls `GET /api/subscriptions/payment-status/:tx_ref`, THE Subscription_Service SHALL return `{ status: 'pending' | 'success' | 'failed' }` and, when `status` is `success`, the current subscription object.
3. IF the `tx_ref` in `GET /payment-status/:tx_ref` does not belong to the authenticated user, THEN THE Subscription_Service SHALL return HTTP 404 `PAYMENT_NOT_FOUND`.
4. WHEN an authenticated user calls `GET /api/subscriptions/history`, THE Subscription_Service SHALL return a paginated list of `payment_records` rows, each including `id`, `tx_ref`, `amount_etb`, `status`, `payment_method`, `created_at`, `plan_name`, and `plan_display_name`, ordered by `created_at` descending.
5. WHEN `page` and `page_size` query parameters are provided to `GET /api/subscriptions/history`, THE Subscription_Service SHALL return the correct slice of records and a `pagination` object containing `page`, `page_size`, `total`, `total_pages`, `has_next`, and `has_prev`.
6. WHEN `page_size` exceeds 100, THE Zod_Validator SHALL reject the request with HTTP 422 `VALIDATION_ERROR`.
7. IF `GET /api/subscriptions/payment-status/:tx_ref` is called while `payment_records.status` is still `PENDING`, THE Subscription_Service SHALL call the Chapa Verify API as a fallback check and activate the subscription if the verify response is `success` with a matching amount.

---

### Requirement 6: Advertisement Publish and Image Enforcement

**User Story:** As the platform operator, I want subscription plan limits to be enforced when advertisers publish ads or add images, so that users cannot exceed their plan's allowed active ad and image counts.

#### Acceptance Criteria

1. WHEN `publishAdvertisement` is called for a user whose `user_subscriptions.status` is `EXPIRED`, or whose `current_period_end` is before the current timestamp, THE Advertisement_Service SHALL return HTTP 402 with error code `SUBSCRIPTION_REQUIRED`.
2. WHEN `publishAdvertisement` is called for a user whose count of `PUBLISHED` advertisements is greater than or equal to `subscription_plans.max_active_ads`, THE Advertisement_Service SHALL return HTTP 409 with error code `PLAN_LIMIT_REACHED`.
3. WHEN `publishAdvertisement` is called for a user on the FREE plan with zero currently published advertisements, THE Advertisement_Service SHALL allow the publish to proceed.
4. WHEN `addImage` is called for an advertisement and the advertisement's current image count is greater than or equal to `subscription_plans.max_images_per_ad` for the user's plan, THE Advertisement_Service SHALL return HTTP 409 with error code `IMAGE_LIMIT_REACHED`.
5. THE Advertisement_Service SHALL derive the `max_images_per_ad` limit from `subscription_plans.max_images_per_ad` for the user's current plan and SHALL NOT use a hardcoded image count constant.
6. THE Advertisement_Service SHALL enforce the subscription status check using both `user_subscriptions.status` and `current_period_end > NOW()` so that an ACTIVE subscription with a past `current_period_end` is treated as expired — regardless of whether the cron job has run yet.

---

### Requirement 7: Automated Subscription Expiry

**User Story:** As the platform operator, I want expired subscriptions to be automatically detected and processed daily, so that users who have not renewed are downgraded and their excess advertisements are paused without manual intervention.

#### Acceptance Criteria

1. THE Expiry_Cron_Job SHALL be scheduled to run once daily and SHALL query `user_subscriptions` for all rows where `status = 'ACTIVE'` and `current_period_end < NOW()`.
2. WHEN the Expiry_Cron_Job finds an expired ACTIVE subscription, THE Expiry_Cron_Job SHALL atomically update the subscription to `status = 'EXPIRED'` with `plan_id` set to the FREE plan's UUID, and update all `advertisements` rows for that user where `status = 'PUBLISHED'` to `status = 'PAUSED'`, within a single database transaction.
3. WHEN the Expiry_Cron_Job processes each expired subscription, THE Expiry_Cron_Job SHALL log the `user_id`, `subscription_id`, and count of paused advertisements at the `info` level.
4. IF the atomic expiry transaction fails for a given subscription, THE Expiry_Cron_Job SHALL log the error at the `error` level and continue processing the remaining expired subscriptions without halting the sweep.

---

### Requirement 8: Input Validation and Security

**User Story:** As the platform operator, I want all subscription API inputs to be validated and security-sensitive fields to be server-controlled, so that clients cannot tamper with subscription status, payment amounts, or transaction references.

#### Acceptance Criteria

1. THE Zod_Validator SHALL reject any `POST /api/subscriptions/checkout` request body that contains fields other than `plan_id`, returning HTTP 422 `VALIDATION_ERROR`.
2. THE Zod_Validator SHALL reject any `GET /api/subscriptions/payment-status/:tx_ref` request where `tx_ref` does not match the pattern `/^sub_[a-zA-Z0-9_-]+$/`, returning HTTP 422 `VALIDATION_ERROR`.
3. THE Zod_Validator SHALL reject `GET /api/subscriptions/history` requests where `page` or `page_size` are non-positive integers or where `page_size` exceeds 100, returning HTTP 422 `VALIDATION_ERROR`.
4. THE Subscription_Service SHALL derive the authenticated user's identity exclusively from `req.user.id` (the validated JWT payload) and SHALL NOT accept `user_id` from the request body or query parameters.
5. THE system SHALL store `CHAPA_SECRET_KEY` and `CHAPA_WEBHOOK_SECRET` only in environment variables accessed via `config/index.js` and SHALL NOT include these values in API responses, log entries, or error messages.

---

### Requirement 9: Payment Audit Trail

**User Story:** As the platform operator, I want all payment events and transactions to be logged immutably, so that I can audit payment history and reconcile discrepancies between Chapa and the platform's records.

#### Acceptance Criteria

1. THE Webhook_Handler SHALL insert a row into `payment_events` for every received webhook event with `chapa_tx_ref`, `event_type`, the full webhook `payload` as JSONB, and `processed_at` timestamp — regardless of whether the event results in a subscription activation.
2. WHEN a subscription is successfully activated, THE Subscription_Service SHALL store the complete Chapa Verify API response as JSONB in `payment_records.chapa_response`.
3. THE `payment_events` table SHALL enforce a UNIQUE constraint on `chapa_tx_ref` so that concurrent webhook deliveries for the same transaction cannot both insert a row — the second concurrent INSERT SHALL fail with a unique violation (`23505`) and the handler SHALL return HTTP 200 without further processing.
4. WHEN a payment activation fails due to an amount mismatch or a Chapa Verify API non-success, THE system SHALL preserve the `payment_events` row and the PENDING `payment_records` row so that manual reconciliation via `GET /api/subscriptions/payment-status/:tx_ref` remains possible.
