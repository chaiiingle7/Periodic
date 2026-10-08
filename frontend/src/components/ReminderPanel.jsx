import React, { useEffect, useState } from "react";
import { Mail, Eye, Send, Power } from "lucide-react";
import {
  getReminderStatus, enableReminders, disableReminders, previewReminder, sendTestReminder,
} from "../api";

// Controls for the 10-minutes-before email reminders. The actual sending
// happens in the Python backend (backend/reminders.py) — this panel just
// switches it on/off, previews the email, and sends a test.
function ReminderPanel({ config, schedule }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(null);
  const [testTo, setTestTo] = useState("");
  const LEAD = 10;

  const refresh = async () => {
    try { setStatus(await getReminderStatus()); setErr(""); }
    catch (e) { setStatus(null); setErr(e.message === "Failed to fetch" ? "Can't reach the backend — start it to use email reminders." : e.message); }
  };
  useEffect(() => { refresh(); }, []);

  const run = async (fn, okMsg) => {
    setBusy(true); setErr(""); setMsg("");
    try { const r = await fn(); if (okMsg) setMsg(okMsg); return r; }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); refresh(); }
  };

  const withEmail = config.teachers.filter((t) => (t.email || "").trim()).length;

  return (
    <div className="tg-card" style={{ marginTop: 24 }}>
      <div className="tg-section-title" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}><Mail size={18} /> Email reminders to teachers</div>
      <div className="tg-section-sub">
        Each teacher with an email address gets an automatic email {LEAD} minutes before every lecture or lab — class, subject, time and duration included.
        {" "}{withEmail} of {config.teachers.length} teachers have an email on file.
      </div>

      {status && !status.smtpConfigured && (
        <div className="tg-badge tg-badge-amber" style={{ marginBottom: 14, display: "block", padding: "10px 14px", lineHeight: 1.5 }}>
          Sending isn't set up yet: the backend needs your email account's SMTP settings (SMTP_HOST, SMTP_USER, SMTP_PASSWORD).
          See <code>backend/.env.example</code> and the README. You can still preview the email below.
        </div>
      )}
      {status?.enabled && <div className="tg-badge tg-badge-green" style={{ marginBottom: 14 }}>Reminders are ON · {status.sentToday} sent today</div>}
      {status?.lastError && <div className="tg-badge tg-badge-red" style={{ marginBottom: 14, display: "block", padding: "10px 14px" }}>Last problem: {status.lastError}</div>}
      {err && <div className="tg-badge tg-badge-red" style={{ marginBottom: 14, display: "block", padding: "10px 14px" }}>{err}</div>}
      {msg && <div className="tg-badge tg-badge-green" style={{ marginBottom: 14 }}>{msg}</div>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {status?.enabled ? (
          <button className="tg-btn tg-btn-secondary tg-btn-sm" disabled={busy} onClick={() => run(() => disableReminders(), "Reminders turned off.")}><Power size={14} /> Turn off</button>
        ) : (
          <button className="tg-btn tg-btn-primary tg-btn-sm" disabled={busy || !status} onClick={() => run(() => enableReminders(config, schedule, LEAD), "Reminders are on.")}><Power size={14} /> Turn on reminders</button>
        )}
        <button className="tg-btn tg-btn-secondary tg-btn-sm" disabled={busy || !status} onClick={async () => { const r = await run(() => previewReminder(config, schedule, LEAD)); if (r) setPreview(r); }}><Eye size={14} /> Preview email</button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input className="tg-input" style={{ maxWidth: 280 }} type="email" placeholder="your@email.com (send yourself a test)" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
        <button className="tg-btn tg-btn-secondary tg-btn-sm" disabled={busy || !testTo || !status} onClick={() => run(() => sendTestReminder(config, schedule, testTo, LEAD), `Test email sent to ${testTo}.`)}><Send size={14} /> Send test</button>
      </div>

      {preview && (
        <div style={{ marginTop: 18, border: "1px solid var(--tg-line-soft)", borderRadius: 12, padding: 16, background: "#fafafc" }}>
          <div className="tg-subtle">Example — would go to {preview.teacher}{preview.to ? ` (${preview.to})` : ""}</div>
          <div style={{ fontWeight: 600, margin: "6px 0 10px" }}>{preview.subject}</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, lineHeight: 1.6 }}>{preview.text}</pre>
        </div>
      )}
    </div>
  );
}

export default ReminderPanel;
