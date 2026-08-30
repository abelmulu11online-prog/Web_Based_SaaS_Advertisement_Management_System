/**
 * utils/supabase.js — Supabase client singleton (server-side only).
 *
 * Uses the service role key so it has full Storage access.
 * NEVER import this file in frontend code — the service role key must
 * remain server-side at all times.
 *
 * Returns null (and logs a warning) when Supabase env vars are not set,
 * so the rest of the app can start in environments that don't use storage.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/index.js'
import logger from './logger.js'

let _supabase = null

/**
 * Get (or lazily create) the Supabase admin client.
 * Returns null if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not configured.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
export function getSupabaseClient() {
  if (_supabase) return _supabase

  const { url, serviceRoleKey } = config.supabase

  if (!url || !serviceRoleKey) {
    logger.warn(
      'Supabase is not configured (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing). ' +
      'Image upload/delete features will be unavailable.',
    )
    return null
  }

  _supabase = createClient(url, serviceRoleKey, {
    auth: {
      // Service role key — disable auto session management
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  logger.info({ bucket: config.supabase.storageBucket }, 'Supabase client initialised')
  return _supabase
}
