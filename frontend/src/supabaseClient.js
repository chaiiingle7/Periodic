import { createClient } from "@supabase/supabase-js";

// These come from a .env file in frontend/ (see .env.example) — never commit
// real values. The anon key is safe to expose in frontend code by design
// (that's what it's for), but Row Level Security on the table is what
// actually decides who can read/write — see the README's Supabase section.
const url = import.meta.env.https://ewmxubtkavtdoedtrkca.supabase.co/rest/v1/;
const anonKey = import.meta.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3bXh1YnRrYXZ0ZG9lZHRya2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0Njk0MDAsImV4cCI6MjEwNzA0NTQwMH0.RUyrtsNCltNvFLE1tJIByTm0KJk7oIetwccIXrrAbpE;

export const supabaseConfigured = Boolean(url && anonKey);

// Only create a real client when both env vars are present, so the rest of
// the app can check `supabaseConfigured` and show a friendly message instead
// of crashing when Supabase hasn't been set up yet.
export const supabase = supabaseConfigured ? createClient(url, anonKey) : null;
