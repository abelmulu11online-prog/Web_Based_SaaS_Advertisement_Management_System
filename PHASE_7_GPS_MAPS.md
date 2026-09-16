# Phase 7 — GPS + Maps

## Overview

Phase 7 adds full map and location capabilities to the advertisement platform using **free, open-source tools only**. No Google Maps, no paid API keys, no credit card required.

---

## Map Technology Stack

| Concern | Technology | Version | Cost |
|---|---|---|---|
| Map rendering | [Leaflet](https://leafletjs.com/) | 1.9.4 | Free, BSD licence |
| React integration | [React Leaflet](https://react-leaflet.js.org/) | 5.0.0 | Free, MIT licence |
| Map tiles | [OpenStreetMap](https://www.openstreetmap.org/) | — | Free, ODbL licence |
| Forward geocoding | [Nominatim](https://nominatim.openstreetmap.org/) | — | Free (usage limits apply) |
| Reverse geocoding | Nominatim | — | Free (usage limits apply) |
| Distance calculation | PostgreSQL Haversine SQL | — | No PostGIS required |
| GPS / device location | Browser Geolocation API | — | Built-in, no key needed |

---

## 1. OpenStreetMap & Nominatim

### Tile URL

```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

Attribution is included on every map:
```
© OpenStreetMap contributors
```

### Nominatim Usage Policy

The app respects the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/):

- All geocoding requests are **proxied through the backend** (`/api/locations/geocode`, `/api/locations/reverse`) — not called directly from the browser.
- The backend sets a descriptive `User-Agent` header on every Nominatim request.
- The `LocationSearch` component **debounces** user input by 500 ms before making any request.
- Results are not cached server-side in the MVP, but the architecture isolates the geocoding provider in `backend/src/modules/locations/locations.service.js` so a cache layer can be added without touching the rest of the code.
- To replace Nominatim with a different geocoding provider (e.g. Geoapify free tier, Photon), only `locations.service.js` needs to be updated.

---

## 2. Leaflet Setup (Vite Icon Fix)

Leaflet 1.x resolves marker icon images relative to the JS file at build time. Vite hashes asset paths, which breaks this. The fix lives in:

```
frontend/src/features/locations/components/LeafletInit.js
```

It removes Leaflet's built-in `_getIconUrl` and replaces it with explicit Vite imports:

```js
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon   from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })
```

Every map component imports `./LeafletInit.js` before rendering any map.

---

## 3. Geolocation API

### Behaviour

- The browser Geolocation API is used **one-shot only** — `getCurrentPosition`, never `watchPosition`.
- Location permission is only requested when the user **explicitly clicks** "Use my location".
- The customer's GPS coordinates are **never stored** in the database.
- Coordinates are only sent to `/api/locations/nearby` as query parameters for a single backend distance query, then discarded.

### Hook

```
frontend/src/features/locations/hooks/useGeolocation.js
```

```js
const { lat, lng, accuracy, loading, error, supported, getLocation, clear } = useGeolocation()
```

| State | Description |
|---|---|
| `lat`, `lng` | Coordinates (null until obtained) |
| `accuracy` | Accuracy in metres |
| `loading` | True while permission/GPS request is in flight |
| `error` | Human-readable error string, null on success |
| `supported` | False if browser lacks Geolocation API |
| `getLocation()` | Triggers the one-shot GPS request |
| `clear()` | Resets all state |

### Error handling

| Error code | Message shown to user |
|---|---|
| `PERMISSION_DENIED` | "Location permission was denied. Please allow it in your browser settings…" |
| `POSITION_UNAVAILABLE` | "Your location is currently unavailable. Please try again or enter it manually." |
| `TIMEOUT` | "Location request timed out. Please try again or enter your location manually." |

---

## 4. Location Database Fields

These columns already existed on the `advertisements` table (migration `014_create_advertisements.sql`). **No new migration was required for Phase 7.**

```sql
latitude   NUMERIC(10, 7)  -- WGS-84, CHECK -90 to 90,   nullable
longitude  NUMERIC(10, 7)  -- WGS-84, CHECK -180 to 180, nullable
address    TEXT            -- human-readable description,  nullable
```

An index for geo lookups was also already in place:

```sql
CREATE INDEX IF NOT EXISTS idx_ads_lat_lng
  ON advertisements (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

---

## 5. Radius Search & Distance Calculation

### Approach — Haversine formula in pure SQL

PostGIS is **not required**. Distance is computed inside the PostgreSQL query using the Haversine formula expressed in standard SQL math functions:

```sql
(6371 * 2 * asin(sqrt(
  power(sin((radians($lat) - radians(a.latitude))  / 2), 2) +
  cos(radians($lat)) * cos(radians(a.latitude)) *
  power(sin((radians($lng) - radians(a.longitude)) / 2), 2)
))) AS distance_km
```

Where `6371` is the Earth's mean radius in kilometres (WGS-84 approximation).

This expression appears in two places:

1. `backend/src/modules/advertisements/advertisements.repository.js` — `findPublished()` geo-radius branch (adds `WHERE distance_km <= $radius_km` and `ORDER BY distance_km ASC`).
2. `backend/src/modules/locations/locations.repository.js` — `findNearby()` for the dedicated `/api/locations/nearby` endpoint.

### Accuracy

The Haversine formula assumes a spherical Earth and is accurate to within ~0.5% for distances under 1000 km — more than sufficient for local advertisement discovery.

### Upgrading to PostGIS

If PostGIS is installed later, the Haversine expressions can be replaced with `ST_DWithin` and `ST_Distance` without any API or schema changes:

```sql
-- PostGIS equivalent (drop-in replacement, same semantics)
WHERE ST_DWithin(
  ST_MakePoint(longitude, latitude)::geography,
  ST_MakePoint($lng, $lat)::geography,
  $radius_km * 1000   -- metres
)
```

---

## 6. Backend API

All routes are mounted at `/api/` in `app.js`.

### Advertisement location endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ads` | None | List/search ads — now accepts `lat`, `lng`, `radius_km` query params |
| `GET` | `/api/ads/map` | None | All published ads with coordinates (map pin payload) |
| `POST` | `/api/ads` | JWT | Create ad — `latitude`, `longitude`, `address` accepted |
| `PATCH` | `/api/ads/:id` | JWT (owner) | Update ad — `latitude`, `longitude`, `address` accepted |

### Location service endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/locations/geocode?q=...&limit=5` | None | Forward geocode via Nominatim |
| `GET` | `/api/locations/reverse?lat=...&lng=...` | None | Reverse geocode via Nominatim |
| `GET` | `/api/locations/nearby?lat=...&lng=...&radius_km=10` | None | Ads within radius (Haversine) |
| `GET` | `/api/locations/map-pins` | None | Alias for `/api/ads/map` via locations module |

### Geo query params on `GET /api/ads`

| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `lat` | number | When using radius | — | -90 to 90 |
| `lng` | number | When using radius | — | -180 to 180 |
| `radius_km` | number | When using radius | — | 1–500 km |

When `lat`, `lng`, and `radius_km` are all provided:
- Results are filtered to ads within the radius.
- Results include a `distance_km` field.
- Results are sorted by `distance_km` ascending.
- All other filters (`search`, `category_id`, `min_price`, `max_price`) still apply.

### Map pin response shape

```json
{
  "id": "uuid",
  "title": "string",
  "latitude": 9.0054,
  "longitude": 38.7636,
  "address": "Bole, Addis Ababa",
  "price": 500,
  "price_type": "FIXED",
  "published_at": "ISO datetime",
  "primary_image_url": "https://..."
}
```

Contact info (`contact_phone`, `contact_email`) is intentionally omitted from map pin responses.

---

## 7. Frontend Architecture

### File tree

```
frontend/src/
├── features/
│   ├── locations/
│   │   ├── components/
│   │   │   ├── LeafletInit.js          # Vite icon path fix
│   │   │   ├── MapView.jsx             # Base Leaflet map wrapper
│   │   │   ├── LocationPicker.jsx      # Interactive advertiser location picker
│   │   │   ├── LocationSearch.jsx      # Nominatim address search + dropdown
│   │   │   ├── UserLocationButton.jsx  # GPS "Use my location" button
│   │   │   ├── AdvertisementMap.jsx    # Single-ad detail map
│   │   │   ├── MapListingsView.jsx     # All-ads map with markers + radius circle
│   │   │   ├── MapMarkerPopup.jsx      # Popup shown on marker click
│   │   │   └── RadiusSelector.jsx      # 5/10/25/50/100 km radius buttons
│   │   ├── hooks/
│   │   │   ├── useGeolocation.js       # One-shot GPS hook
│   │   │   └── useMapPins.js           # React Query hook for map pins
│   │   └── services/
│   │       └── locationsService.js     # API wrapper (geocode, nearby, map pins)
│   └── advertisements/
│       └── components/
│           └── LocationDisplay.jsx     # Upgraded: real Leaflet map (was placeholder)
├── pages/
│   ├── AdsMapPage.jsx                  # /ads/map — full-page map view (NEW)
│   ├── AdsListPage.jsx                 # Updated: radius filter + Map view link
│   ├── AdDetailPage.jsx                # Updated: shows LocationDisplay with real map
│   ├── CreateAdPage.jsx                # Updated: Step 3 uses LocationPicker
│   └── EditAdPage.jsx                  # Updated: location section uses LocationPicker
└── routes/
    └── AppRoutes.jsx                   # Updated: /ads/map route added
```

### Component summary

**`LocationPicker`** — Used by advertisers when creating/editing an ad:
- Map click → place/move marker + reverse geocode to address
- Address search (Nominatim, 500 ms debounce) → fly map + set marker
- GPS button → one-shot location + reverse geocode
- Draggable marker → update coordinates + reverse geocode
- Calls `onChange({ latitude, longitude, address })` on every change
- Clear button removes the location

**`AdvertisementMap`** — Used on `AdDetailPage`:
- Static read-only map centred on the ad's coordinates
- Single marker with popup showing title and address
- Scroll zoom disabled for inline use

**`MapListingsView`** — Used on `AdsMapPage`:
- Shows all published ads with coordinates as clickable markers
- Optional: radius circle around user's GPS location
- Flies to user location when GPS is obtained
- Pin count badge

**`LocationDisplay`** — Used on `AdDetailPage` (replaces Phase 5 placeholder):
- Renders `AdvertisementMap` when coordinates exist
- Shows address text below the map
- Falls back to address-only or coordinate-only display

---

## 8. Responsive Layout

All maps use CSS height values that work across breakpoints:

| Context | Height | Notes |
|---|---|---|
| `LocationPicker` (Create/Edit) | `280px` / `240px` | Inside dashboard form |
| `LocationDisplay` (Ad detail) | `220px` | Right-column card |
| `AdsMapPage` | `calc(100vh - 115px)` | Full viewport below toolbar |

Maps are touch-enabled (Leaflet handles pinch-zoom natively on mobile).

---

## 9. Security & Privacy

| Rule | Implementation |
|---|---|
| Customer GPS never stored | `useGeolocation` holds coords in React state only; no API call stores them |
| Customer GPS only after explicit consent | `getLocation()` only called on button click, never automatically |
| No continuous tracking | `getCurrentPosition` used, never `watchPosition` |
| Map pins don't expose contact info | `/api/ads/map` and `findPublishedWithCoords()` intentionally exclude `contact_phone` and `contact_email` |
| Only PUBLISHED ads on public map | Both `findPublishedWithCoords()` and `findNearby()` filter `WHERE status = 'PUBLISHED'` |
| Coordinate validation | Zod schema: lat -90..90, lng -180..180 (both backend and frontend) |
| Advertiser coordinates public | Intentional — advertisers provide location as part of the listing |

---

## 10. Free-Service Limitations

### OpenStreetMap Tiles

- Rate limit: fair use, no hard limit for typical traffic
- Avoid bulk/automated tile requests
- For high-traffic production: consider self-hosting tiles or using a tile CDN (Stadia Maps free tier, etc.)

### Nominatim Geocoding

- **1 request per second maximum**
- No bulk geocoding
- The app enforces this via 500 ms debounce on the search input
- For high-traffic production: consider running a local Nominatim instance, or switch to Geoapify/Photon (also free tiers available)
- To switch providers: only edit `backend/src/modules/locations/locations.service.js` — no other files need changing

---

## 11. Running the Feature

### Prerequisites

No additional infrastructure required. The existing PostgreSQL database and Node.js/React setup are sufficient.

### Install frontend dependencies (already done)

```bash
cd frontend
npm install leaflet@1.9.4 react-leaflet@5.0.0
```

### Run backend

```bash
cd backend
npm run dev
```

### Run frontend

```bash
cd frontend
npm run dev
```

### Run Phase 7 tests

```bash
cd backend
node --test --test-concurrency=1 tests/locations.test.js
```

Expected: **24/24 pass**

### Build frontend

```bash
cd frontend
npm run build
```

Expected: clean build, 0 errors

---

## 12. Test Coverage

`backend/tests/locations.test.js` — 24 tests:

| # | Category | Description |
|---|---|---|
| 1 | Validation | Valid lat/lng accepted (201) |
| 2 | Validation | lat > 90 rejected (422) |
| 3 | Validation | lat < -90 rejected (422) |
| 4 | Validation | lng > 180 rejected (422) |
| 5 | Validation | lng < -180 rejected (422) |
| 6 | Validation | Non-numeric coord rejected (422) |
| 7 | Save | Ad with coords created successfully |
| 8 | Save | Coords returned as numbers in response |
| 9 | Update | Coords updated via PATCH |
| 10 | Save | Address field saved and returned |
| 11 | Map pins | GET /api/ads/map returns 200 (no auth) |
| 12 | Map pins | Only PUBLISHED+coords in map pins |
| 13 | Map pins | Required fields present (id, title, lat, lng) |
| 14 | Map pins | DRAFT ad absent from map pins |
| 15 | Radius | Ad inside radius included in results |
| 16 | Radius | Ad outside radius excluded from results |
| 17 | Radius | Results include `distance_km` field |
| 18 | Radius | Results sorted by `distance_km` ascending |
| 19 | Endpoints | GET /api/locations/nearby returns 200 |
| 20 | Endpoints | Missing `lat` param returns error (400) |
| 21 | Endpoints | GET /api/locations/map-pins returns 200 |
| 22 | Security | Map pins exclude contact_phone/email |
| 23 | Security | DRAFT ad coords not in public map pins |
| 24 | Security | /nearby publicly accessible (no auth) |

---

## 13. Configuration

No new environment variables are required. All map/GPS functionality works out of the box with the existing `.env` setup.

To customise the Nominatim User-Agent string (required by usage policy — use your own app name and contact email):

```js
// backend/src/modules/locations/locations.service.js
const USER_AGENT = 'YourAppName/1.0 (your-app-url; contact@yourapp.com)'
```
