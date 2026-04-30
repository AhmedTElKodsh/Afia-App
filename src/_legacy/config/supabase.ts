import { createClient } from '@supabase/supabase-js';

// This is a stub for the frontend to satisfy TypeScript and Vite.
// Real Supabase interactions happen in the worker or will be enabled in Epic 4.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);
