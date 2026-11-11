import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined

export const isConfigured = Boolean(url && key)

// The key is the project's publishable key: it is meant to ship in the
// browser, and row level security decides what each signed-in user can do.
export const supabase = createClient<Database>(
  url ?? 'http://localhost',
  key ?? 'missing-key',
)
