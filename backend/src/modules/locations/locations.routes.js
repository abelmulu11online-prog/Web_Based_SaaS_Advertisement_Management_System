/**
 * locations.routes.js — Location / GPS / Geocoding routes.
 *
 * All routes are mounted at /api/locations in app.js.
 *
 * GET /api/locations/geocode        — address → coordinates   (Nominatim proxy)
 * GET /api/locations/reverse        — coordinates → address   (Nominatim proxy)
 * GET /api/locations/nearby         — ads within radius of lat/lng
 * GET /api/locations/map-pins       — all published ads with coordinates (map view)
 */
import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { geocodeQuerySchema, reverseGeocodeQuerySchema } from './locations.schemas.js'
import * as locationsController from './locations.controller.js'

const router = Router()

// ── Geocoding (no auth — proxied Nominatim calls) ─────────────────────────────

/**
 * @swagger
 * /api/locations/geocode:
 *   get:
 *     summary: Forward geocode an address
 *     description: Converts an address string to latitude/longitude coordinates using OpenStreetMap Nominatim. No API key required.
 *     tags:
 *       - Locations
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Address or place name to search
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *           maximum: 10
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Geocoding results
 */
router.get('/geocode', validate(geocodeQuerySchema), locationsController.geocode)

/**
 * @swagger
 * /api/locations/reverse:
 *   get:
 *     summary: Reverse geocode coordinates
 *     description: Converts latitude/longitude coordinates to a human-readable address using OpenStreetMap Nominatim.
 *     tags:
 *       - Locations
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Reverse geocoding result
 */
router.get('/reverse', validate(reverseGeocodeQuerySchema), locationsController.reverseGeocode)

// ── Map data (no auth — public advertisements only) ───────────────────────────

/**
 * @swagger
 * /api/locations/nearby:
 *   get:
 *     summary: Find advertisements near a location
 *     description: Returns published advertisements within a radius of the given coordinates. Uses Haversine distance formula (no PostGIS required). Customer coordinates are never stored.
 *     tags:
 *       - Locations
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius_km
 *         schema:
 *           type: number
 *           default: 10
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Nearby advertisements
 */
router.get('/nearby', locationsController.nearby)

/**
 * @swagger
 * /api/locations/map-pins:
 *   get:
 *     summary: Get all published advertisement map markers
 *     description: Returns minimal data (id, title, lat, lng, price, image) for all published advertisements with coordinates. Used to populate the map view.
 *     tags:
 *       - Locations
 *     responses:
 *       200:
 *         description: Map pins retrieved
 */
router.get('/map-pins', locationsController.mapPins)

export default router
