# Agent Handoff — Professional Directory Platform

**Project:** Web-Based SaaS Professional Directory (self-promotion platform)  
**Stack:** React 18 + Vite (frontend) · Node.js + Express (backend) · PostgreSQL · Supabase Storage  
**Root:** `d:\finall\Web_Based_SaaS_Advertisement_Management_System`

---

## 1. What This Project IS

A **people & businesses directory**. Anyone can create a public profile to advertise themselves — electricians, plumbers, lawyers, software developers, photographers, shop owners, restaurants, tutors, etc. Visitors search by name, job/category, or location and get the profile of that person or business, see their contact details, social media links, working hours, reviews, portfolio, and get in touch directly.

**This is NOT a marketplace.** No products are sold. No checkout. No buyer/seller flow. The profile itself is the product.

---

## 2. Current State of the Codebase

### What is CORRECTLY built (keep as-is)

#### Backend — fully implemented
- **Auth module** (`/backend/src/modules/auth/`) — register, login, email verification, password reset, JWT refresh. ✅
- **Profiles module** (`/backend/src/modules/profiles/`) — the heart of the app. Full CRUD for:
  - Profile creation, update, publish/unpublish
  - Avatar and cover image upload (Supabase Storage)
  - Products, Services, Portfolio items, Posts, Achievements (each with images)
  - Business hours (per-day open/close times)
  - Social links (Facebook, Instagram, TikTok, WhatsApp, Telegram, LinkedIn, YouTube, Twitter, etc.)
  - Public discovery via `GET /api/profiles/search`
  - Public profile page via `GET /api/profiles/@:slug`
  - Subscription limit enforcement (checks plan before creating content)
  - Profile completion score calculation
- **Subscriptions module** (`/backend/src/modules/subscriptions/`) — Chapa payment integration, plan management. ✅
- **Categories module** (`/backend/src/modules/categories/`) — category tree. ✅
- **Analytics module** (`/backend/src/modules/analytics/`) — profile views, contact clicks. ✅
- **Notifications module** (`/backend/src/modules/notifications/`). ✅
- **Admin module** (`/backend/src/modules/admin/`). ✅
- **Locations module** (`/backend/src/modules/locations/`). ✅
- **Full database schema** (`/backend/database/migrations/`) — 33 migrations, covers profiles, reviews, subscriptions, payment records, social links, business hours, content sections. ✅

#### Frontend — partially implemented
- **Profile components** (`/frontend/src/features/profiles/components/`) — all built and correct:
  - `ProfileHeader.jsx` — cover, avatar, name, type badge, verified badge, location, description, social links, contact actions
  - `ContactActions.jsx` — WhatsApp, Phone, Email, Telegram, Website, Google Maps links (fully functional)
  - `SocialLinks.jsx` — clickable social media badges that open in new tab
  - `OpenStatusBadge.jsx` — shows open/closed based on business hours
  - `ProductCard.jsx`, `ServiceCard.jsx`, `PortfolioCard.jsx`, `PostCard.jsx`, `AchievementCard.jsx`
- **Public profile page** (`/frontend/src/pages/PublicProfilePage.jsx`) — tabbed layout showing all sections. ✅
- **Dashboard pages** (`/frontend/src/pages/dashboard/`) — ProfileEditPage, ProductsPage, ServicesPage, PortfolioPage, PostsPage, AchievementsPage. ✅
- **Auth pages** — LoginPage, RegisterPage. ✅
- **Pricing page** — PricingPage. ✅
- **Subscription pages** — SubscriptionPage, SubscriptionSuccessPage, PaymentCallbackPage. ✅
- **Admin pages** — AdminOverviewPage, AdminUsersPage, AdminCategoriesPage, AdminSubscriptionsPage, AdminRevenuePage, AdminAnalyticsPage. ✅

---

### What MUST BE REMOVED (marketplace artifacts)

These files/features belong to the old "marketplace with listings" concept and must be deleted or repurposed:

#### Frontend — DELETE these files
```
/frontend/src/pages/AdsListPage.jsx          ← marketplace browse page
/frontend/src/pages/AdDetailPage.jsx         ← individual ad listing page
/frontend/src/pages/AdsMapPage.jsx           ← map of ad listings
/frontend/src/pages/CreateAdPage.jsx         ← create new ad form
/frontend/src/pages/EditAdPage.jsx           ← edit ad form
/frontend/src/pages/MyAdsPage.jsx            ← "my advertisements" list
/frontend/src/features/advertisements/       ← entire advertisements feature folder
  components/AdCard.jsx
  components/AdvertisementForm.jsx
  components/ListingCard.jsx
  components/ListingGrid.jsx
  components/ImageGallery.jsx
  components/ImageUploader.jsx
  components/LocationDisplay.jsx
  hooks/useAdvertisements.js
  README.md
```

#### Frontend — KEEP but disable route
```
/frontend/src/pages/DashboardPage.jsx        ← keep but rewrite (currently shows "my ads" — should show profile stats)
```

#### Backend — DISABLE (don't delete, just stop mounting)
In `app.js`, comment out the ads router:
```js
// app.use('/api/ads', adsRouter)  ← disable this line
```
The `advertisements` module files can stay but should not be publicly accessible.

#### Routes to REMOVE from AppRoutes.jsx
```
/ads          → AdsListPage
/ads/map      → AdsMapPage
/ads/:id      → AdDetailPage
/dashboard/advertisements       → MyAdsPage
/dashboard/advertisements/new   → CreateAdPage
/dashboard/advertisements/:id/edit → EditAdPage
```

---

## 3. What NEEDS to Be Built / Fixed

### Priority 1 — Core Discovery (most critical)

#### A. HomePage.jsx — Complete rewrite
**Current state:** Hero says "Ethiopia's local marketplace", search goes to `/ads`, category clicks go to `/ads`. Everything points to the dead advertisements system.

**What it should be:**
- Hero: "Find professionals near you" or "Discover skilled people & businesses"
- Search box (keyword + city/location) → navigates to `/directory` (new page)
- Category pills → navigates to `/directory?category_id=...`
- Below hero: show featured/recent **profiles** (not ads) using `GET /api/profiles/search`
- "Browse by category" section → links to `/directory?category_id=...`
- CTA: "Advertise yourself — Create your profile free"
- Remove all references to "marketplace", "listings", "prices", "buy/sell"

**Files to change:**
- `/frontend/src/pages/HomePage.jsx` — full rewrite
- Remove imports of `useAdvertisements`, `ListingGrid` from ads feature
- Import `useProfileSearch` from profiles hooks instead

#### B. DirectoryPage.jsx — NEW FILE (replaces AdsListPage)
**Path:** `/frontend/src/pages/DirectoryPage.jsx`  
**Route:** `/directory`

This is the main browse/search page for finding professionals. It should:
- Left sidebar filters: Category (tree), City/Location text input, Profile Type (PERSONAL/PROFESSIONAL/FREELANCER/SHOP/BUSINESS/COMPANY/ORGANIZATION), "Only verified" toggle
- Main area: grid of ProfileCards (NOT ListingCards)
- Each card shows: avatar, name, headline, type badge, verified badge, location (city), star rating, category
- Search bar at top: keyword search (searches display_name, headline, description)
- Sort: "Featured first" (default), "Newest", "Most reviewed"
- Pagination
- No price filters. No min/max price. No "SOLD" status. No marketplace UI.

**API:** `GET /api/profiles/search?search=&category_id=&city=&page=&page_size=`

#### C. ProfileCard.jsx — NEW FILE (replaces ListingCard)
**Path:** `/frontend/src/features/profiles/components/ProfileCard.jsx`

A card for the directory grid showing a single profile summary:
```
[Avatar]
[Display Name] [Verified badge]
[Headline]
[Category] [Type badge]  
[City, Country]
[★ 4.2 (12 reviews)]
[Featured badge if is_featured]
```
Clicking navigates to `/@{slug}`.

#### D. Reviews — NEW feature (backend route + frontend components)
The `profile_reviews` table already exists in the database with the correct schema (profile_id, reviewer_user_id, rating 1-5, comment, unique per user per profile).

**Backend missing:**
- `GET /api/profiles/@:slug/reviews` — list reviews for a profile (public, paginated)
- `POST /api/profiles/@:slug/reviews` — submit a review (requires auth)
- `PATCH /api/profiles/@:slug/reviews/:reviewId` — update own review (requires auth)
- `DELETE /api/profiles/@:slug/reviews/:reviewId` — delete own review (requires auth)

Add to `/backend/src/modules/profiles/profiles.routes.js` (public and private routers).
Add controller methods to `profiles.controller.js`.
Add service methods to `profiles.service.js`.
Add repository queries to `profiles.repository.js`.

**Frontend missing:**
- `ReviewCard.jsx` — shows a single review: reviewer name, star rating, comment, date
- `ReviewsList.jsx` — paginated list of reviews with overall rating summary (e.g., "4.2 ★ based on 47 reviews")
- `ReviewForm.jsx` — star picker (1-5 clickable stars) + textarea, submit button. Show only if logged in. Show "Login to leave a review" if not.
- Add Reviews tab to `PublicProfilePage.jsx`
- Add `usePublicReviews(slug)`, `useSubmitReview(slug)`, `useDeleteReview(slug)` hooks to `useProfile.js`
- Add review API calls to `/frontend/src/services/profiles.service.js`

**Business rules:**
- Logged-in users only can submit reviews
- One review per user per profile (409 if duplicate)
- Profile owner cannot review their own profile (403)
- Anyone (logged in or not) can read reviews

#### E. DashboardPage.jsx — Rewrite
**Current state:** Shows "my advertisements" table — completely wrong. Should be profile-centric.

**What it should show:**
- Profile completion progress bar (call `GET /api/profile/completion`)
- Quick stats: Profile views (last 30 days), Contact clicks (last 30 days), Reviews received, Current plan
- Profile published/unpublished status with toggle button
- "Complete your profile" checklist (if completion < 100%)
- Quick links to manage sections: Edit Profile, Services, Portfolio, Products, Posts, Achievements
- Subscription info: plan name, days remaining, "Upgrade" link
- Remove all advertisement-related stats and links

**Files:**
- `/frontend/src/pages/DashboardPage.jsx` — rewrite
- Remove `useMyAdvertisements` import
- Import `useMyProfile`, `useProfileCompletion` from profiles hooks

#### F. Navigation/Navbar.jsx — Update links
Remove: "Browse listings", "Post an ad", "/ads" links  
Add: "Find Professionals" → `/directory`, "My Profile" → `/@{slug}` (for logged-in users)

---

### Priority 2 — Profile Enhancements

#### G. Gallery section on PublicProfilePage
The `profile_images` table exists. Add:
- `GET /api/profiles/@:slug/gallery` backend route
- `Gallery` tab in `PublicProfilePage.jsx` showing a photo grid
- Dashboard gallery management page at `/dashboard/profile/gallery`

#### H. Business Hours display on profile
`ProfileAbout.jsx` or a new `BusinessHoursCard.jsx` should display a full Mon-Sun schedule. The data comes from `profile.business_hours` (array of `{day_of_week, opens_at, closes_at, is_closed}`).

Day mapping: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

The `OpenStatusBadge.jsx` already shows open/closed status. Extend the About tab to show the full weekly schedule.

#### I. Social links icons — use real brand colors
`SocialLinks.jsx` currently uses generic icons. Use colored SVG icons or emoji for each platform:
- Facebook → blue `f` icon or `🔵 Facebook`
- Instagram → gradient icon or `📷 Instagram`
- WhatsApp → green icon
- Telegram → blue icon
- TikTok → black icon
- LinkedIn → blue icon

Since lucide-react removed brand icons, use `react-icons` package (`ri` prefix) or inline SVGs.

#### J. Contact info visibility enforcement (frontend)
`ProfileHeader.jsx` and `ContactActions.jsx` currently show contact info unconditionally. The API already enforces visibility (phone/email omitted based on `phone_visibility`/`email_visibility` settings). The frontend just needs to handle null gracefully — already mostly done, just verify no "undefined" is shown.

---

### Priority 3 — Admin & Cleanup

#### K. AdminAdsPage.jsx — Rename/Repurpose
`/frontend/src/pages/admin/AdminAdsPage.jsx` is for managing advertisements. Rename/repurpose it to `AdminProfilesPage.jsx` that lists all profiles with filters (published/unpublished, verified, category) and lets admins publish, verify, or delete profiles.

#### L. Update AppRoutes.jsx
```jsx
// REMOVE these routes:
<Route path="/ads"      element={<AdsListPage />} />
<Route path="/ads/map"  element={<AdsMapPage />} />
<Route path="/ads/:id"  element={<AdDetailPage />} />
<Route path="/dashboard/advertisements"          element={<MyAdsPage />} />
<Route path="/dashboard/advertisements/new"      element={<CreateAdPage />} />
<Route path="/dashboard/advertisements/:id/edit" element={<EditAdPage />} />

// ADD these routes:
<Route path="/directory" element={<DirectoryPage />} />
<Route path="/dashboard/profile/gallery" element={<GalleryPage />} />

// KEEP (already correct):
<Route path="/@:slug" element={<PublicProfilePage />} />
<Route path="/dashboard/profile" element={<ProfileEditPage />} />
<Route path="/dashboard/profile/products" element={<ProductsPage />} />
<Route path="/dashboard/profile/services" element={<ServicesPage />} />
<Route path="/dashboard/profile/portfolio" element={<PortfolioPage />} />
<Route path="/dashboard/profile/posts" element={<PostsPage />} />
<Route path="/dashboard/profile/achievements" element={<AchievementsPage />} />
```

---

## 4. File-by-File Action Plan

| File | Action | Priority |
|------|--------|----------|
| `frontend/src/pages/HomePage.jsx` | Rewrite — profile-based hero + search | P1 |
| `frontend/src/pages/AdsListPage.jsx` | Delete | P1 |
| `frontend/src/pages/AdDetailPage.jsx` | Delete | P1 |
| `frontend/src/pages/AdsMapPage.jsx` | Delete | P1 |
| `frontend/src/pages/CreateAdPage.jsx` | Delete | P1 |
| `frontend/src/pages/EditAdPage.jsx` | Delete | P1 |
| `frontend/src/pages/MyAdsPage.jsx` | Delete | P1 |
| `frontend/src/features/advertisements/` | Delete entire folder | P1 |
| `frontend/src/pages/DirectoryPage.jsx` | Create new | P1 |
| `frontend/src/features/profiles/components/ProfileCard.jsx` | Create new | P1 |
| `frontend/src/pages/DashboardPage.jsx` | Rewrite | P1 |
| `frontend/src/routes/AppRoutes.jsx` | Update routes | P1 |
| `frontend/src/components/layout/Navbar.jsx` | Update links | P1 |
| `backend/src/app.js` | Comment out `/api/ads` route mount | P1 |
| `backend/src/modules/profiles/profiles.routes.js` | Add review routes | P1 |
| `backend/src/modules/profiles/profiles.controller.js` | Add review handlers | P1 |
| `backend/src/modules/profiles/profiles.service.js` | Add review business logic | P1 |
| `backend/src/modules/profiles/profiles.repository.js` | Add review queries | P1 |
| `frontend/src/features/profiles/components/ReviewCard.jsx` | Create new | P1 |
| `frontend/src/features/profiles/components/ReviewsList.jsx` | Create new | P1 |
| `frontend/src/features/profiles/components/ReviewForm.jsx` | Create new | P1 |
| `frontend/src/features/profiles/hooks/useProfile.js` | Add review hooks | P1 |
| `frontend/src/services/profiles.service.js` | Add review API calls | P1 |
| `frontend/src/pages/PublicProfilePage.jsx` | Add Reviews tab | P1 |
| `frontend/src/pages/admin/AdminAdsPage.jsx` | Repurpose to AdminProfilesPage | P2 |
| `frontend/src/features/profiles/components/BusinessHoursCard.jsx` | Create new | P2 |
| `frontend/src/pages/dashboard/GalleryPage.jsx` | Create new | P2 |
| `frontend/src/features/profiles/components/SocialLinks.jsx` | Enhance icons | P2 |

---

## 5. API Reference (already working)

### Public — No auth required
```
GET  /api/profiles/search                    Search profiles (query: search, category_id, city, country, page, page_size)
GET  /api/profiles/@:slug                    Full public profile
GET  /api/profiles/@:slug/products           Public products
GET  /api/profiles/@:slug/services           Public services
GET  /api/profiles/@:slug/portfolio          Public portfolio
GET  /api/profiles/@:slug/posts              Public posts
GET  /api/profiles/@:slug/achievements       Public achievements
GET  /api/profiles/check-slug/:slug          Check slug availability
GET  /api/categories                         Category tree
GET  /api/auth/...                           Login, register, verify email, reset password
```

### Private — Requires `Authorization: Bearer <access_token>` header
```
GET    /api/profile                          Get own profile
POST   /api/profile                          Create profile
PATCH  /api/profile                          Update profile
POST   /api/profile/avatar/upload            Upload avatar (multipart)
DELETE /api/profile/avatar                   Remove avatar
POST   /api/profile/cover/upload             Upload cover (multipart)
DELETE /api/profile/cover                    Remove cover
GET    /api/profile/completion               Completion score + checklist

GET/POST         /api/profile/products
PATCH/DELETE     /api/profile/products/:id
POST             /api/profile/products/:id/images/upload
DELETE           /api/profile/products/:id/images/:imageId

(same pattern for /services, /portfolio, /posts, /achievements)

GET  /api/subscriptions/my                   Own subscription
GET  /api/subscriptions/plans                Available plans
POST /api/subscriptions/checkout             Initiate payment
GET  /api/analytics/profile                  Profile analytics (views, contact clicks)
GET  /api/notifications                      Notifications
```

### Reviews — TO BE BUILT
```
GET    /api/profiles/@:slug/reviews          Public reviews (paginated, no auth needed)
POST   /api/profiles/@:slug/reviews          Submit review (auth required)
PATCH  /api/profiles/@:slug/reviews/:id      Update own review (auth required)
DELETE /api/profiles/@:slug/reviews/:id      Delete own review (auth required)
```

---

## 6. Database Schema (key tables)

```sql
-- profiles (core entity)
profiles: id, user_id, display_name, slug, headline, description, 
          profile_type, category_id, avatar_url, cover_url,
          country, region, city, area, address_line, latitude, longitude,
          location_precision (CITY|DISTRICT|FULL),
          contact_phone, contact_email, whatsapp, telegram_username, website_url,
          phone_visibility (PUBLIC|LOGGED_IN|HIDDEN),
          email_visibility (PUBLIC|LOGGED_IN|HIDDEN),
          is_published, is_verified, verification_status,
          completion_score, created_at, updated_at

-- social_links (per platform per profile)
social_links: id, profile_id, platform (FACEBOOK|INSTAGRAM|TELEGRAM|WHATSAPP|TIKTOK|LINKEDIN|YOUTUBE|TWITTER|SNAPCHAT|GITHUB|WEBSITE|OTHER), url

-- business_hours (per day per profile)
business_hours: id, profile_id, day_of_week (0-6), opens_at, closes_at, is_closed

-- profile_reviews (1 per user per profile)
profile_reviews: id, profile_id, reviewer_user_id, rating (1-5), comment, created_at, updated_at
UNIQUE(profile_id, reviewer_user_id)

-- profile_images (gallery)
profile_images: id, profile_id, image_url, storage_key, sort_order, is_primary

-- profile_products, profile_services_offered, portfolio_items, profile_achievements, profile_posts
-- (each has corresponding _images table)

-- subscription_plans + user_subscriptions + payment_records
```

---

## 7. Environment Variables

Backend `.env` (already configured):
```
DATABASE_URL=postgresql://...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=...
CHAPA_SECRET_KEY=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SENDGRID_API_KEY=...
PORT=5000
```

Frontend `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

---

## 8. What Makes This Great

When complete, the platform should feel like a **local LinkedIn / professional directory** where:

1. Anyone opens the homepage and immediately sees "Find professionals near you"
2. They type "electrician Addis Ababa" or click "Electricians" category
3. They see a grid of profile cards with photos, names, ratings, and locations
4. They click a profile and see: full bio, phone/WhatsApp/Telegram buttons, social links that actually open the right apps, working hours (so they know if the person is open right now), services offered with photos, portfolio of past work, and real customer reviews with star ratings
5. They tap "WhatsApp" and immediately start a chat
6. Meanwhile, the electrician manages their profile from a dashboard — updating services, adding portfolio photos, seeing how many people viewed their profile this week, and managing their subscription plan

The profile IS the product. Every feature should serve "help people find this professional" and "help this professional be found".

---

## 9. Running the Project

```bash
# Backend
cd backend
npm install
npm run dev        # starts on :5000

# Frontend  
cd frontend
npm install
npm run dev        # starts on :5173

# Database migrations (already run — do NOT re-run unless fresh DB)
cd backend
node database/migrate.js
```

---

*This handoff was generated September 2026. The codebase is functional — the backend profiles system and frontend profile pages are production-ready. The primary work remaining is: (1) remove marketplace UI, (2) build the directory browse page, (3) implement reviews, (4) rewrite the homepage and dashboard.*
