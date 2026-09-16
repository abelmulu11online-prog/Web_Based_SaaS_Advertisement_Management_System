# Phase: Profile Creation, Business Verification, Admin Approval & Publishing

**Status:** Complete  
**Build:** ✅ Backend loads cleanly · ✅ Frontend Vite build 0 errors 0 warnings  
**Stack:** React + Vite · TanStack Query · Axios · Node.js + Express · PostgreSQL · raw `pg` · Zod · JWT

---

## Overview

This phase adds the complete profile verification lifecycle on top of the existing account/profile system. It does **not** replace or duplicate any existing authentication, user, or profile code — all new logic is additive.

The key workflow is:

```
User creates account
        ↓
User logs in → redirected to profile creation if no profile exists
        ↓
User creates profile → selects profile type
        ↓
If SHOP / BUSINESS / COMPANY / ORGANIZATION:
    Enter business/legal information
    Upload verification document (JPG/PNG/PDF)
    Enter additional information
    Click "Submit for Review"
        ↓
    Profile status → UNDER_REVIEW (profile hidden from public)
        ↓
    Admin reviews information and document
        ↓
    Admin approves → profile status → ACTIVE
        ↓
    User clicks "Publish Profile"
        ↓
    Profile becomes visible on public directory

If PERSONAL / PROFESSIONAL / FREELANCER:
    Profile can be published directly (no verification gate)
```

---

## Profile Types

| Type         | Requires Verification | Notes                              |
|--------------|----------------------|------------------------------------|
| PERSONAL     | No                   | Can publish immediately            |
| PROFESSIONAL | No                   | Can publish immediately            |
| FREELANCER   | No                   | Can publish immediately            |
| SHOP         | **Yes**              | Retail / products                  |
| BUSINESS     | **Yes**              | Company / enterprise               |
| COMPANY      | **Yes**              | Registered company                 |
| ORGANIZATION | **Yes**              | NGO / association / legal entity   |

The shared source of truth for this rule:

- **Backend:** `backend/src/utils/verificationTypes.js` — `requiresVerification(profileType)`
- **Frontend:** `frontend/src/utils/profileVerification.js` — `requiresVerification(profileType)`

Both files must be kept in sync.

---

## Verification Status Values

Defined in the `verification_status` PostgreSQL enum (migrations 021 + 036).

| Status       | Meaning                                             | Public? |
|--------------|-----------------------------------------------------|---------|
| UNVERIFIED   | Default — no verification submitted                 | No†     |
| PENDING      | Legacy value — treated as UNVERIFIED                | No      |
| UNDER_REVIEW | User submitted — awaiting admin review              | No      |
| ACTIVE       | Admin approved — user can publish                   | Yes†    |
| VERIFIED     | Legacy value — treated as ACTIVE                    | Yes†    |
| REJECTED     | Admin rejected — user must resubmit                 | No      |
| SUSPENDED    | Admin suspended the profile                         | No      |

† For SHOP/BUSINESS/COMPANY/ORGANIZATION: ACTIVE/VERIFIED required for public visibility.  
  For PERSONAL/PROFESSIONAL/FREELANCER: any non-suspended status is allowed.

---

## Required Verification Fields

These fields are collected only when the profile type requires verification:

| DB Column               | Type          | Description                                 |
|-------------------------|---------------|---------------------------------------------|
| `business_name`         | TEXT          | Legal/business/organization name            |
| `business_type`         | TEXT          | Type of entity (e.g., Private Ltd, NGO)     |
| `license_number`        | TEXT          | Registration or license number              |
| `license_issue_date`    | DATE          | Issue date (YYYY-MM-DD)                     |
| `license_expiry_date`   | DATE          | Expiry date if applicable (YYYY-MM-DD)      |
| `business_address`      | TEXT          | Street address                              |
| `business_city`         | TEXT          | City                                        |
| `business_region`       | TEXT          | Region / state / province                   |
| `business_country`      | TEXT          | Country                                     |
| `additional_information`| TEXT (≤3000)  | Free-text description for admin review      |

---

## Accepted Document Formats

| Format | MIME Type          | Max Size |
|--------|--------------------|----------|
| JPEG   | image/jpeg         | 10 MB    |
| PNG    | image/png          | 10 MB    |
| PDF    | application/pdf    | 10 MB    |

Documents are stored in Supabase Storage under the path:

```
verification-docs/{profileId}/{uuid}.{ext}
```

Documents are **private** — they are never returned by public profile APIs. Access is via short-lived signed URLs generated server-side (5–10 minute expiry), available only to the profile owner and admins.

---

## Database Changes

### Migration 036 — `036_extend_profiles_verification.sql`

Extends the `profiles` table:

**New enum values added to `verification_status`:**
- `UNDER_REVIEW`
- `ACTIVE`
- `SUSPENDED`

**New columns added to `profiles`:**

| Column             | Type        | Notes                                      |
|--------------------|-------------|--------------------------------------------|
| `business_name`    | TEXT        | —                                          |
| `business_type`    | TEXT        | —                                          |
| `license_number`   | TEXT        | —                                          |
| `license_issue_date`  | DATE     | —                                          |
| `license_expiry_date` | DATE     | —                                          |
| `business_address` | TEXT        | —                                          |
| `business_city`    | TEXT        | —                                          |
| `business_region`  | TEXT        | —                                          |
| `business_country` | TEXT        | —                                          |
| `additional_information` | TEXT  | Max 3000 chars                             |
| `reviewed_by`      | UUID FK→users | Admin who last reviewed                  |
| `reviewed_at`      | TIMESTAMPTZ | Timestamp of last review action            |
| `rejection_reason` | TEXT        | Shown to user on rejection                 |
| `published_at`     | TIMESTAMPTZ | When the user first published              |

**New indexes:**
- `idx_profiles_verification_status` — fast admin queue queries
- `idx_profiles_published_active` — fast public search (is_published + verification_status)

### Migration 037 — `037_create_verification_documents.sql`

Creates a new private `verification_documents` table:

| Column          | Type        | Notes                                           |
|-----------------|-------------|-------------------------------------------------|
| `id`            | UUID PK     | —                                               |
| `profile_id`    | UUID FK     | UNIQUE — one active document per profile        |
| `document_name` | TEXT        | Sanitised original filename                     |
| `document_type` | TEXT        | e.g., `business_license`                        |
| `storage_key`   | TEXT        | Supabase Storage path (used for signed URLs)    |
| `mime_type`     | TEXT        | image/jpeg / image/png / application/pdf        |
| `file_size`     | BIGINT      | File size in bytes                              |
| `uploaded_at`   | TIMESTAMPTZ | Auto-set on insert                              |
| `admin_notes`   | TEXT        | Optional reviewer notes                         |

**Security:** This table has a UNIQUE constraint on `profile_id`. The UNIQUE index enforces one active document per profile. Old documents are deleted from storage when replaced.

---

## API Endpoints

### User-facing (`/api/profile/*`) — requires `authenticate`

| Method | Path                                        | Description                                         |
|--------|---------------------------------------------|-----------------------------------------------------|
| GET    | `/api/profile`                              | Get own profile (includes all verification fields)  |
| POST   | `/api/profile`                              | Create profile                                      |
| PATCH  | `/api/profile`                              | Update profile (includes verification fields)       |
| POST   | `/api/profile/verification-document/upload` | Upload verification document (multipart/form-data, field: `document`) |
| GET    | `/api/profile/verification-document`        | Get own document metadata (no storage key)          |
| POST   | `/api/profile/submit-review`                | Submit for admin review (UNVERIFIED/REJECTED → UNDER_REVIEW) |
| POST   | `/api/profile/resubmit`                     | Resubmit rejected profile (REJECTED → UNDER_REVIEW) |
| POST   | `/api/profile/publish`                      | Publish profile (enforces approval gate server-side) |
| POST   | `/api/profile/unpublish`                    | Unpublish profile                                   |

### Admin (`/api/admin/*`) — requires `authenticate` + `requireRole('ADMIN')`

| Method | Path                                                   | Description                                    |
|--------|--------------------------------------------------------|------------------------------------------------|
| GET    | `/api/admin/profile-verifications`                     | List profiles (filter by status, type, search) |
| GET    | `/api/admin/profile-verifications/stats`               | Count of profiles under review                 |
| GET    | `/api/admin/profile-verifications/:profileId`          | Full detail + secure document signed URL       |
| POST   | `/api/admin/profile-verifications/:profileId/approve`  | Approve profile → ACTIVE                       |
| POST   | `/api/admin/profile-verifications/:profileId/reject`   | Reject profile → REJECTED (reason required)    |
| POST   | `/api/admin/profile-verifications/:profileId/suspend`  | Suspend profile → SUSPENDED                    |

---

## Backend Architecture

```
Request
   ↓
authenticate middleware  (JWT verification)
   ↓
requireRole('ADMIN')     (admin routes only)
   ↓
validate middleware      (Zod schema)
   ↓
Controller               (HTTP layer — extract params, call service)
   ↓
Service                  (business logic — ownership, status transitions, notifications)
   ↓
Repository               (parameterised SQL queries)
   ↓
PostgreSQL
```

### Files Created

| File | Description |
|------|-------------|
| `backend/src/utils/verificationTypes.js` | Shared constants: `VERIFICATION_REQUIRED_TYPES`, `requiresVerification()`, `canPublish()`, `canBePublic()`, `VERIFICATION_STATUS` enum, document MIME types/size limits |
| `backend/src/middleware/uploadDocument.js` | Multer config for document uploads (PDF+images, 10 MB, field: `document`) |
| `backend/database/migrations/036_extend_profiles_verification.sql` | DB migration — verification fields on profiles table |
| `backend/database/migrations/037_create_verification_documents.sql` | DB migration — private verification_documents table |

### Files Modified

| File | Changes |
|------|---------|
| `backend/src/utils/storage.js` | Added `buildVerificationDocPath()`, `uploadVerificationDoc()`, `getVerificationDocSignedUrl()` |
| `backend/src/modules/users/users.repository.js` | Extended `updateProfile()` with 036 fields; added `upsertVerificationDocument()`, `findVerificationDocument()`, `findVerificationDocStorageKey()`, `setVerificationStatusByUserId()`, `publishProfileByUserId()`, `unpublishProfileByUserId()` |
| `backend/src/modules/users/users.service.js` | Extended `formatProfile()` with verification fields; added `uploadVerificationDocument()`, `getMyVerificationDocument()`, `submitForReview()`, `resubmitForReview()`, `publishProfile()`, `unpublishProfile()` |
| `backend/src/modules/users/users.controller.js` | Added handlers for all new verification endpoints |
| `backend/src/modules/users/users.routes.js` | Added 6 new verification routes; imports `uploadDocumentMiddleware` |
| `backend/src/modules/users/users.schemas.js` | Extended `updateProfileSchema` with all 036 business/verification fields |
| `backend/src/modules/admin/admin.repository.js` | Added `findProfilesByVerificationStatus()`, `findProfileVerificationById()`, `updateProfileVerificationStatus()`, `updateDocumentAdminNotes()`, `countProfilesUnderReview()` |
| `backend/src/modules/admin/admin.service.js` | Added `listProfileVerifications()`, `getProfileVerificationDetail()`, `approveProfile()`, `rejectProfile()`, `suspendProfile()`, `getVerificationStats()`, `_notifyUser()` |
| `backend/src/modules/admin/admin.controller.js` | Added 6 new verification handlers |
| `backend/src/modules/admin/admin.routes.js` | Added 6 new `/profile-verifications` routes with Zod validation |
| `backend/src/modules/profiles/profiles.repository.js` | `findPublicProfileBySlug()` and `searchProfiles()` now enforce verification gate: SHOP/BUSINESS/COMPANY/ORGANIZATION must be ACTIVE or VERIFIED to appear publicly |

---

## Frontend Architecture

```
PostgreSQL
   ↓
Repository → Service → Controller → Express
   ↓
Axios (apiClient.js — Bearer token interceptor)
   ↓
React Query (query/mutation with cache invalidation)
   ↓
Page component
```

### Files Created

| File | Description |
|------|-------------|
| `frontend/src/utils/profileVerification.js` | Shared constants mirroring backend: `VERIFICATION_REQUIRED_TYPES`, `requiresVerification()`, `canPublish()`, `statusLabel()`, `statusBadgeClasses()`, document format constants |
| `frontend/src/pages/admin/AdminVerificationsPage.jsx` | Admin profile verification dashboard with queue list, filter/search, and detail drawer with approve/reject/suspend actions |

### Files Modified

| File | Changes |
|------|---------|
| `frontend/src/services/profiles.service.js` | Added `uploadVerificationDocument()`, `getMyVerificationDocument()`, `submitProfileForReview()`, `resubmitProfileForReview()`, `publishProfile()`, `unpublishProfile()` |
| `frontend/src/services/admin.service.js` | Added `getProfileVerifications()`, `getProfileVerificationDetail()`, `approveProfileVerification()`, `rejectProfileVerification()`, `suspendProfileVerification()`, `getVerificationStats()` |
| `frontend/src/features/profiles/hooks/useProfile.js` | Added `useMyVerificationDocument`, `useUploadVerificationDocument`, `useSubmitForReview`, `useResubmitForReview`, `usePublishProfile`, `useUnpublishProfile` |
| `frontend/src/features/admin/hooks/useAdmin.js` | Added `useAdminVerifications`, `useAdminVerificationDetail`, `useAdminVerificationStats`, `useApproveVerification`, `useRejectVerification`, `useSuspendVerification` |
| `frontend/src/pages/dashboard/ProfileEditPage.jsx` | Full rewrite: added conditional `VerificationSection` (shown only for SHOP/BUSINESS/COMPANY/ORGANIZATION), `DocumentUploadSection` with drag-drop, progress, file validation, status banners, submit/resubmit buttons. `CreateProfileSetup` shows verification notice for business types. |
| `frontend/src/pages/DashboardPage.jsx` | Post-login redirect to `/dashboard/profile` if no profile. Replaced `useUpdateProfile` with `usePublishProfile`/`useUnpublishProfile`. Added verification status banner with contextual messages. Publish button disabled when `canPublish()` returns false. Rejection reason shown inline. |
| `frontend/src/routes/AppRoutes.jsx` | Added `/admin/verifications` route |
| `frontend/src/components/layout/AdminLayout.jsx` | Added `ShieldCheck` Verifications nav item between Users and Advertisements |
| `frontend/src/pages/admin/AdminOverviewPage.jsx` | Added Verifications nav card |

---

## User Workflow

### Personal / Professional / Freelancer

1. Register → verify email → log in
2. Redirected to `/dashboard/profile` if no profile
3. Create profile with display name, slug, profile type
4. Fill in optional fields (headline, description, contact, location)
5. Click the publish toggle to go live
6. Profile is publicly visible immediately

### Shop / Business / Company / Organization

1. Register → verify email → log in
2. Redirected to `/dashboard/profile` if no profile
3. Select profile type (SHOP/BUSINESS/COMPANY/ORGANIZATION)
4. A notice appears: "This profile type requires admin verification"
5. Fill in basic profile fields
6. Complete the **Business / Legal Verification** section:
   - Legal/business name
   - Business or organization type
   - Registration/license number
   - Issue and expiry dates
   - Business address, city, region, country
   - Contact phone
   - Additional information (describe the business)
7. Upload a supporting document (JPG/PNG/PDF, max 10 MB)
8. Save the profile (PATCH `/api/profile`)
9. Click **Submit for Review** → status becomes `UNDER_REVIEW`
10. Wait for admin review
11. Receive notification on approval or rejection
12. If approved → status is `ACTIVE` → **Publish Profile** button enabled
13. Click **Publish Profile** → profile is publicly visible

### Resubmission after Rejection

1. User sees rejection reason on dashboard and profile edit page
2. User updates business information and/or replaces document
3. Click **Resubmit for Review** → status returns to `UNDER_REVIEW`
4. Admin reviews again — same approval workflow

---

## Admin Workflow

1. Log in as admin → navigate to `/admin/verifications`
2. Queue defaults to **Under Review** status filter
3. Filter by profile type (SHOP/BUSINESS/COMPANY/ORGANIZATION)
4. Search by business name, display name, or email
5. Click a row to open the **detail drawer**

### Detail drawer shows

- User information (name, email, phone, user ID, profile type, account status)
- All business/legal fields
- Additional information text
- Document metadata with a **secure signed URL** (valid 10 minutes) to view/download the document
- Previous rejection reason if applicable
- Current verification status and reviewer info

### Approve

1. Click **Approve Profile**
2. Optionally add a review note
3. Click **Confirm Approval**
4. Profile `verification_status` → `ACTIVE`
5. User receives in-app notification: "Your profile has been approved"
6. Publish button becomes enabled for the user

### Reject

1. Click **Reject Profile**
2. Enter a required rejection reason (explain what needs fixing)
3. Click **Confirm Rejection**
4. Profile `verification_status` → `REJECTED`
5. Profile `is_published` forced to `false`
6. Rejection reason stored in DB and shown to user
7. User receives in-app notification with the reason

### Suspend

1. Available for ACTIVE/VERIFIED profiles
2. Click **Suspend Profile**
3. Optionally enter a reason
4. Click **Confirm Suspension**
5. Profile `verification_status` → `SUSPENDED`
6. Profile `is_published` forced to `false`
7. Profile disappears from public directory immediately

---

## Public/Private Data Rules

### What is publicly visible

- Profile display name, headline, description, avatar, cover
- Location (filtered by `location_precision`: CITY / DISTRICT / FULL)
- Contact information (filtered by `phone_visibility`, `email_visibility`)
- Business hours, social links
- Profile type, category
- `verification_status` (so the public can see if a business is verified)

### What is **never** publicly visible

- Verification documents (storage keys, file contents)
- `rejection_reason`
- `reviewed_by`, `reviewed_at`
- `business_address`, `business_city`, `business_region`, `business_country` (these are internal verification fields, separate from the public `city`/`region`/`country` fields)
- `license_number`, `license_issue_date`, `license_expiry_date`
- `additional_information`
- User `email`, `phone` (unless profile owner sets visibility to PUBLIC)
- Password hashes, JWT tokens, refresh tokens

### Public search gate

`findPublicProfileBySlug()` and `searchProfiles()` enforce:

```sql
WHERE p.is_published = TRUE
  AND (
    (p.profile_type NOT IN ('SHOP','BUSINESS','COMPANY','ORGANIZATION')
     AND p.verification_status != 'SUSPENDED')
    OR
    (p.profile_type IN ('SHOP','BUSINESS','COMPANY','ORGANIZATION')
     AND p.verification_status IN ('ACTIVE','VERIFIED'))
  )
```

---

## Security Rules

All critical rules are enforced **on the backend**. The frontend only gates the UI.

| Rule | Enforcement |
|------|-------------|
| Only authenticated users can create/edit their own profile | `authenticate` middleware + `user_id = req.user.id` |
| Users cannot change their `verification_status` to `ACTIVE` | `setVerificationStatusByUserId()` only allows `UNDER_REVIEW` |
| Users cannot set `is_published = true` before approval | `publishProfile()` calls `canPublish()` before proceeding |
| Only admins can view the verification queue | `requireRole('ADMIN')` on all `/api/admin/*` routes |
| Only admins can approve/reject/suspend profiles | Same admin guard |
| Users cannot approve their own profile | Admin action requires admin JWT — users have `role: USER` |
| Verification documents are private | Documents never returned by `GET /api/profiles/@:slug` or search APIs |
| Document access is via signed URL only | `getVerificationDocSignedUrl()` — 10-minute expiry |
| SQL injection prevention | All queries use parameterised `$1, $2, …` placeholders |
| File type validation | Both MIME type (Multer fileFilter) and extension checked |
| File size limit | 10 MB hard limit in Multer config |
| Path traversal prevention | Supabase Storage SDK handles paths; no user input in storage paths (only UUID-based paths) |
| Rejection reason required | Zod schema on `POST /reject` enforces `reason: z.string().min(1)` |
| Admin cannot self-promote | Existing `promoteToAdmin` checks `userId !== adminId` |

---

## Notification System Integration

The existing `notifications` table (migration 034) is used to notify users of review outcomes.

| Event | Type | Message |
|-------|------|---------|
| Profile approved | `profile_approved` | "Your profile has been reviewed and approved. You can now publish it publicly." |
| Profile rejected | `profile_rejected` | "Your profile verification was not approved. Reason: {reason}" |
| Profile suspended | `profile_suspended` | "Your profile has been suspended. Reason: {reason}" |

Notifications are non-fatal — if the notification insert fails, it does not roll back the approval/rejection action.

---

## Known Limitations

1. **No email notifications on approval/rejection** — only in-app notifications via the existing notifications table. Email notifications would require integration with the existing email service (used for email verification) as a follow-up enhancement.

2. **Single document per profile** — the `verification_documents` table has a UNIQUE constraint on `profile_id`, enforcing one active document. A document history/audit trail (keeping all past documents) is not implemented but can be added by removing the UNIQUE constraint and adding a `is_current` flag.

3. **No admin-initiated re-review** — there is no way for an admin to move a profile from ACTIVE back to UNDER_REVIEW without suspending it first. This is intentional — if a profile needs re-verification, the admin should suspend it and the user resubmits.

4. **Freelancer verification** — the spec marks Freelancer as "conditional verification". Currently Freelancer follows the same path as Personal (no verification required). A flag to opt into verification can be added if needed.

5. **Supabase bucket privacy** — the `verification-docs/{profileId}/…` path in Supabase Storage should ideally be in a separate private bucket (or have a RLS policy) so that the storage URL itself does not grant access. The current implementation relies on signed URLs; if the public bucket policy allows direct URL access, the signed-URL-only approach may be bypassed. Configure Supabase RLS policies accordingly.

6. **No automated document expiry check** — `license_expiry_date` is stored but no background job re-checks expired licenses and automatically suspends profiles. This is a future enhancement.

---

## Testing Checklist

### Manual workflow verification

- [ ] Create user → log in → confirm redirect to `/dashboard/profile` if no profile
- [ ] Select PERSONAL → confirm no verification section shown → save → publish immediately
- [ ] Create second user → select SHOP → confirm verification section appears
- [ ] Fill business info + upload JPG/PNG/PDF → save → submit for review → confirm UNDER_REVIEW
- [ ] Confirm UNDER_REVIEW profile NOT visible at `/p/{slug}` or in directory
- [ ] Log in as admin → open `/admin/verifications` → confirm profile listed
- [ ] Click profile → view all business fields + signed document URL
- [ ] Approve → confirm status ACTIVE + user notification
- [ ] Log in as user → confirm "Publish Profile" button enabled
- [ ] Click Publish → confirm profile visible at `/p/{slug}`
- [ ] Confirm document NOT accessible from public profile URL
- [ ] Reject another profile with reason → confirm user sees reason on dashboard
- [ ] Edit + resubmit → confirm status returns to UNDER_REVIEW
- [ ] Suspend ACTIVE profile → confirm removed from public directory

### Security tests

- [ ] `POST /api/profile/submit-review` as unauthenticated user → 401
- [ ] `PATCH /api/profile` with `{ verification_status: 'ACTIVE' }` → field stripped (passthrough schema)
- [ ] `POST /api/profile/publish` when status is UNDER_REVIEW → 409 PROFILE_UNDER_REVIEW
- [ ] `GET /api/admin/profile-verifications` with USER role JWT → 403 FORBIDDEN
- [ ] `POST /api/admin/profile-verifications/:id/approve` with USER role JWT → 403 FORBIDDEN
- [ ] Upload 11 MB file → 422 DOCUMENT_TOO_LARGE
- [ ] Upload `.exe` file → 422 UNSUPPORTED_DOCUMENT_TYPE
- [ ] `GET /api/profiles/@{slug}` for SHOP with UNDER_REVIEW status → 404 PROFILE_NOT_FOUND
- [ ] `GET /api/profiles/search` with `verified_only=true` → only returns ACTIVE profiles

---

## Running the Migrations

```bash
# From the backend directory
node database/migrate.js
```

Migrations 036 and 037 will be applied in order after all existing migrations (001–035).

Migration 036 uses `ALTER TYPE … ADD VALUE IF NOT EXISTS` wrapped in `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$` blocks — safe to run multiple times.

---

*Document generated: September 2026*
