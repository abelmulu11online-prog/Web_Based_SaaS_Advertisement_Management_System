# Authentication System — Phase 4 Implementation

> **Version:** 1.0.0  
> **Phase:** 4 — Authentication  
> **Status:** Implemented and tested  
> **Last updated:** August 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Endpoints](#3-endpoints)
4. [Registration](#4-registration)
5. [Login](#5-login)
6. [Email Verification](#6-email-verification)
7. [Password Reset](#7-password-reset)
8. [Refresh Tokens & Logout](#8-refresh-tokens--logout)
9. [JWT Access Tokens](#9-jwt-access-tokens)
10. [Authentication Middleware](#10-authentication-middleware)
11. [Validation](#11-validation)
12. [Database Schema](#12-database-schema)
13. [Security Measures](#13-security-measures)
14. [Configuration](#14-configuration)
15. [Error Handling](#15-error-handling)
16. [API Response Format](#16-api-response-format)
17. [Swagger / OpenAPI Documentation](#17-swagger--openapi-documentation)
18. [Testing](#18-testing)
19. [File Reference](#19-file-reference)

---

## 1. Overview

The authentication system provides secure user registration, login, email verification, password reset, and session management through a dual-token strategy (JWT access tokens + database-stored refresh tokens).

### Capabilities

| Capability                             | Status      |
| -------------------------------------- | ----------- |
| User registration (email and/or phone) | Implemented |
| Login with email or phone              | Implemented |
| Email verification via token           | Implemented |
| Password reset via email token         | Implemented |
| Refresh token rotation                 | Implemented |
| Logout (refresh token revocation)      | Implemented |
| JWT Bearer authentication middleware   | Implemented |
| Role-based authorization middleware    | Implemented |
| Swagger/OpenAPI documentation          | Implemented |

### Design Principles

- **Layered architecture:** Routes → Validation Middleware → Controller → Service → Repository → Database
- **Single responsibility:** Each module handles one concern (verification, password reset, refresh tokens)
- **Defense in depth:** Multiple security layers (hashing, enumeration protection, row locking, transactions)
- **Non-blocking email:** Email delivery uses fire-and-forget pattern to avoid blocking HTTP responses
- **Atomic operations:** Database transactions ensure data consistency

---

## 2. Architecture

### Request Flow

```
Client Request
    │
    ▼
┌─────────────────────┐
│   Express Router     │  auth.routes.js
│   + validate(schema) │  middleware/validate.js
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Controller         │  auth.controller.js
│   (HTTP layer)       │  Parses request, delegates to service
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Service            │  auth.service.js
│   (Business logic)   │  verification.service.js
│                      │  passwordReset.service.js
│                      │  refreshToken.service.js (module)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Repository         │  auth.repository.js
│   (Data access)      │  verification.repository.js
│                      │  passwordReset.repository.js
│                      │  refreshToken.repository.js
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   PostgreSQL         │  pg pool / transaction client
└─────────────────────┘
```

### Module Separation

| Module                             | Responsibility                               |
| ---------------------------------- | -------------------------------------------- |
| `auth.*`                           | Registration, login, core user operations    |
| `verification.*`                   | Email verification token lifecycle           |
| `passwordReset.*`                  | Password reset token lifecycle               |
| `refreshToken.*` (module)          | Refresh token creation, rotation, revocation |
| `refreshToken.*` (service utility) | Cryptographic token generation/hashing       |
| `email.service.js`                 | SMTP transport and HTML email templates      |

---

## 3. Endpoints

All endpoints are mounted at `/api/auth` and are **public** (no JWT authentication required). Each endpoint uses Zod validation middleware.

| Method | Path                            | Description                        |
| ------ | ------------------------------- | ---------------------------------- |
| `POST` | `/api/auth/register`            | Create a new user account          |
| `POST` | `/api/auth/login`               | Authenticate and receive tokens    |
| `POST` | `/api/auth/logout`              | Revoke a refresh token             |
| `POST` | `/api/auth/refresh-token`       | Obtain new access + refresh tokens |
| `GET`  | `/api/auth/verify-email`        | Verify email address with token    |
| `POST` | `/api/auth/resend-verification` | Resend verification email          |
| `POST` | `/api/auth/forgot-password`     | Request a password reset email     |
| `POST` | `/api/auth/reset-password`      | Reset password with reset token    |

---

## 4. Registration

### `POST /api/auth/register`

Creates a new user account. If an email is provided, a verification token is generated and sent automatically within the same database transaction.

**Request Body:**

```json
{
  "email": "user@example.com",
  "phone": "+251912345678",
  "password": "SecurePass123!"
}
```

| Field      | Required                    | Rules                                                       |
| ---------- | --------------------------- | ----------------------------------------------------------- |
| `email`    | At least one of email/phone | Valid email format, normalized to lowercase                 |
| `phone`    | At least one of email/phone | E.164 international format                                  |
| `password` | Yes                         | Min 8 chars, lowercase, uppercase, digit, special character |

**Security — Rejected Fields:** The registration schema explicitly rejects `id`, `user_id`, `role`, `status`, `password_hash`, `is_verified`, `created_at`, `updated_at` using `z.never().optional()`. Combined with `.strict()`, any attempt to inject these fields returns a validation error.

**Success Response (201):**

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": "+251912345678",
    "role": "USER",
    "status": "ACTIVE",
    "created_at": "2026-08-20T10:00:00.000Z"
  }
}
```

**Behavior:**

1. Normalize email (lowercase, trim) and phone (strip whitespace)
2. Check for duplicate email → 409 `DUPLICATE_EMAIL`
3. Check for duplicate phone → 409 `DUPLICATE_PHONE`
4. Hash password with bcrypt (12 salt rounds)
5. Begin database transaction
6. Insert user with `status = 'ACTIVE'` and `role = 'USER'`
7. If email provided: generate verification token and send email (non-blocking)
8. Commit transaction
9. Return user data (without `password_hash`)

**Error Responses:**

| Status | Code               | Condition                       |
| ------ | ------------------ | ------------------------------- |
| 409    | `DUPLICATE_EMAIL`  | Email already registered        |
| 409    | `DUPLICATE_PHONE`  | Phone number already registered |
| 422    | `VALIDATION_ERROR` | Invalid request body            |

---

## 5. Login

### `POST /api/auth/login`

Authenticate with email/phone and password. Returns a JWT access token and a refresh token.

**Request Body:**

```json
{
  "identifier": "user@example.com",
  "password": "SecurePass123!"
}
```

| Field        | Required | Rules                         |
| ------------ | -------- | ----------------------------- |
| `identifier` | Yes      | Email address or phone number |
| `password`   | Yes      | Non-empty string              |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "phone": "+251912345678",
      "role": "USER",
      "status": "ACTIVE",
      "created_at": "2026-08-20T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5f6..."
  }
}
```

**Behavior:**

1. Begin database transaction
2. Look up user by email OR phone with `SELECT ... FOR UPDATE` (row lock)
3. Check account status (SUSPENDED → 403, DELETED → 403, not ACTIVE → 403)
4. Verify password against stored bcrypt hash
5. Generate JWT access token (contains `id`, `role`, `status`)
6. Generate refresh token (cryptographic random, stored as SHA-256 hash)
7. Commit transaction
8. Return user data + both tokens

**Error Responses:**

| Status | Code                  | Condition                                          |
| ------ | --------------------- | -------------------------------------------------- |
| 401    | `INVALID_CREDENTIALS` | User not found, no password set, or wrong password |
| 403    | `ACCOUNT_SUSPENDED`   | Account is suspended                               |
| 403    | `ACCOUNT_DELETED`     | Account is deleted                                 |
| 403    | `ACCOUNT_INACTIVE`    | Account is not active                              |
| 422    | `VALIDATION_ERROR`    | Invalid request body                               |

> **Note:** The same `INVALID_CREDENTIALS` error (401) is returned for unknown users, missing passwords, and wrong passwords. This prevents account enumeration via the login endpoint.

---

## 6. Email Verification

### `GET /api/auth/verify-email?token=<token>`

Verify a user's email address using the token sent via email.

**Query Parameters:**

| Parameter | Required | Description                       |
| --------- | -------- | --------------------------------- |
| `token`   | Yes      | Raw verification token from email |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "emailVerifiedAt": "2026-08-20T12:00:00.000Z"
  }
}
```

**Behavior:**

1. Hash the provided token with SHA-256
2. Look up token record by hash (primary lookup)
3. Fall back to raw token lookup (compatibility fallback)
4. Validate: not used, not expired, user exists
5. Mark token as used (`used_at = now()`)
6. Mark user's email as verified (`email_verified_at = now()`)

**Error Responses:**

| Status | Code                 | Condition                        |
| ------ | -------------------- | -------------------------------- |
| 400    | `INVALID_TOKEN`      | Token not found                  |
| 400    | `TOKEN_ALREADY_USED` | Token was already consumed       |
| 400    | `TOKEN_EXPIRED`      | Token has expired                |
| 400    | `USER_NOT_FOUND`     | Associated user no longer exists |
| 422    | `MISSING_TOKEN`      | No token provided                |

---

### `POST /api/auth/resend-verification`

Resend a verification email to an unverified address.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "If the email exists and requires verification, a verification email has been sent"
}
```

> **Enumeration Protection:** The same response is returned regardless of whether the email exists, is already verified, or has no account. This prevents attackers from discovering valid email addresses.

**Behavior:**

1. Look up user by email (including `email_verified_at`)
2. If user not found → return same success message (silent no-op)
3. If email already verified → return same success message (silent no-op)
4. Invalidate all existing unused tokens for this user
5. Generate new verification token and send email

---

## 7. Password Reset

### `POST /api/auth/forgot-password`

Request a password reset email.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset email has been sent"
}
```

> **Enumeration Protection:** Same response regardless of whether the email exists. Deleted accounts are also silently skipped.

**Behavior:**

1. Normalize email, look up user
2. If user not found or deleted → silent no-op
3. Invalidate all existing unused reset tokens for this user
4. Generate cryptographic reset token (32 bytes, hex-encoded)
5. Store SHA-256 hash in database with expiration
6. Send password reset email with URL: `{FRONTEND_URL}/reset-password?token={rawToken}`
7. Email send is non-blocking (fire-and-forget)

---

### `POST /api/auth/reset-password`

Reset a password using a valid reset token.

**Request Body:**

```json
{
  "token": "raw-reset-token-from-email",
  "password": "NewSecurePass123!"
}
```

| Field      | Required | Rules                                                          |
| ---------- | -------- | -------------------------------------------------------------- |
| `token`    | Yes      | Raw password reset token from email                            |
| `password` | Yes      | Same rules as registration (min 8, mixed case, digit, special) |

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Behavior (within a database transaction):**

1. Hash the provided token with SHA-256
2. Look up token record (hash-based, with raw fallback)
3. Validate: not used, not expired, user exists, account not deleted
4. Hash the new password
5. Begin transaction
6. Update user's `password_hash`
7. Mark the used reset token as consumed
8. Invalidate all other unused reset tokens for this user
9. **Revoke all active refresh tokens** (forces re-login on all devices)
10. Commit transaction

**Error Responses:**

| Status | Code                 | Condition                        |
| ------ | -------------------- | -------------------------------- |
| 400    | `INVALID_TOKEN`      | Token not found                  |
| 400    | `TOKEN_ALREADY_USED` | Token was already consumed       |
| 400    | `TOKEN_EXPIRED`      | Token has expired                |
| 400    | `USER_NOT_FOUND`     | Associated user no longer exists |
| 403    | `ACCOUNT_DELETED`    | Account has been deleted         |
| 422    | `MISSING_TOKEN`      | No token provided                |
| 422    | `MISSING_PASSWORD`   | No password provided             |

---

## 8. Refresh Tokens & Logout

### `POST /api/auth/refresh-token`

Obtain a new access token using a refresh token. Implements **token rotation** — the old refresh token is revoked and a new one is issued.

**Request Body:**

```json
{
  "refreshToken": "raw-refresh-token"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "new-raw-refresh-token"
  }
}
```

**Behavior (within a database transaction):**

1. Hash the supplied refresh token
2. Look up active (non-revoked, non-expired) token record
3. Verify associated user exists and account is ACTIVE
4. Revoke the old refresh token
5. Generate new JWT access token
6. Generate new refresh token (stored as hash)
7. Commit transaction

**Error Responses:**

| Status | Code                    | Condition                            |
| ------ | ----------------------- | ------------------------------------ |
| 401    | `INVALID_REFRESH_TOKEN` | Token not found, expired, or revoked |
| 403    | `ACCOUNT_SUSPENDED`     | Account is suspended                 |
| 403    | `ACCOUNT_DELETED`       | Account is deleted                   |
| 403    | `ACCOUNT_INACTIVE`      | Account is not active                |

---

### `POST /api/auth/logout`

Revoke a refresh token to prevent future token refresh.

**Request Body:**

```json
{
  "refreshToken": "raw-refresh-token-to-revoke"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

> **Note:** Logout revokes the refresh token but does not immediately invalidate existing JWT access tokens. Access tokens remain valid until their natural expiration. This is by design — JWTs are stateless.

**Behavior:**

1. Hash the supplied refresh token
2. Look up token record by hash
3. If found and not already revoked → mark `revoked_at = now()`
4. If not found → silently succeed (no information leakage)

---

## 9. JWT Access Tokens

### Configuration

| Setting    | Environment Variable | Default                                                       |
| ---------- | -------------------- | ------------------------------------------------------------- |
| Secret     | `JWT_SECRET`         | `change-me-in-development` (production requires explicit set) |
| Expiration | `JWT_EXPIRES_IN`     | `7d`                                                          |
| Algorithm  | —                    | HS256 (default for `jsonwebtoken`)                            |

### Token Payload

```json
{
  "id": "user-uuid",
  "role": "USER",
  "status": "ACTIVE",
  "iat": 1724155200,
  "exp": 1724760000
}
```

### Utility Functions (`src/utils/jwt.js`)

| Function                 | Description                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `generateToken(payload)` | Signs a JWT with config secret and expiration                                                |
| `verifyToken(token)`     | Verifies and decodes; maps errors to `TOKEN_EXPIRED`, `INVALID_TOKEN`, `TOKEN_NOT_YET_VALID` |

---

## 10. Authentication Middleware

### `authenticate` (`src/middleware/authenticate.js`)

Extracts and verifies the JWT from the `Authorization` header.

```
Authorization: Bearer <jwt-access-token>
```

**Behavior:**

1. Check for `Authorization` header → 401 `AUTHENTICATION_REQUIRED` if missing
2. Validate format: `Bearer <token>` → 400 `INVALID_AUTH_HEADER` if malformed
3. Verify JWT signature and expiration → 401 with specific code on failure
4. Attach decoded payload to `req.user`

### `requireRole(...allowedRoles)` (`src/middleware/requireRole.js`)

Checks that the authenticated user has one of the allowed roles.

**Usage:**

```javascript
router.get("/admin", authenticate, requireRole("ADMIN"), adminController.index);
```

**Behavior:**

1. Check `req.user?.role` exists → 401 `AUTHENTICATION_REQUIRED` if missing
2. Check role is in `allowedRoles` → 403 `FORBIDDEN` if not authorized

---

## 11. Validation

### Zod Schemas (`src/modules/auth/auth.schemas.js`)

All request validation uses Zod with the following security features:

**`.strict()` mode:** Rejects any unknown fields in the request body/query/params.

**Rejected security fields:** The following fields are explicitly rejected with `z.never().optional()` on sensitive schemas:

| Field           | Reason                        |
| --------------- | ----------------------------- |
| `id`            | Server-generated              |
| `user_id`       | Server-generated              |
| `role`          | Must not be client-controlled |
| `status`        | Must not be client-controlled |
| `password_hash` | Internal security field       |
| `is_verified`   | Server-managed                |
| `created_at`    | Server-generated              |
| `updated_at`    | Server-generated              |

**Password rules (enforced via regex):**

| Rule                           | Regex            |
| ------------------------------ | ---------------- |
| Minimum 8 characters           | `.min(8)`        |
| At least one lowercase letter  | `/[a-z]/`        |
| At least one uppercase letter  | `/[A-Z]/`        |
| At least one digit             | `/[0-9]/`        |
| At least one special character | `/[^a-zA-Z0-9]/` |

**Registration refinement:** `.refine()` ensures at least one of `email` or `phone` is provided.

### Validation Middleware (`src/middleware/validate.js`)

The `validate(schema)` middleware:

1. Constructs `{ body, query, params }` from the request
2. Runs `schema.safeParse()`
3. On success: replaces request fields with parsed/coerced values
4. On failure: returns 422 `VALIDATION_ERROR` with structured issue list

---

## 12. Database Schema

### `users` (Migration 001 + 010)

| Column              | Type        | Constraints                | Description                       |
| ------------------- | ----------- | -------------------------- | --------------------------------- |
| `id`                | UUID        | PK, auto-generated         | User identifier                   |
| `email`             | TEXT        | UNIQUE, nullable           | Email address                     |
| `phone`             | TEXT        | UNIQUE, nullable           | Phone number (E.164)              |
| `password_hash`     | TEXT        | nullable                   | bcrypt hash (NULL for OAuth)      |
| `role`              | TEXT        | NOT NULL, DEFAULT 'USER'   | CHECK: USER, ADMIN                |
| `status`            | TEXT        | NOT NULL, DEFAULT 'ACTIVE' | CHECK: ACTIVE, SUSPENDED, DELETED |
| `email_verified_at` | TIMESTAMPTZ | nullable                   | Set when email is verified        |
| `created_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT now()    | Creation timestamp                |
| `updated_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT now()    | Last update timestamp             |

**Constraints:**

- `users_has_contact`: At least one of `email` or `phone` must be non-NULL
- Partial indexes on `email` and `phone` for efficient login lookups

### `email_verification_tokens` (Migration 011)

| Column       | Type        | Constraints             | Description               |
| ------------ | ----------- | ----------------------- | ------------------------- |
| `id`         | UUID        | PK                      | Token identifier          |
| `user_id`    | UUID        | FK → users(id), CASCADE | User being verified       |
| `token_hash` | TEXT        | NOT NULL                | SHA-256 hash of raw token |
| `expires_at` | TIMESTAMPTZ | NOT NULL                | Token expiration          |
| `used_at`    | TIMESTAMPTZ | nullable                | When token was consumed   |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Audit timestamp           |

**Indexes:** `token_hash`, `user_id`, partial index on `used_at WHERE NULL`, `expires_at`

### `password_reset_tokens` (Migration 012)

| Column       | Type        | Constraints             | Description                    |
| ------------ | ----------- | ----------------------- | ------------------------------ |
| `id`         | UUID        | PK                      | Token identifier               |
| `user_id`    | UUID        | FK → users(id), CASCADE | User requesting reset          |
| `token_hash` | TEXT        | NOT NULL                | SHA-256 hash of raw token      |
| `expires_at` | TIMESTAMPTZ | NOT NULL                | Token expiration (short-lived) |
| `used_at`    | TIMESTAMPTZ | nullable                | When token was consumed        |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Audit timestamp                |

**Indexes:** `token_hash`, `user_id`, partial index on `used_at WHERE NULL`, `expires_at`

### `refresh_tokens` (Migration 013)

| Column       | Type        | Constraints             | Description               |
| ------------ | ----------- | ----------------------- | ------------------------- |
| `id`         | UUID        | PK                      | Token identifier          |
| `user_id`    | UUID        | FK → users(id), CASCADE | Token owner               |
| `token_hash` | TEXT        | NOT NULL                | SHA-256 hash of raw token |
| `expires_at` | TIMESTAMPTZ | NOT NULL                | Token expiration          |
| `revoked_at` | TIMESTAMPTZ | nullable                | When token was revoked    |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp        |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp     |

**Indexes:** `token_hash`, `user_id`, partial index on `revoked_at WHERE NULL`, `expires_at`, unique composite on `(user_id, token_hash)`

---

## 13. Security Measures

### Password Security

| Measure                        | Implementation                                |
| ------------------------------ | --------------------------------------------- |
| Hashing algorithm              | bcrypt (via `bcryptjs`)                       |
| Salt rounds                    | 12                                            |
| Raw passwords never stored     | Only bcrypt hash persisted                    |
| Password never returned in API | Excluded from all SELECT queries in responses |

### Token Security

| Token Type         | Generation               | Storage                 | Lifetime                   | Single-Use      |
| ------------------ | ------------------------ | ----------------------- | -------------------------- | --------------- |
| Access token (JWT) | `jsonwebtoken.sign()`    | Stateless (client-side) | Configurable (default 7d)  | N/A (stateless) |
| Refresh token      | `crypto.randomBytes(32)` | SHA-256 hash in DB      | Configurable (default 7d)  | Rotated on use  |
| Email verification | `crypto.randomBytes(32)` | SHA-256 hash in DB      | Configurable (default 24h) | Yes (`used_at`) |
| Password reset     | `crypto.randomBytes(32)` | SHA-256 hash in DB      | Configurable (default 1h)  | Yes (`used_at`) |

### Account Enumeration Protection

| Endpoint                             | Protection                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| `POST /api/auth/login`               | Same `INVALID_CREDENTIALS` (401) for unknown user, wrong password, or missing password |
| `POST /api/auth/resend-verification` | Same response whether email exists or not                                              |
| `POST /api/auth/forgot-password`     | Same response whether email exists or not                                              |
| `POST /api/auth/logout`              | Silent success even if token doesn't exist                                             |

### Database Security

| Measure               | Implementation                                                         |
| --------------------- | ---------------------------------------------------------------------- |
| Parameterized queries | All SQL uses `$1`, `$2` placeholders — never interpolates user input   |
| Row locking           | `SELECT ... FOR UPDATE` during login prevents concurrent modifications |
| Transactions          | `BEGIN`/`COMMIT`/`ROLLBACK` for atomic multi-step operations           |
| CASCADE deletes       | Token tables cascade on user deletion                                  |

### HTTP Security

| Measure                        | Implementation                                     |
| ------------------------------ | -------------------------------------------------- |
| Helmet                         | Security headers on all responses                  |
| CORS                           | Configurable allowed origins                       |
| Body size limit                | 1MB max request body                               |
| Authorization header redaction | Logged headers redact `authorization` and `cookie` |

### Input Validation

| Measure                  | Implementation                                                    |
| ------------------------ | ----------------------------------------------------------------- |
| Strict mode              | `.strict()` rejects unknown fields                                |
| Security field rejection | `z.never().optional()` on `role`, `status`, `password_hash`, etc. |
| Type coercion            | Email normalized to lowercase, phone whitespace stripped          |
| Password complexity      | 5 regex rules enforced at validation layer                        |

---

## 14. Configuration

All configuration is centralized in `src/config/index.js`. Never read `process.env` directly in application code.

| Setting                       | Environment Variable            | Default                      | Description                           |
| ----------------------------- | ------------------------------- | ---------------------------- | ------------------------------------- |
| JWT Secret                    | `JWT_SECRET`                    | `change-me-in-development`   | **Required in production**            |
| JWT Expiration                | `JWT_EXPIRES_IN`                | `7d`                         | Access token lifetime                 |
| Email Verification Expiration | `EMAIL_VERIFICATION_EXPIRES_IN` | `24h`                        | Verification token lifetime           |
| Password Reset Expiration     | `PASSWORD_RESET_EXPIRES_IN`     | `1h`                         | Reset token lifetime                  |
| Refresh Token Expiration      | `REFRESH_TOKEN_EXPIRES_IN`      | `7d`                         | Refresh token lifetime                |
| Frontend URL                  | `FRONTEND_URL`                  | `http://localhost:5173`      | Base URL for verification/reset links |
| SMTP Host                     | `SMTP_HOST`                     | `smtp.gmail.com`             | Email server hostname                 |
| SMTP Port                     | `SMTP_PORT`                     | `587`                        | Email server port                     |
| SMTP Secure                   | `SMTP_SECURE`                   | `false`                      | Use TLS                               |
| SMTP User                     | `SMTP_USER`                     | _(empty)_                    | SMTP authentication username          |
| SMTP Password                 | `SMTP_PASSWORD`                 | _(empty)_                    | SMTP authentication password          |
| Email From                    | `EMAIL_FROM`                    | `noreply@localdiscovery.com` | Sender address                        |

> **Production requirement:** `JWT_SECRET` is required in production. The application will fail fast at startup if it is missing.

---

## 15. Error Handling

### Error Flow

1. Service layer throws errors using `createError(message, statusCode, code)`
2. Errors propagate through `asyncHandler` wrapper to Express `next()`
3. Centralized `errorHandler` middleware formats the response

### Error Codes

| Code                      | Status  | Description                           |
| ------------------------- | ------- | ------------------------------------- |
| `INVALID_CREDENTIALS`     | 401     | Login failed (generic)                |
| `INVALID_TOKEN`           | 400/401 | Token not found or JWT invalid        |
| `TOKEN_EXPIRED`           | 400/401 | Token has expired                     |
| `TOKEN_ALREADY_USED`      | 400     | Token was already consumed            |
| `MISSING_TOKEN`           | 422     | Required token not provided           |
| `ACCOUNT_SUSPENDED`       | 403     | Account is suspended                  |
| `ACCOUNT_DELETED`         | 403     | Account is deleted                    |
| `ACCOUNT_INACTIVE`        | 403     | Account is not active                 |
| `DUPLICATE_EMAIL`         | 409     | Email already registered              |
| `DUPLICATE_PHONE`         | 409     | Phone already registered              |
| `INVALID_REFRESH_TOKEN`   | 401     | Refresh token invalid/expired/revoked |
| `AUTHENTICATION_REQUIRED` | 401     | No JWT provided                       |
| `INVALID_AUTH_HEADER`     | 400     | Malformed Authorization header        |
| `FORBIDDEN`               | 403     | Insufficient role permissions         |
| `VALIDATION_ERROR`        | 422     | Request validation failed             |
| `PASSWORD_RESET_FAILED`   | 500     | Transaction failure during reset      |

### Special Error Handling

- **PostgreSQL unique constraint violations** (code `23505`) are automatically mapped to friendly errors (`DUPLICATE_EMAIL`, `DUPLICATE_PHONE`, etc.) by the error handler
- **Zod validation errors** are formatted with path and message for each issue
- **Stack traces** are only included in development mode
- **SQL errors and internals** are never exposed in production responses

---

## 16. API Response Format

All responses follow the standard project format defined in `Nathy.md`:

### Success

```json
{
  "success": true,
  "message": "Human-readable description",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Human-readable description",
  "error": {
    "code": "MACHINE_READABLE_CODE"
  }
}
```

### Validation Error

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "issues": [
      { "path": "body.email", "message": "Invalid email format" },
      {
        "path": "body.password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

---

## 17. Swagger / OpenAPI Documentation

### Setup

- **Library:** `swagger-jsdoc` + `swagger-ui-express`
- **Specification:** OpenAPI 3.0.3
- **Annotation location:** JSDoc comments in `src/modules/auth/auth.controller.js`
- **API scanning:** `./src/**/*.js` (all source files)

### Access Points

| URL                      | Description                            |
| ------------------------ | -------------------------------------- |
| `/api-docs`              | Swagger UI (interactive documentation) |
| `/api-docs/swagger.json` | Raw OpenAPI JSON specification         |

### Security Scheme

```yaml
BearerAuth:
  type: http
  scheme: bearer
  bearerFormat: JWT
```

All auth endpoints are tagged with `Authentication` and marked `security: []` (public). Protected endpoints inherit the global `BearerAuth` requirement.

### Reusable Schemas

| Schema                    | Description                                       |
| ------------------------- | ------------------------------------------------- |
| `SuccessResponse`         | `{ success, message, data }`                      |
| `ErrorResponse`           | `{ success, message, error: { code } }`           |
| `ValidationErrorResponse` | `{ success, message, error: { code, issues[] } }` |

---

## 18. Testing

### Test Suite Overview

| Test File                    | Scope                                                                                                                          | Layer                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| `security.test.js`           | Password utility, JWT utility, authenticate middleware, requireRole middleware, Swagger endpoint                               | Unit + Integration   |
| `auth.test.js`               | Registration service, login service, auth repository, duplicate protection, password security, account status, role protection | Service + Repository |
| `auth-api.test.js`           | HTTP endpoints for register, login, logout, refresh-token                                                                      | Integration (HTTP)   |
| `email-verification.test.js` | Token generation, validation, verify-email endpoint, resend-verification                                                       | Integration (HTTP)   |
| `password-reset.test.js`     | Token generation, validation, forgot-password, reset-password endpoints                                                        | Integration (HTTP)   |
| `refresh-token.test.js`      | Token rotation, revocation, logout, password reset integration                                                                 | Integration (HTTP)   |
| `schema.test.js`             | Table existence, constraints, foreign keys, cascade deletes for all auth tables                                                | Database             |

### Test Execution

```bash
# Run all tests (serial to prevent cross-file DB race conditions)
npm test

# Run tests without setup
npm run test:run
```

Tests run with `--test-concurrency=1` to prevent cross-test interference, since all test files share the same database.

### Test Database

All tests use the same PostgreSQL database via `DATABASE_URL`. Each test file cleans up its own test data using scoped `DELETE` queries in `beforeEach` hooks.

---

## 19. File Reference

### Authentication Module (`src/modules/auth/`)

| File                          | Purpose                                             |
| ----------------------------- | --------------------------------------------------- |
| `auth.routes.js`              | Route definitions and middleware chain              |
| `auth.schemas.js`             | Zod validation schemas                              |
| `auth.controller.js`          | HTTP handlers with Swagger JSDoc                    |
| `auth.service.js`             | Registration and login business logic               |
| `auth.repository.js`          | User data-access queries                            |
| `verification.service.js`     | Email verification business logic                   |
| `verification.repository.js`  | Verification token data-access queries              |
| `passwordReset.service.js`    | Password reset business logic                       |
| `passwordReset.repository.js` | Password reset token data-access queries            |
| `refreshToken.service.js`     | Refresh token business logic (rotation, revocation) |
| `refreshToken.repository.js`  | Refresh token data-access queries                   |

### Shared Services (`src/services/`)

| File                            | Purpose                                    |
| ------------------------------- | ------------------------------------------ |
| `verificationToken.service.js`  | Crypto utilities for verification tokens   |
| `passwordResetToken.service.js` | Crypto utilities for password reset tokens |
| `refreshToken.service.js`       | Crypto utilities for refresh tokens        |
| `email.service.js`              | SMTP transport and HTML email templates    |

### Middleware (`src/middleware/`)

| File              | Purpose                       |
| ----------------- | ----------------------------- |
| `authenticate.js` | JWT Bearer token verification |
| `requireRole.js`  | Role-based authorization      |
| `validate.js`     | Zod request validation        |
| `errorHandler.js` | Centralized error formatting  |

### Utilities (`src/utils/`)

| File          | Purpose                                                   |
| ------------- | --------------------------------------------------------- |
| `jwt.js`      | JWT sign and verify                                       |
| `password.js` | bcrypt hash and compare                                   |
| `index.js`    | `asyncHandler`, `sendSuccess`, `sendError`, `createError` |
| `logger.js`   | Pino logger instance                                      |

### Database Migrations (`backend/database/migrations/`)

| File                                       | Tables                              |
| ------------------------------------------ | ----------------------------------- |
| `001_create_users.sql`                     | `users`                             |
| `010_add_email_verification_fields.sql`    | Adds `email_verified_at` to `users` |
| `011_create_email_verification_tokens.sql` | `email_verification_tokens`         |
| `012_create_password_reset_tokens.sql`     | `password_reset_tokens`             |
| `013_create_refresh_tokens.sql`            | `refresh_tokens`                    |

### Configuration (`src/config/`)

| File         | Purpose                               |
| ------------ | ------------------------------------- |
| `index.js`   | Centralized environment configuration |
| `swagger.js` | OpenAPI/Swagger specification         |
