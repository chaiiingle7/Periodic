// Thin wrapper around the Supabase table used to save/load timetables.
// Every function here degrades gracefully (throws a clear error, or returns
// an empty list) when Supabase hasn't been configured yet, rather than
// crashing the app — see supabaseClient.js and the README's Supabase section
// for how to set the two required environment variables.

import { supabase, supabaseConfigured } from "./supabaseClient";

const TABLE = "timetables";

export function isCloudSaveAvailable() {
  return supabaseConfigured;
}

export async function saveTimetable({ name, config, schedule }) {
  if (!supabaseConfigured) {
    throw new Error("Supabase isn't configured yet — see the README's Supabase section.");
  }
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ name, config, schedule: schedule || null }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listTimetables() {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, created_at, schedule")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function loadTimetable(id) {
  if (!supabaseConfigured) {
    throw new Error("Supabase isn't configured yet — see the README's Supabase section.");
  }
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTimetable(id) {
  if (!supabaseConfigured) {
    throw new Error("Supabase isn't configured yet — see the README's Supabase section.");
  }
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
