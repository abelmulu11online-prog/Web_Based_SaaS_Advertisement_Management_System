# Requirements Document

## Introduction

This document covers the transformation of the existing SaaS application into a **professional directory and self-promotion platform**. The platform enables individuals and organizations (electricians, lawyers, restaurants, photographers, tutors, shops, etc.) to create rich public profiles so that visitors can discover, browse, and contact them directly. It is not a marketplace — no buying, selling, or checkout flow is involved. Revenue comes from tiered subscription plans that gate how much a profile owner can showcase.

The existing codebase already has the correct database schema for profiles, subscriptions, reviews, and content sections. These requirements formalize the product behavior on top of that foundation, and define how the marketplace-style `advertisements` module should be retired in favor of the profile-centric discovery experience.

---

## Glossary

- **Platform**: The web-based professional directory SaaS application.
- **Profile_Owner**: A registered user who has created a profile on the Platform.
- **Visitor**: Any person who browses the Platform, whether authenticated or not.
- **Registered_User**: A Visitor who has created and verified a user account on the Platform.
- **Profile**: The primary public entity on the Platform; represents a person, shop, business, or organization.
- **Directory**: The searchable, filterable index of all published profiles.
- **Subscription_Plan**: A tier (FREE, BASIC, PRO, BUSINESS) that controls the features and content limits available to a Profile_Owner.
- **Feature_Gate**: A rule that restricts a Platform capability to Profile_Owners whose active Subscription_Plan includes that feature.
- **Profile_Section**: A distinct content area within a Profile (services, portfolio, products, achievements, posts, gallery, business hours, social links, reviews).
- **Review**: A 1–5 star rating plus optional written comment submitted by a Registered_User for a Profile.
- **Admin**: A Platform operator with elevated privileges to manage users, profiles, categories, plans, and verification requests.
- **Verification**: A trust signal granted by an Admin after confirming a Profile_Owner's identity or credentials.
- **Completion_Score**: An integer 0–100 cached on each Profile representing how completely the Profile_Owner has filled out the Profile.
- **Advertisement_Module**: The legacy marketplace-style `advertisements` table and related backend/frontend code that must be retired.
- **Slug**: A URL-safe unique identifier used in the public profile URL `/p/{slug}`.
- **Featured_Profile**: A Profile that is visually elevated in Directory search results because the Profile_Owner holds a PRO or BUSINESS plan.
- **ETB**: Ethiopian Birr — the currency used for Subscription_Plan pricing.

---

## Requirements

### Requirement 1: Profile Creation

**User Story:** As a Profile_Owner, I want to create a public profile for myself or my organization, so that people searching for my services can find and contact me.

#### Acceptance Criteria

1. WHEN a Registered_User submits a profile creation request with a valid `display_name` (1–150 characters) and `slug`, THE Platform SHALL create a new Profile in `DRAFT` state (is_published = FALSE) owned by that user.
2. THE Platform SHALL enforce that each Registered_User owns at most one Profile.
3. WHEN a Profile_Owner submits a profile creation request and the user already owns a Profile, THE Platform SHALL return HTTP 409 with a descriptive error message.
4. THE Platform SHALL enforce that `slug` values are unique across all Profiles, contain only lowercase letters, digits, and hyphens, and are between 3 and 100 characters in length.
5. WHEN a Profile_Owner submits a `slug` that is already in use by another Profile, THE Platform SHALL return HTTP 409 with a descriptive error message.
6. THE Platform SHALL accept the following optional fields during profile creation: `headline` (max 300 characters), `profile_type`, `category_id`, `description` (max 5000 characters), `contact_phone`, `contact_email` (must be valid email format), `website_url` (must be a valid URL), `whatsapp`, `telegram_username`, `country`, `region`, `city`, `area`, `address_line`, `latitude` (between -90 and 90), `longitude` (between -180 and 180).
7. WHEN a Profile is created, THE Platform SHALL set `completion_score` to an integer value between 0 and 100 computed by counting how many of the following 10 fields are populated: `display_name`, `headline`, `avatar_url`, `description`, `category_id`, `city`, `contact_phone`, `contact_email`, at least one of `whatsapp` or `telegram_username`, and at least one social link.
8. IF any required field is absent or any optional field fails validation, THEN THE Platform SHALL return HTTP 422 with a field-level error message and SHALL NOT create the Profile.

---

### Requirement 2: Profile Management

**User Story:** As a Profile_Owner, I want to update all sections of my profile at any time, so that my public listing stays accurate and up to date.

#### Acceptance Criteria

1. WHEN a Profile_Owner submits a valid update to Profile identity fields (`display_name` (1–150 characters), `headline` (0–300 characters), `description` (0–5000 characters), `profile_type`, `category_id`), THE Platform SHALL persist the changes and update `updated_at`; IF any submitted identity field exceeds its length bound, THEN THE Platform SHALL return HTTP 422 with a field-level error message.
2. WHEN a Profile_Owner uploads an avatar image, THE Platform SHALL store the image in the configured object storage, set `avatar_url` and `avatar_storage_key` on the Profile, and return the updated Profile; IF the uploaded file exceeds 5 MB or is not of type JPEG, PNG, or WEBP, THE Platform SHALL return HTTP 422.
3. WHEN a Profile_Owner uploads a cover image, THE Platform SHALL store the image in the configured object storage, set `cover_url` and `cover_storage_key` on the Profile, and return the updated Profile; IF the uploaded file exceeds 5 MB or is not of type JPEG, PNG, or WEBP, THE Platform SHALL return HTTP 422.
4. WHEN a Profile_Owner submits location fields (`country`, `region`, `city`, `area`, `address_line`, `latitude`, `longitude`), THE Platform SHALL validate that `latitude` is between -90 and 90 and `longitude` is between -180 and 180, then persist the values.
5. IF a submitted `latitude` or `longitude` value is outside the valid range, THEN THE Platform SHALL return HTTP 422 with a field-level error message identifying the invalid field.
6. WHEN a Profile_Owner sets `location_precision`, THE Platform SHALL accept only the values `CITY`, `DISTRICT`, or `FULL`, and store the selection; this value controls how precisely the location is displayed to Visitors; IF the submitted value is not one of those three, THEN THE Platform SHALL return HTTP 422.
7. WHEN a Profile_Owner updates contact fields (`contact_phone`, `contact_email`, `whatsapp`, `telegram_username`, `website_url`), THE Platform SHALL persist the changes.
8. WHEN a Profile_Owner updates `phone_visibility` or `email_visibility`, THE Platform SHALL accept only the values `PUBLIC`, `LOGGED_IN`, or `HIDDEN`, and store the selection; IF the submitted value is not one of those three, THEN THE Platform SHALL return HTTP 422.
9. WHEN any Profile field is updated, THE Platform SHALL recompute and persist `completion_score` reflecting the current state of the Profile.
10. WHEN an unauthenticated request is made to update a Profile, THE Platform SHALL return HTTP 401; WHEN an authenticated user who is not the Profile_Owner attempts to update a Profile, THE Platform SHALL return HTTP 403.

---

### Requirement 3: Profile Content Sections

**User Story:** As a Profile_Owner, I want to add services, portfolio items, products, achievements, posts, gallery images, business hours, and social links to my profile, so that visitors get a complete picture of what I offer.

#### Acceptance Criteria

1. WHEN a Profile_Owner adds a social link, THE Platform SHALL accept a `platform` value from the set {FACEBOOK, INSTAGRAM, TELEGRAM, WHATSAPP, TIKTOK, LINKEDIN, YOUTUBE, TWITTER, SNAPCHAT, GITHUB, WEBSITE, OTHER} and a non-empty `url` (max 2048 characters), and enforce one entry per platform per Profile; IF the `url` exceeds 2048 characters, THE Platform SHALL return HTTP 422.
2. WHEN a Profile_Owner submits business hours for a day, THE Platform SHALL accept `day_of_week` (0–6), `opens_at`, `closes_at`, and `is_closed`, and enforce one row per weekday per Profile.
3. IF `is_closed` is FALSE and either `opens_at` or `closes_at` is NULL, THEN THE Platform SHALL return HTTP 422 indicating that open hours require both opening and closing times.
4. WHEN a Profile_Owner adds a gallery image, THE Platform SHALL store the image in object storage and associate it with the Profile via `profile_images`.
5. WHEN a Profile_Owner adds a service, THE Platform SHALL accept `title` (required, 1–200 characters), optional `description`, optional `price`, optional `price_type`, and optional service images.
6. WHEN a Profile_Owner adds a portfolio item, THE Platform SHALL accept `title` (required, 1–200 characters), optional `description`, optional `client`, optional `project_url`, optional `completion_date`, optional `tags`, and optional portfolio images.
7. WHEN a Profile_Owner adds a product, THE Platform SHALL accept `name` (required, 1–200 characters), optional `description`, optional `price`, and optional product images.
8. WHEN a Profile_Owner adds an achievement, THE Platform SHALL accept `title` (required, 1–200 characters), optional `description`, optional `issued_by`, optional `issue_date`, and optional achievement images.
9. WHEN a Profile_Owner adds a post, THE Platform SHALL accept `title` (required) and `content` (required, 1–5000 characters), and optional post images; IF `content` is absent or exceeds 5000 characters, THE Platform SHALL return HTTP 422.
10. IF the Profile_Owner's active Subscription_Plan limit for products has been reached, THEN THE Platform SHALL reject new product additions with HTTP 403 and a message indicating the plan limit.
11. IF the Profile_Owner's active Subscription_Plan limit for profile services has been reached, THEN THE Platform SHALL reject new service additions with HTTP 403 and a message indicating the plan limit.
12. IF the Profile_Owner's active Subscription_Plan limit for portfolio items has been reached, THEN THE Platform SHALL reject new portfolio item additions with HTTP 403 and a message indicating the plan limit.
13. IF the Profile_Owner's active Subscription_Plan limit for posts has been reached, THEN THE Platform SHALL reject new post additions with HTTP 403 and a message indicating the plan limit.
14. IF the Profile_Owner's active Subscription_Plan has reached the `max_images` limit for gallery images, THEN THE Platform SHALL reject new gallery image additions with HTTP 403 and a message indicating the plan limit.

---

### Requirement 4: Profile Publishing & Visibility

**User Story:** As a Profile_Owner, I want to control when my profile goes live, so that I can finish setting it up before it becomes publicly visible.

#### Acceptance Criteria

1. WHEN a Profile_Owner requests to publish a Profile, THE Platform SHALL set `is_published = TRUE` and `updated_at` to the current timestamp.
2. WHEN a Profile_Owner requests to unpublish a Profile, THE Platform SHALL set `is_published = FALSE`; IF the Profile is already unpublished, THE Platform SHALL return HTTP 200 with no state change.
3. WHILE `is_published` is FALSE, THE Platform SHALL return HTTP 404 for any request from a user who is not the Profile_Owner.
4. WHILE `is_published` is FALSE, THE Platform SHALL allow the Profile_Owner to view their own Profile in a preview mode; THE Platform SHALL return identical Profile data as the public endpoint but include a `preview: true` flag in the response.
5. THE Platform SHALL exclude Profiles where `is_published = FALSE` from all Directory search and browse results returned to Visitors.

---

### Requirement 5: Public Directory — Browse & Search

**User Story:** As a Visitor, I want to browse and search the directory by category or location and see a list of matching profiles, so that I can find the right person or business quickly.

#### Acceptance Criteria

1. THE Platform SHALL expose a public directory endpoint that returns published Profiles as paginated results (page size configurable, default 20, maximum 100); IF a page size greater than 100 is requested, THE Platform SHALL use 100.
2. WHEN a Visitor filters the Directory by `category_id`, THE Platform SHALL return only Profiles whose `category_id` matches the requested value.
3. WHEN a Visitor filters the Directory by `city`, THE Platform SHALL return only Profiles whose `city` field matches the requested value (case-insensitive).
4. WHEN a Visitor filters the Directory by `country`, THE Platform SHALL return only Profiles whose `country` field matches the requested value (case-insensitive).
5. WHEN a Visitor submits a keyword search query (1–100 characters), THE Platform SHALL return Profiles whose `display_name`, `headline`, or `description` contains the query string; IF a query shorter than 1 or longer than 100 characters is submitted, THE Platform SHALL return HTTP 422.
6. WHEN a Visitor applies multiple filters simultaneously, THE Platform SHALL combine them with AND logic (intersection, not union).
7. WHEN the Directory is requested without filters, THE Platform SHALL order results so that Featured_Profiles (belonging to PRO or BUSINESS plan holders) appear before non-featured Profiles, and within each group order by `created_at DESC`.
8. WHEN a Visitor requests the Directory, THE Platform SHALL include in each result card: `display_name`, `headline`, `slug`, `avatar_url`, `city`, `country`, `category_id`, `profile_type`, `is_verified`, `is_featured` flag, and the Profile's average rating rounded to one decimal place (or null if no reviews exist) and review count (0 if no reviews exist).
9. THE Platform SHALL allow Visitor requests to the Directory without authentication.

---

### Requirement 6: Profile Detail Page

**User Story:** As a Visitor, I want to view a full public profile, so that I can learn about the person or business and decide whether to contact them.

#### Acceptance Criteria

1. WHEN a Visitor requests `/p/{slug}`, THE Platform SHALL return all published Profile fields including: identity, contact details (subject to visibility rules), business hours, social links, gallery images, services, portfolio items, products, achievements, posts, and reviews; IF the requested slug does not match any published Profile, THE Platform SHALL return HTTP 404.
2. WHEN a Visitor requests a Profile where `phone_visibility = HIDDEN` or `phone_visibility` is NULL, THE Platform SHALL omit `contact_phone` from the response regardless of authentication status.
3. WHEN a Visitor requests a Profile where `phone_visibility = LOGGED_IN` and the Visitor is not authenticated, THE Platform SHALL omit `contact_phone` from the response.
4. WHEN a Visitor requests a Profile where `phone_visibility = PUBLIC`, THE Platform SHALL include `contact_phone` in the response.
5. THE Platform SHALL apply the same visibility rules defined in criteria 2–4 to `contact_email` using the `email_visibility` field; IF `email_visibility` is NULL, THE Platform SHALL treat it as HIDDEN.
6. WHEN a Visitor requests a Profile detail, THE Platform SHALL include the Profile's average star rating (null if no reviews exist) and total review count (0 if no reviews exist).
7. WHEN a Visitor requests a Profile detail, THE Platform SHALL include the most recent 10 reviews ordered by `created_at DESC` with a `total_count` field in the response; further reviews SHALL be paginated with a default page size of 10.
8. WHEN a Visitor requests a Profile detail, THE Platform SHALL include business hours for all 7 days of the week.
9. WHEN a Visitor requests a Profile where `location_precision = CITY`, THE Platform SHALL include `city` and `country` but SHALL NOT include `address_line`, `latitude`, or `longitude`.
10. WHEN a Visitor requests a Profile where `location_precision = DISTRICT`, THE Platform SHALL include `city`, `area`, and `country` but SHALL NOT include `address_line`, `latitude`, or `longitude`.
11. WHEN a Visitor requests a Profile where `location_precision = FULL`, THE Platform SHALL include all location fields including `address_line`, `latitude`, and `longitude`.

---

### Requirement 7: Ratings & Reviews

**User Story:** As a Registered_User, I want to leave a star rating and written review on a profile, so that my experience helps other visitors make informed decisions.

#### Acceptance Criteria

1. WHEN a Registered_User submits a review with a valid `rating` (integer 1–5) and optional `comment` (1–2000 characters) for a Profile, THE Platform SHALL persist the review linked to both `profile_id` and `reviewer_user_id`.
2. THE Platform SHALL enforce that a Registered_User may submit at most one review per Profile; WHEN a second review submission is made, THE Platform SHALL return HTTP 409 with a descriptive error.
3. IF the Registered_User submitting a review is the owner of the target Profile, THEN THE Platform SHALL return HTTP 403 with an error message indicating that Profile_Owners cannot review their own Profile.
4. IF the Visitor requesting review submission is not authenticated, THEN THE Platform SHALL return HTTP 401.
5. WHEN a Registered_User who has already submitted a review submits an update, THE Platform SHALL replace the existing review's `rating` and, if `comment` is provided, replace `comment`; IF `comment` is omitted from the update request, THE Platform SHALL retain the existing comment value; THE Platform SHALL update `updated_at`.
6. WHEN a Registered_User requests to delete their own review, THE Platform SHALL permanently remove the review record and return HTTP 200 with an empty body.
7. THE Platform SHALL allow any Visitor (authenticated or not) to read reviews for a Profile without restriction.
8. IF `rating` is absent or outside the range 1–5, THEN THE Platform SHALL return HTTP 422 with a field-level error message.
9. IF a submitted `comment` exceeds 2000 characters, THEN THE Platform SHALL return HTTP 422 with a field-level error message.
10. WHEN a review is created, updated, or deleted, THE Platform SHALL recompute `avg_rating` (rounded to 2 decimal places) and `review_count`, persist both values on the Profile row, and use the stored values in API responses.

---

### Requirement 8: Subscription Plans & Feature Gating

**User Story:** As a Profile_Owner, I want to choose a subscription plan that matches my needs, so that I can unlock the features I require to present my profile effectively.

#### Acceptance Criteria

1. THE Platform SHALL offer four named subscription tiers: FREE (0 ETB/month), BASIC (99 ETB/month), PRO (299 ETB/month), and BUSINESS (799 ETB/month).
2. THE Platform SHALL enforce the following content limits per plan:
   - FREE: 3 gallery images per profile, 3 products, 3 services, 2 portfolio items, 5 posts
   - BASIC: 5 gallery images per profile, 20 products, 10 services, 10 portfolio items, 20 posts
   - PRO: 10 gallery images per profile, 100 products, 50 services, 50 portfolio items, 100 posts
   - BUSINESS: 10 gallery images per profile, 9999 products, 9999 services, 9999 portfolio items, 9999 posts
3. WHERE the Profile_Owner holds a PRO or BUSINESS plan, THE Platform SHALL mark the Profile as `is_featured = TRUE`; the `is_featured: true` flag SHALL be included in the Profile's Directory result card, and Featured_Profiles SHALL be sorted before non-featured Profiles in Directory results.
4. WHERE the Profile_Owner holds a FREE plan, THE Platform SHALL NOT include portfolio items in the public Profile detail response.
5. WHERE the Profile_Owner holds a FREE plan, THE Platform SHALL NOT include achievement items in the public Profile detail response.
6. WHEN a Profile_Owner's subscription expires or is downgraded, THE Platform SHALL NOT delete existing content that exceeds the new plan's limits; THE Platform SHALL hide from public view the oldest-created items beyond the plan limit, keeping them visible only to the Profile_Owner in their dashboard with a "hidden — upgrade to show" indicator, until the Profile_Owner either upgrades or removes the excess content.
7. WHEN a Visitor requests the Pricing page, THE Platform SHALL return all active Subscription_Plan records including `display_name`, `price_etb`, and the feature limits defined in criterion 2.
8. THE Platform SHALL integrate with the existing payment infrastructure for plan upgrades and renewals; no new payment gateway integration is required.
9. WHEN a new user account is created AND email is verified, THE Platform SHALL automatically assign the FREE plan without requiring a payment step.

---

### Requirement 9: Advertiser Dashboard

**User Story:** As a Profile_Owner, I want a private dashboard to manage my profile, view how many people are looking at it, and manage my subscription, so that I can grow my visibility on the platform.

#### Acceptance Criteria

1. THE Platform SHALL provide a dashboard accessible only to authenticated Registered_Users that displays a summary of the Profile_Owner's Profile (completion score, published status, active plan, and per-content-type counts showing used vs. available limits, e.g., "3/5 gallery images, 2/3 services used").
2. WHEN a Profile_Owner accesses the dashboard, THE Platform SHALL display the number of profile views recorded in the analytics module for the preceding 30 calendar days from the current date.
3. WHEN a Profile_Owner accesses the dashboard, THE Platform SHALL display the count of contact-click events (phone reveal, email reveal, WhatsApp click, Telegram click) recorded in the analytics module for the preceding 30 calendar days from the current date.
4. THE Platform SHALL provide dashboard navigation links to: edit profile, manage content sections (services, portfolio, products, achievements, posts, gallery, business hours, social links), manage subscription, and view reviews received.
5. IF a Profile_Owner has not yet published a Profile, THEN THE Platform SHALL display in the dashboard header area a call-to-action element containing a link to the profile editor and a completion progress bar.

---

### Requirement 10: Admin Panel

**User Story:** As an Admin, I want tools to manage users, profiles, categories, subscription plans, and verification requests, so that I can keep the platform accurate and trustworthy.

#### Acceptance Criteria

1. WHEN an unauthenticated request is made to an admin endpoint, THE Platform SHALL return HTTP 401; WHEN an authenticated non-admin user requests an admin endpoint, THE Platform SHALL return HTTP 403.
2. THE Platform SHALL provide an admin endpoint to list all users with pagination (maximum 100 records per page) and filtering by `email`, `role`, and `created_at` range.
3. THE Platform SHALL provide an admin endpoint to list all Profiles with pagination (maximum 100 records per page) and filtering by `is_published`, `is_verified`, `verification_status`, `category_id`, and `city`.
4. WHEN an Admin sets `is_verified = TRUE` on a Profile, THE Platform SHALL set `verification_status = VERIFIED` and dispatch the notification to the Profile_Owner within 60 seconds of the admin action.
5. WHEN an Admin sets `verification_status = REJECTED` on a Profile, THE Platform SHALL set `is_verified = FALSE` and dispatch the notification to the Profile_Owner within 60 seconds of the admin action.
6a. THE Platform SHALL provide an admin endpoint to create and update subscription plan tiers.
6b. WHEN an Admin deactivates a subscription plan tier (`is_active = FALSE`), THE Platform SHALL prevent new subscriptions to that plan while keeping existing subscribers active until their current term expires.
7. THE Platform SHALL provide an admin endpoint to update category records (name, parent, sort order) and create new categories.
8. WHEN an Admin deletes or deactivates a user account, THE Platform SHALL unpublish all Profiles owned by that user (`is_published = FALSE`).

---

### Requirement 11: Retirement of the Advertisements Module

**User Story:** As a developer on the team, I want the legacy marketplace-style advertisements module removed from the codebase, so that the product consistently represents the directory concept and we avoid maintaining dead code.

#### Acceptance Criteria

1. THE Platform SHALL remove all frontend routes, pages, and components that reference the advertisements module (AdsListPage, AdDetailPage, AdsMapPage, CreateAdPage, EditAdPage, MyAdsPage).
2. THE Platform SHALL remove or disable all backend API routes under `/api/advertisements` (or equivalent) only after the migration utility from criterion 4 has been confirmed complete and the 30-day data retention period defined in criterion 3 has elapsed.
3. THE Platform SHALL preserve the `advertisements` database table and its data for a minimum of 30 days after the migration utility confirms completion; only then may a drop migration be applied.
4. WHEN existing advertiser accounts have `advertisements` records, THE Platform SHALL provide a one-time data migration utility that creates or enriches the corresponding `profiles` records with equivalent content where mappable (e.g., `title` → `headline`, `description` → `description`, contact fields, location fields).
5. WHEN migration completion has been confirmed, THE Platform SHALL ensure no navigation links, API documentation, or UI text refers to "advertisements" in the directory context; all user-facing copy SHALL use "profile" or "listing" as appropriate.

---

### Requirement 12: Profile URL & SEO

**User Story:** As a Profile_Owner, I want my profile to have a clean, memorable public URL, so that I can share it directly with potential clients.

#### Acceptance Criteria

1. THE Platform SHALL serve each published Profile at the URL path `/p/{slug}`; IF the Profile is unpublished, THE Platform SHALL return HTTP 404 even if the slug exists.
2. WHEN a Visitor requests a slug that does not match any Profile, THE Platform SHALL return HTTP 404.
3. WHEN a Profile_Owner changes the `slug`, THE Platform SHALL respond to the old slug with HTTP 301 redirecting to the new slug URL for a minimum of 90 days; the 90-day clock starts from the moment the Profile_Owner saves the new slug.
4. THE Platform SHALL include standard HTML meta tags on the server-rendered or hydrated profile page using Profile fields with the following mapping: `title` → `{display_name} — {headline}`, `description` → the first 160 characters of `description`, `og:title` → `{display_name} — {headline}`, `og:description` → the first 160 characters of `description`, `og:image` → `avatar_url` if set, otherwise `cover_url`.
5. THE Platform SHALL expose a machine-readable sitemap entry for each published Profile to facilitate search engine indexing, and SHALL update the sitemap within 60 minutes of a Profile being published or unpublished.

