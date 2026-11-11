import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const DEBUG_KEY = 'debug-mode'

const main = {
  url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  key: import.meta.env.VITE_SUPABASE_KEY as string | undefined,
}
const staging = {
  url: import.meta.env.VITE_STAGING_SUPABASE_URL as string | undefined,
  key: import.meta.env.VITE_STAGING_SUPABASE_KEY as string | undefined,
}

export const hasStaging = Boolean(staging.url && staging.key)

/**
 * Debug mode points the whole app at the staging database: separate
 * accounts and data that are safe to break. It is remembered per browser.
 */
export const isDebugMode = hasStaging && localStorage.getItem(DEBUG_KEY) === 'on'

export function setDebugMode(on: boolean): void {
  if (on) localStorage.setItem(DEBUG_KEY, 'on')
  else localStorage.removeItem(DEBUG_KEY)
  // The client is created once at load, so switching databases needs a reload.
  window.location.reload()
}

const active = isDebugMode ? staging : main

export const isConfigured = Boolean(active.url && active.key)

// The key is a publishable key: it is meant to ship in the browser, and row
// level security decides what each signed-in user can do. Each project keeps
// its own session, so signing in to staging does not sign you out of the real one.
export const supabase = createClient<Database>(
  active.url ?? 'http://localhost',
  active.key ?? 'missing-key',
)
