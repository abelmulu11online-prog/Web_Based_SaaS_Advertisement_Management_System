/**
 * locations.repository.js — SQL queries for location/GPS data.
 *
 * Uses plain PostgreSQL NUMERIC latitude/longitude (WGS-84).
 * No PostGIS required. Distance via Haversine formula in SQL.
 */
import pool from '../../db/index.js'

/**
 * Find published advertisements within a radius of a point.
 * Uses the Haversine formula implemented in pure SQL.
 *
 * Distance formula:
 *   d = 2 * R * asin(sqrt(
 *         sin²((lat2-lat1)/2) +
 *         cos(lat1)*cos(lat2)*sin²((lng2-lng1)/2)
 *       ))
 * where R = 6371 km (Earth radius)
 *
 * @param {number} lat       - Centre latitude  (degrees)
 * @param {number} lng       - Centre longitude (degrees)
 * @param {number} radiusKm  - Search radius    (kilometres)
 * @param {number} [limit]   - Max rows to return (default 100)
 * @returns {Promise<Array<{id,title,latitude,longitude,address,price,price_type,primary_image_url,distance_km}>>}
 */
export async function findNearby(lat, lng, radiusKm, limit = 100) {
  const result = await pool.query(
    `SELECT
       a.id,
       a.title,
       a.latitude,
       a.longitude,
       a.address,
       a.price,
       a.price_type,
       a.status,
       a.published_at,
       (SELECT ai.image_url
          FROM advertisement_images ai
         WHERE ai.advertisement_id = a.id
           AND ai.is_primary = true
         LIMIT 1) AS primary_image_url,
       (6371 * 2 * asin(sqrt(
          power(sin((radians($1) - radians(a.latitude))  / 2), 2) +
          cos(radians($1)) * cos(radians(a.latitude)) *
          power(sin((radians($2) - radians(a.longitude)) / 2), 2)
       ))) AS distance_km
     FROM advertisements a
     WHERE a.status = 'PUBLISHED'
       AND a.latitude  IS NOT NULL
       AND a.longitude IS NOT NULL
       AND (6371 * 2 * asin(sqrt(
             power(sin((radians($1) - radians(a.latitude))  / 2), 2) +
             cos(radians($1)) * cos(radians(a.latitude)) *
             power(sin((radians($2) - radians(a.longitude)) / 2), 2)
           ))) <= $3
     ORDER BY distance_km ASC
     LIMIT $4`,
    [lat, lng, radiusKm, limit],
  )
  return result.rows
}

/**
 * Return all published advertisements that have coordinates —
 * used for the full map view (no radius filter).
 * Returns minimal fields to keep the payload small.
 *
 * @param {number} [limit] - Safety cap (default 500)
 * @returns {Promise<Array>}
 */
export async function findAllWithCoords(limit = 500) {
  const result = await pool.query(
    `SELECT
       a.id,
       a.title,
       a.latitude,
       a.longitude,
       a.address,
       a.price,
       a.price_type,
       a.published_at,
       (SELECT ai.image_url
          FROM advertisement_images ai
         WHERE ai.advertisement_id = a.id
           AND ai.is_primary = true
         LIMIT 1) AS primary_image_url
     FROM advertisements a
     WHERE a.status = 'PUBLISHED'
       AND a.latitude  IS NOT NULL
       AND a.longitude IS NOT NULL
     ORDER BY a.published_at DESC
     LIMIT $1`,
    [limit],
  )
  return result.rows
}
