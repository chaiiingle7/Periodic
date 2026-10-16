"""
Email reminders for teachers — sent N minutes (default 10) before each lecture.

Uses only the Python standard library (urllib, smtplib, threading, email,
zoneinfo), so there is nothing extra to install.

Two ways to send (credentials come from environment variables, never from the
timetable):
  1. Brevo HTTPS API   -> set BREVO_API_KEY and BREVO_SENDER. Works on hosts
     that block SMTP ports (such as Render's free plan). 300 emails/day free.
  2. Plain SMTP        -> set SMTP_HOST, SMTP_USER, SMTP_PASSWORD (e.g. Gmail
     with an App Password). Works locally or on hosts that allow SMTP.
If BREVO_API_KEY is set it is used; otherwise SMTP is used.

How it works:
  1. The frontend sends the generated timetable to /api/reminders/enable.
  2. A background thread wakes up every 30 seconds, looks at "now" in the
     REMINDER_TIMEZONE timezone (default Asia/Kolkata), and finds every
     lecture/lab that starts in about `lead_minutes`. For each one it emails
     that teacher once.
  3. Consecutive periods of the same class (e.g. a 2-period lab) are treated
     as ONE session, so a teacher gets one email per session, not one per period.

IMPORTANT: the background thread only runs while this backend process is
running, so the host must stay awake (e.g. ping /api/health every 5 minutes).
Run a single worker/instance, or reminders will be sent more than once.
"""

import json
import os
import smtplib
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reminders_state.json")
DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


# ---------------------------------------------------------------------------
# Timezone: servers usually run on UTC, but lectures are in local time.
# Set REMINDER_TIMEZONE on the server (e.g. Asia/Kolkata) to change it.
# ---------------------------------------------------------------------------

def _timezone():
    name = os.environ.get("REMINDER_TIMEZONE") or "Asia/Kolkata"
    try:
        return ZoneInfo(name)
    except Exception:
        if name in ("Asia/Kolkata", "Asia/Calcutta"):
            return timezone(timedelta(hours=5, minutes=30))
        return None


def _now() -> datetime:
    tz = _timezone()
    return datetime.now(tz) if tz else datetime.now()


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
# Sending: Brevo HTTPS API (free-host friendly) or plain SMTP
# ---------------------------------------------------------------------------

def brevo_settings() -> Dict[str, str]:
    return {
        "api_key": (os.environ.get("BREVO_API_KEY", "") or "").strip(),
        "sender": (os.environ.get("BREVO_SENDER") or os.environ.get("SMTP_FROM") or os.environ.get("SMTP_USER") or "").strip(),
        "name": (os.environ.get("BREVO_SENDER_NAME") or "Periodic Timetable").strip(),
    }


def brevo_configured() -> bool:
    b = brevo_settings()
    return bool(b["api_key"] and b["sender"])


def smtp_settings() -> Dict[str, Any]:
    return {
        "host": (os.environ.get("SMTP_HOST", "") or "").strip(),
        "port": int(os.environ.get("SMTP_PORT", "587") or 587),
        "user": (os.environ.get("SMTP_USER", "") or "").strip(),
        # Google shows app passwords with spaces; they must be removed.
        "password": (os.environ.get("SMTP_PASSWORD", "") or "").replace(" ", "").strip(),
        "sender": (os.environ.get("SMTP_FROM") or os.environ.get("SMTP_USER", "") or "").strip(),
    }


def smtp_configured() -> bool:
    s = smtp_settings()
    return bool(s["host"] and s["user"] and s["password"])


def email_configured() -> bool:
    """True if either sending method is set up."""
    return brevo_configured() or smtp_configured()


def _send_via_brevo(to: str, content: Dict[str, str]) -> None:
    b = brevo_settings()
    payload = json.dumps({
        "sender": {"name": b["name"], "email": b["sender"]},
        "to": [{"email": to}],
        "subject": content["subject"],
        "htmlContent": content["html"],
        "textContent": content["text"],
    }).encode("utf-8")
    req = urllib.request.Request(
        BREVO_URL,
        data=payload,
        method="POST",
        headers={
            "api-key": b["api_key"],
            "content-type": "application/json",
            "accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            resp.read()
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8", "replace")[:300]
        except Exception:
            pass
        raise RuntimeError(f"Brevo rejected the request (HTTP {exc.code}). {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Could not reach Brevo: {exc.reason}") from exc


def _send_via_smtp(to: str, content: Dict[str, str]) -> None:
    s = smtp_settings()
    msg = EmailMessage()
    msg["Subject"] = content["subject"]
    msg["From"] = s["sender"]
    msg["To"] = to
    msg.set_content(content["text"])
    msg.add_alternative(content["html"], subtype="html")
    try:
        if s["port"] == 465:
            with smtplib.SMTP_SSL(s["host"], s["port"], timeout=20) as server:
                server.login(s["user"], s["password"])
                server.send_message(msg)
        else:
            with smtplib.SMTP(s["host"], s["port"], timeout=20) as server:
                server.starttls()
                server.login(s["user"], s["password"])
                server.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        raise RuntimeError(
            "The mail server rejected the login. For Gmail, use a 16-character App Password "
            "(Google Account > Security > App passwords), not your normal password, and make sure "
            "SMTP_USER is the full Gmail address."
        )
    except smtplib.SMTPException:
        raise
    except OSError as exc:
        raise RuntimeError(
            f"Could not connect to the mail server ({s['host']}:{s['port']}): {exc}. "
            "If this backend runs on Render's free plan, outbound mail ports are blocked — "
            "use the Brevo option (BREVO_API_KEY + BREVO_SENDER) instead."
        ) from exc


def send_email(to: str, content: Dict[str, str]) -> None:
    if brevo_configured():
        _send_via_brevo(to, content)
    elif smtp_configured():
        _send_via_smtp(to, content)
    else:
        raise RuntimeError(
            "Email sending is not configured — set BREVO_API_KEY and BREVO_SENDER "
            "(or SMTP_HOST, SMTP_USER and SMTP_PASSWORD) on the backend."
        )


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
    # Note: on hosts with an ephemeral disk (e.g. Render's free plan) this file
    # is lost on every redeploy/restart; switch reminders on again from the app
    # if that happens.
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
            # key name kept as-is because the frontend reads it
            "smtpConfigured": email_configured(),
            "leadMinutes": self.lead_minutes,
            "teachersWithEmail": emails,
            "sentToday": len([k for k in self.sent if k.startswith(str(_now().date()))]),
            "lastError": self.last_error,
        }

    def tick(self, now: Optional[datetime] = None) -> int:
        """Send everything currently due. Returns how many emails were sent."""
        if not (self.enabled and self.config and self.schedule):
            return 0
        now = now or _now()
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
