import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if variables are defined
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// Use the correct variable names
export const supabase = supabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;
