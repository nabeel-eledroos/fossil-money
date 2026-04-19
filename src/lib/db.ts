import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client for build time - will fail at runtime if env vars not set
    console.warn('Supabase URL or key not set - using placeholder client')
  }
  return createClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
  )
}

export const supabase = getSupabaseClient()

export const getServiceClient = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''
  return createClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseServiceKey || 'placeholder-key'
  )
}
