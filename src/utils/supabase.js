import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Running in local mode.');
}

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseAnonKey !== 'REPLACE_WITH_REAL_ANON_KEY')
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Check if Supabase is available
 */
export function isSupabaseConfigured() {
  return supabase !== null;
}
