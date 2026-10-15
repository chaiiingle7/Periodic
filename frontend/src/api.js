// src/api.js
// Base API URL - uses environment variable or defaults to local dev
const API_BASE = import.meta.env.VITE_API_URL || "/api";

// Helper function to post JSON data
async function postJSON(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  return await res.json();
}

// Helper function to get JSON data
async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return await res.json();
}

// Generate timetable function
export const generateTimetableRemote = async (config) => {
  try {
    const response = await fetch(`${API_BASE}/generate-timetable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batchData: config })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to generate timetable' };
    }

    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
};

// Export other functions
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
