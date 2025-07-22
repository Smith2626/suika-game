import { createClient } from '@supabase/supabase-js'

// This code now reads the variables from the environment.
// When you run 'npm run dev', it reads them from a local file.
// When Vercel builds, it reads them from the settings we just configured.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);