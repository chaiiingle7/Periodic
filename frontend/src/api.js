// Talks to the local Python backend (backend/app.py) which runs the actual
// scheduling algorithm (backend/logic.py). Nothing here calls out to the
// internet — both sides of this run on your own machine.
//
// In dev (npm run dev), Vite proxies /api/* to http://127.0.0.1:5000 (see
// vite.config.js), so relative paths work without any extra configuration.
// If you ever need to point at a different host/port, set VITE_API_URL in a
// .env file (e.g. VITE_API_URL=http://127.0.0.1:5000/api).

// Remove that weird import.meta.env line and use this:
const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function postJSON(path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new Error("Failed to fetch");
  }
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    /* non-JSON response */
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request to ${path} failed (${res.status})`);
  }
  return data;
}

// src/api/generateTimetableRemote.js
export const generateTimetableRemote = async (config) => {
  try {
    const response = await fetch('http://localhost:5000/generate-timetable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batchData: config })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to generate timetable' };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return { error: error.message };
  }
};

export async function findSubstitutesRemote(config, schedule, teacherId, day, period) {
  return postJSON("/substitute", { config, schedule, teacherId, day, period });
}

async function getJSON(path) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`);
  } catch (networkErr) {
    throw new Error("Failed to fetch");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request to ${path} failed (${res.status})`);
  return data;
}

// ---- Email reminders (backend/reminders.py) ----
export const getReminderStatus = () => getJSON("/reminders/status");
export const enableReminders = (config, schedule, leadMinutes = 10) => postJSON("/reminders/enable", { config, schedule, leadMinutes });
export const disableReminders = () => postJSON("/reminders/disable", {});
export const previewReminder = (config, schedule, leadMinutes = 10) => postJSON("/reminders/preview", { config, schedule, leadMinutes });
export const sendTestReminder = (config, schedule, to, leadMinutes = 10) => postJSON("/reminders/test", { config, schedule, to, leadMinutes });
