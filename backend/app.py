"""
Local API server for the Periodic timetable generator.

Runs entirely on your own machine (http://127.0.0.1:5000) — nothing here
talks to the internet or any third-party service. The frontend (a Vite/React
dev server or its production build) calls this API to generate timetables
and to find substitute teachers; see backend/logic.py for the actual
scheduling algorithm.
"""

import os


def _load_env_file() -> None:
    """Read backend/.env (KEY=VALUE lines) into the environment, if the file exists."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file()

from flask import Flask, jsonify, request
from flask_cors import CORS

from logic import find_substitutes, generate_timetable
import reminders

app = Flask(__name__)
# CORS is needed because the frontend dev server (http://localhost:5173) and
# this API (http://127.0.0.1:5000) are different origins. Everything still
# stays on localhost — this does not open the server up to the internet.
CORS(app)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/generate", methods=["POST"])
def generate():
    config = request.get_json(force=True, silent=True)
    if config is None:
        return jsonify({"error": "Request body must be JSON."}), 400
    try:
        result = generate_timetable(config)
    except Exception as exc:  # keep the API resilient to malformed input
        return jsonify({"error": f"Could not generate a timetable: {exc}"}), 400
    return jsonify(result)


@app.route("/api/substitute", methods=["POST"])
def substitute():
    body = request.get_json(force=True, silent=True)
    if body is None:
        return jsonify({"error": "Request body must be JSON."}), 400
    required = ("config", "schedule", "teacherId", "day", "period")
    missing = [k for k in required if k not in body]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    try:
        result = find_substitutes(
            body["config"], body["schedule"], body["teacherId"], body["day"], body["period"]
        )
    except Exception as exc:
        return jsonify({"error": f"Could not search for a substitute: {exc}"}), 400
    return jsonify(result)


# ---------------------------------------------------------------------------
# Email reminders (see reminders.py). SMTP credentials come from environment
# variables — see backend/.env.example.
# ---------------------------------------------------------------------------

@app.route("/api/reminders/status", methods=["GET"])
def reminders_status():
    return jsonify(reminders.service.status())


@app.route("/api/reminders/enable", methods=["POST"])
def reminders_enable():
    body = request.get_json(force=True, silent=True) or {}
    if "config" not in body or "schedule" not in body:
        return jsonify({"error": "Missing config or schedule."}), 400
    reminders.service.enable(body["config"], body["schedule"], body.get("leadMinutes", 10))
    return jsonify(reminders.service.status())


@app.route("/api/reminders/disable", methods=["POST"])
def reminders_disable():
    reminders.service.disable()
    return jsonify(reminders.service.status())


@app.route("/api/reminders/preview", methods=["POST"])
def reminders_preview():
    """Compose (but don't send) the email a teacher would get for their first session."""
    body = request.get_json(force=True, silent=True) or {}
    config, schedule = body.get("config"), body.get("schedule")
    if not config or not schedule:
        return jsonify({"error": "Missing config or schedule."}), 400
    lead = int(body.get("leadMinutes", 10))
    teacher = next((t for t in config["teachers"] if t["id"] == body.get("teacherId")), None) or next(
        (t for t in config["teachers"] if reminders.teacher_sessions(config, schedule, t)), None)
    if not teacher:
        return jsonify({"error": "No teacher has any lectures to preview."}), 400
    sessions = reminders.teacher_sessions(config, schedule, teacher)
    return jsonify(reminders.compose_email(config, teacher, sessions[0], lead) | {"to": teacher.get("email", ""), "teacher": teacher.get("name", "")})


@app.route("/api/reminders/test", methods=["POST"])
def reminders_test():
    """Send one sample email to an address you choose, to check your SMTP settings work."""
    body = request.get_json(force=True, silent=True) or {}
    config, schedule, to = body.get("config"), body.get("schedule"), (body.get("to") or "").strip()
    if not config or not schedule or not to:
        return jsonify({"error": "Provide config, schedule and a 'to' address."}), 400
    teacher = next((t for t in config["teachers"] if reminders.teacher_sessions(config, schedule, t)), None)
    if not teacher:
        return jsonify({"error": "No teacher has any lectures to use for the test."}), 400
    session = reminders.teacher_sessions(config, schedule, teacher)[0]
    try:
        reminders.send_email(to, reminders.compose_email(config, teacher, session, int(body.get("leadMinutes", 10))))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"ok": True})


const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173', 
  methods: ['GET', 'POST']
}));

# Resume the scheduler automatically if reminders were left switched on
# before a restart.
if reminders.service.enabled:
    reminders.service.start()


if __name__ == "__main__":
    # 127.0.0.1 only — this server is not exposed to your network.
    app.run(host="127.0.0.1", port=5000, debug=False)
