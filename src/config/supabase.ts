import { createClient } from '@supabase/supabase-js';

// This is a stub for the frontend to satisfy TypeScript and Vite.
// Real Supabase interactions happen in the worker or will be enabled in Epic 4.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;
