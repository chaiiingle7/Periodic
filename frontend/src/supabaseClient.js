import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if variables are defined
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!supabaseConfigured) {
  console.error(
    "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file and restart the dev server."
  );
}

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
