import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
// Make sure to add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mobgjhjeejqxlbcdppxk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_8-Skxe9IMFy7DU0XtcIyJw_NceXAwKX';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseAnonKey.includes('dummy')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

