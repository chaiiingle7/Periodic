// src/api.js
// VITE_API_URL should be your Render URL, e.g. https://periodic-s2w9.onrender.com/api
// The code below adds "/api" automatically if it is missing.
const RAW_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
const API_BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch (err) {
    throw new Error(
      "Cannot reach the server. If it was idle it may be waking up (this can take up to a minute). Please try again."
    );
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  return await res.json();
}

function postJSON(path, body) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getJSON(path) {
  return request(path);
}

// Generate timetable: the backend expects the config itself as the body
export const generateTimetableRemote = (config) => postJSON("/generate", config);

export async function findSubstitutesRemote(config, schedule, teacherId, day, period) {
  return postJSON("/substitute", { config, schedule, teacherId, day, period });
}

export const getReminderStatus = () => getJSON("/reminders/status");
export const enableReminders = (config, schedule, leadMinutes = 10) =>
  postJSON("/reminders/enable", { config, schedule, leadMinutes });
export const disableReminders = () => postJSON("/reminders/disable", {});
export const previewReminder = (config, schedule, leadMinutes = 10) =>
  postJSON("/reminders/preview", { config, schedule, leadMinutes });
export const sendTestReminder = (config, schedule, to, leadMinutes = 10) =>
  postJSON("/reminders/test", { config, schedule, to, leadMinutes });
