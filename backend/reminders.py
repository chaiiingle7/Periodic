"""
Email reminders for teachers — sent N minutes (default 10) before each lecture.

Uses only the Python standard library (smtplib, threading, email) so there is
nothing extra to install. SMTP credentials come from environment variables
(see .env.example in this folder); they are never stored in the timetable.

How it works:
  1. The frontend sends the generated timetable to /api/reminders/enable.
  2. A background thread wakes up every 30 seconds, looks at "now" in the
     server's timezone, and finds every lecture/lab that starts in about
     `lead_minutes`. For each one it emails that teacher once.
  3. Consecutive periods of the same class (e.g. a 2-period lab) are treated
     as ONE session, so a teacher gets one email per session, not one per period.

IMPORTANT: the background thread only runs while this backend process is
running. Host it somewhere that stays on (Render / Railway / a VM) — not a
serverless function. Run a single worker/instance, or reminders will be
sent more than once.
"""

import json
import os
import smtplib
import threading
import time
from datetime import datetime, timedelta
from email.message import EmailMessage
from typing import Any, Dict, List, Optional

STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reminders_state.json")
DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


# ---------------------------------------------------------------------------
# Time helpers
# ---------------------------------------------------------------------------

def _to_minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _fmt(minutes: int) -> str:
    minutes %= 24 * 60
    h, m = divmod(minutes, 60)
    suffix = "AM" if h < 12 else "PM"
    h12 = h % 12 or 12
    return f"{h12}:{m:02d} {suffix}"


def period_start_minute(config: dict, period: int) -> int:
    """Minutes after midnight when `period` starts (breaks included)."""
    t = _to_minutes(config["dayStartTime"])
    for p in range(1, period):
        t += config["periodDuration"]
        for b in config.get("breaks", []):
            if b["afterPeriod"] == p:
                t += b["duration"]
    return t


# ---------------------------------------------------------------------------
# Turning the schedule into per-teacher sessions
# ---------------------------------------------------------------------------

def _cell(schedule: dict, tid: str, day: str, p: int) -> Optional[dict]:
    day_map = schedule.get("teacherSlot", {}).get(tid, {}).get(day, {}) or {}
    return day_map.get(p) or day_map.get(str(p))


def teacher_sessions(config: dict, schedule: dict, teacher: dict) -> List[dict]:
    """One entry per session (consecutive periods of the same class merge)."""
    sessions: List[dict] = []
    for day in config["days"]:
        periods = config["dayOverrides"].get(day) if config.get("dayOverrides", {}).get(day) else config["periodsPerDay"]
        current: Optional[dict] = None
        for p in range(1, periods + 1):
            cell = _cell(schedule, teacher["id"], day, p)
            key = None if not cell else (cell.get("batchId"), cell.get("subjectId"), cell.get("subBatchIndex"))
            if current and key == current["key"]:
                current["end_period"] = p
                continue
            if current:
                sessions.append(current)
                current = None
            if cell:
                current = {"key": key, "day": day, "start_period": p, "end_period": p, "cell": cell}
        if current:
            sessions.append(current)

    out = []
    for s in sessions:
        start = period_start_minute(config, s["start_period"])
        end = period_start_minute(config, s["end_period"]) + config["periodDuration"]
        out.append({
            "day": s["day"],
            "start": start,
            "end": end,
            "duration": end - start,
            "cell": s["cell"],
        })
    return out


# ---------------------------------------------------------------------------
# The pre-made email template
# ---------------------------------------------------------------------------

def compose_email(config: dict, teacher: dict, session: dict, lead_minutes: int) -> Dict[str, str]:
    cell = session["cell"]
    batch = next((b for b in config["batches"] if b["id"] == cell.get("batchId")), {})
    class_name = batch.get("name") or cell.get("batchName") or "your class"
    sub = cell.get("subBatchIndex")
    group = f"S{sub + 1}" if sub is not None else None
    subject = cell.get("subjectName", "Lecture")
    abbr = cell.get("subjectAbbr")
    subject_label = f"{subject} ({abbr})" if abbr else subject
    kind = "Lab session" if cell.get("isLab") else "Lecture"
    start, end, dur = _fmt(session["start"]), _fmt(session["end"]), session["duration"]

    subject_line = f"Reminder: {kind} in {lead_minutes} min — {abbr or subject}, {class_name}" + (f" ({group})" if group else "") + f" at {start}"

    lines = [
        f"Hello {teacher.get('name', '')},",
        "",
        f"This is a reminder that you have a {kind.lower()} starting in {lead_minutes} minutes.",
        "",
        f"  Class    : {class_name}" + (f" — sub-batch {group}" if group else ""),
        f"  Subject  : {subject_label}",
        f"  Type     : {kind}",
        f"  Day      : {session['day']}",
        f"  Time     : {start} – {end}",
        f"  Duration : {dur} minutes",
        "",
        "Sent automatically by Periodic — Timetable Generator.",
    ]
    text = "\n".join(lines)

    rows = [
        ("Class", class_name + (f" — sub-batch {group}" if group else "")),
        ("Subject", subject_label),
        ("Type", kind),
        ("Day", session["day"]),
        ("Time", f"{start} – {end}"),
        ("Duration", f"{dur} minutes"),
    ]
    row_html = "".join(
        f'<tr><td style="padding:6px 14px 6px 0;color:#6e6e73">{k}</td><td style="padding:6px 0;font-weight:600">{v}</td></tr>'
        for k, v in rows
    )
    html = (
        '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1d1d1f;max-width:480px">'
        f'<p>Hello {teacher.get("name", "")},</p>'
        f'<p>You have a <strong>{kind.lower()}</strong> starting in <strong>{lead_minutes} minutes</strong>.</p>'
        f'<table style="border-collapse:collapse;font-size:15px">{row_html}</table>'
        '<p style="color:#6e6e73;font-size:12px;margin-top:20px">Sent automatically by Periodic — Timetable Generator.</p>'
        "</div>"
    )
    return {"subject": subject_line, "text": text, "html": html}


# ---------------------------------------------------------------------------
# SMTP
# ---------------------------------------------------------------------------

def smtp_settings() -> Dict[str, Any]:
    return {
        "host": os.environ.get("SMTP_HOST", ""),
        "port": int(os.environ.get("SMTP_PORT", "587") or 587),
        "user": os.environ.get("SMTP_USER", ""),
        "password": os.environ.get("SMTP_PASSWORD", ""),
        "sender": os.environ.get("SMTP_FROM") or os.environ.get("SMTP_USER", ""),
    }


def smtp_configured() -> bool:
    s = smtp_settings()
    return bool(s["host"] and s["user"] and s["password"])


def send_email(to: str, content: Dict[str, str]) -> None:
    s = smtp_settings()
    if not smtp_configured():
        raise RuntimeError("SMTP is not configured — set SMTP_HOST, SMTP_USER and SMTP_PASSWORD (see backend/.env.example).")
    msg = EmailMessage()
    msg["Subject"] = content["subject"]
    msg["From"] = s["sender"]
    msg["To"] = to
    msg.set_content(content["text"])
    msg.add_alternative(content["html"], subtype="html")
    if s["port"] == 465:
        with smtplib.SMTP_SSL(s["host"], s["port"], timeout=20) as server:
            server.login(s["user"], s["password"])
            server.send_message(msg)
    else:
        with smtplib.SMTP(s["host"], s["port"], timeout=20) as server:
            server.starttls()
            server.login(s["user"], s["password"])
            server.send_message(msg)


# ---------------------------------------------------------------------------
# Finding what's due, and the background scheduler
# ---------------------------------------------------------------------------

def due_reminders(config: dict, schedule: dict, lead_minutes: int, now: datetime, sent: set) -> List[dict]:
    """Sessions starting within `lead_minutes` from now that haven't been emailed yet today."""
    today = DAY_NAMES[now.weekday()]
    now_min = now.hour * 60 + now.minute + now.second / 60.0
    due = []
    for teacher in config["teachers"]:
        if not (teacher.get("email") or "").strip():
            continue
        for s in teacher_sessions(config, schedule, teacher):
            if s["day"] != today:
                continue
            # send once we're inside the lead window, up until the class starts
            if s["start"] - lead_minutes <= now_min < s["start"]:
                key = f"{now.date()}|{teacher['id']}|{s['start']}|{s['cell'].get('subjectId')}|{s['cell'].get('subBatchIndex')}"
                if key not in sent:
                    due.append({"key": key, "teacher": teacher, "session": s})
    return due


class ReminderService:
    def __init__(self) -> None:
        self.enabled = False
        self.config: Optional[dict] = None
        self.schedule: Optional[dict] = None
        self.lead_minutes = 10
        self.sent: set = set()
        self.last_error = ""
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._load()

    # -- persistence so reminders survive a restart --
    def _load(self) -> None:
        try:
            with open(STATE_FILE) as f:
                st = json.load(f)
            self.config, self.schedule = st["config"], st["schedule"]
            self.lead_minutes = st.get("lead_minutes", 10)
            self.enabled = bool(st.get("enabled"))
        except (OSError, ValueError, KeyError):
            pass

    def _save(self) -> None:
        try:
            with open(STATE_FILE, "w") as f:
                json.dump({"config": self.config, "schedule": self.schedule,
                           "lead_minutes": self.lead_minutes, "enabled": self.enabled}, f)
        except OSError as exc:
            self.last_error = f"Could not save reminder state: {exc}"

    def enable(self, config: dict, schedule: dict, lead_minutes: int = 10) -> None:
        with self._lock:
            self.config, self.schedule = config, schedule
            self.lead_minutes = max(1, int(lead_minutes))
            self.enabled = True
            self.sent = set()
            self._save()
        self.start()

    def disable(self) -> None:
        with self._lock:
            self.enabled = False
            self._save()

    def status(self) -> dict:
        emails = 0
        if self.config:
            emails = sum(1 for t in self.config["teachers"] if (t.get("email") or "").strip())
        return {
            "enabled": self.enabled,
            "smtpConfigured": smtp_configured(),
            "leadMinutes": self.lead_minutes,
            "teachersWithEmail": emails,
            "sentToday": len([k for k in self.sent if k.startswith(str(datetime.now().date()))]),
            "lastError": self.last_error,
        }

    def tick(self, now: Optional[datetime] = None) -> int:
        """Send everything currently due. Returns how many emails were sent."""
        if not (self.enabled and self.config and self.schedule):
            return 0
        now = now or datetime.now()
        sent_count = 0
        for item in due_reminders(self.config, self.schedule, self.lead_minutes, now, self.sent):
            try:
                send_email(item["teacher"]["email"].strip(),
                           compose_email(self.config, item["teacher"], item["session"], self.lead_minutes))
                self.sent.add(item["key"])
                sent_count += 1
                self.last_error = ""
            except Exception as exc:  # keep the scheduler alive no matter what
                self.last_error = f"{item['teacher'].get('name', '?')}: {exc}"
                self.sent.add(item["key"])  # don't retry-spam a failing address every 30s
        return sent_count

    def _loop(self) -> None:
        while True:
            try:
                self.tick()
            except Exception as exc:
                self.last_error = str(exc)
            time.sleep(30)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._loop, daemon=True, name="reminder-scheduler")
        self._thread.start()


service = ReminderService()
