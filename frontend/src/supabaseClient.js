import { createClient } from "@supabase/supabase-js";

// These come from a .env file in frontend/ (see .env.example) — never commit
// real values. The anon key is safe to expose in frontend code by design
// (that's what it's for), but Row Level Security on the table is what
// actually decides who can read/write — see the README's Supabase section.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabaseConfigured = Boolean(url && anonKey);

// Only create a real client when both env vars are present, so the rest of
// the app can check `supabaseConfigured` and show a friendly message instead
// of crashing when Supabase hasn't been set up yet.
export const supabase = supabaseConfigured ? createClient(url, anonKey) : null;
