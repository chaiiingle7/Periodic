# Periodic — Timetable Generator

A school/college timetable generator: a React frontend for the UI, and a
Python backend that runs the actual scheduling algorithm (constraint
satisfaction with randomized restarts, including sub-batch lab rotation and
the substitute-teacher finder).

Everything runs locally on your own machine. There is no cloud service, no
database, and no account system beyond the app's own (mock) login screen.

---

## A. Complete project folder structure

```
periodic/
├── start.bat                  ← Windows: one-click dev launcher
├── start-production.bat       ← Windows: one-click production launcher
├── README.md
├── .gitignore
│
├── backend/                   ← Python API (the scheduling logic)
│   ├── app.py                 ← Flask server, exposes /api/generate and /api/substitute
│   ├── logic.py                ← the scheduling algorithm itself (pure Python, no Flask)
│   ├── requirements.txt        ← Flask, flask-cors
│   └── venv/                   ← created automatically on first run (not checked in)
│
└── frontend/                  ← React app (the UI)
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── src/
    │   ├── main.jsx            ← React entry point
    │   ├── App.jsx             ← the whole application (pages, forms, rendering)
    │   ├── api.js               ← talks to the Python backend over HTTP
    │   └── index.css            ← all styling (Apple-style design system)
    └── node_modules/            ← created automatically on first run (not checked in)
```

## B. All files required

Listed above — nothing else is needed. `backend/venv/` and
`frontend/node_modules/` are created for you the first time you run the app
(by `start.bat`, or manually per the commands below) and are not something
you need to create by hand.

## Why a Python backend at all?

The scheduling algorithm (assigning every lecture and lab to a day/period
without clashes) now runs in Python (`backend/logic.py`), not in the
browser. Browsers can't execute Python directly, so a small local server
(`backend/app.py`, using Flask) exposes it over HTTP on
`http://127.0.0.1:5000`. The React frontend calls that server whenever you
click **Generate Timetable** or use the substitute-finder in Help — both
of these require the backend to be running. Everything else in the app
(navigating pages, filling in forms) works with the frontend alone.

---

## Prerequisites

Install these once, if you don't already have them:

- **Python 3.9+** — https://www.python.org/downloads/ (on Windows, tick
  "Add Python to PATH" during install)
- **Node.js 18+** (includes npm) — https://nodejs.org/ (choose the LTS
  version)

No other accounts, API keys, or external services are required.

---

## C. Exact Windows installation steps

1. Copy the whole `periodic/` folder onto your computer.
2. Install Python and Node.js from the links above, if not already installed.
3. Double-click **`start.bat`**.
   - On the very first run, it will automatically:
     - create a Python virtual environment in `backend\venv\`
     - install the backend's Python packages (Flask, flask-cors)
     - run `npm install` in `frontend\` to fetch the React dependencies
   - This first run takes a minute or two, depending on your internet
     connection (npm and pip both need to download packages the very
     first time — after that, everything runs fully offline).
4. Two new console windows will open (backend and frontend), and your
   browser will open to `http://localhost:5173` automatically.
5. Sign in on the login screen with any name and password (it's a mock
   login — see the Help page in the app for why), then use **Set Up** to
   enter batches/teachers/subjects and **Generate Timetable**.

To stop the app, close the two console windows `start.bat` opened.

---

## D. Exact commands to run it (manual / non-Windows)

If you're not on Windows, or prefer doing it by hand instead of using
`start.bat`, open two terminals:

**Terminal 1 — backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows (Command Prompt): venv\Scripts\activate.bat
pip install -r requirements.txt
python app.py
```
This starts the API on `http://127.0.0.1:5000`. Leave it running.

**Terminal 2 — frontend:**
```bash
cd frontend
npm install
npm run dev
```
This starts the dev server, normally on `http://localhost:5173`. Open that
URL in your browser.

---

## E. How to create the production build

```bash
cd frontend
npm run build
```

This outputs a static, optimized build into `frontend/dist/`.

## F. Running the production build locally with a simple server

The production build is just static files, but the app still needs the
Python backend running for timetable generation and the substitute finder.

```bash
# Terminal 1 (same as before) — keep the backend running:
cd backend
source venv/bin/activate    # or venv\Scripts\activate.bat on Windows
python app.py

# Terminal 2 — serve the built frontend:
cd frontend
npm run build
npm run preview
```

`npm run preview` serves `frontend/dist/` on `http://localhost:4173` and is
already configured (in `vite.config.js`) to forward `/api` requests to the
backend on port 5000, exactly like the dev server does. On Windows, you can
also just double-click **`start-production.bat`**, which does all of the
above for you (installs dependencies if needed, builds, and launches both
servers).

If you'd rather use a different static file server for `frontend/dist/`
(e.g. `npx serve dist`), that works too for the pages themselves, but you
will need to either run it on port 4173 (matching `vite.config.js`'s proxy)
or reconfigure `VITE_API_URL` (see below) to point directly at
`http://127.0.0.1:5000/api` before building.

## G. How to launch it later without repeating setup

Once `backend/venv/` and `frontend/node_modules/` exist (created on the
first run), you never need to reinstall anything — just:

- **Windows:** double-click `start.bat` again (it detects the existing
  setup and skips straight to launching both servers).
- **Manual:** repeat only the *last* command in each terminal from section D
  — `python app.py` in `backend/` (with the venv activated) and
  `npm run dev` in `frontend/` — no need to run `pip install` or
  `npm install` again unless you change `requirements.txt` or
  `package.json`.

---

## External dependencies / services still required

**None, for the app's core functionality.** Timetable generation, the
substitute finder, and the availability explorer all run entirely on your
own machine (the Flask API and the React dev/preview server both listen
only on `localhost`/`127.0.0.1`). No API keys, no database, no signup, and
no internet connection is needed once `npm install` / `pip install` have
completed once.

Two things worth flagging explicitly, per your point about not faking or
silently dropping functionality:

1. **Login is a mock.** There's no real authentication, user database, or
   session system — entering any non-empty name and password signs you in.
   This was true before this conversion and is unchanged. If you need real
   accounts, that requires adding an actual auth/user backend (e.g. a
   database-backed login), which is a separate piece of work.

2. **Teacher email / class reminders are data-only, not wired up.** Each
   teacher can optionally have an email address, intended for a future
   "remind the teacher 5–10 minutes before class" feature. No email is
   ever sent by this app — there is no SMTP configuration, no scheduled
   job, and no third-party email API (e.g. SendGrid, Resend, AWS SES)
   connected. To make real reminder emails happen, you would need to:
   - choose an email-sending service and get API credentials for it, and
   - add a small scheduler (e.g. a periodic backend job) that reads the
     generated timetable and sends emails ahead of each lecture.
   This is genuinely external infrastructure — it has not been faked or
   simulated anywhere in the app.

## Notes on data & persistence

There is no database. The batches/teachers/subjects you enter and the
generated timetable exist only in the browser tab's memory for that
session — refreshing the page clears them, exactly as before this
conversion. If you want your setup to survive a refresh or be shared
between sessions, that would mean adding real storage (a database on the
backend, or at minimum saving to a local file) — flagging this rather than
quietly adding it, since it changes how the app behaves.

## Offline use

Once `pip install` and `npm install` have both completed successfully at
least once (which does need internet access, to download the packages),
the app runs fully offline — the frontend and backend only ever talk to
each other over `localhost`, and no other network requests are made.

---

## What's new in this version

- **Real SE-IT sample data** (Load sample data on the Set Up page) — taken from the department's allocation sheet and class timetable.
- **Sub-batches S1–S4** with their own labs, teachers and hours.
- **No free periods** and **Labs only after lunch** options (Set Up → Schedule Settings).
- **Printable timetable** (Timetables → Printable format).
- **Teacher email reminders** 10 minutes before each lecture — needs SMTP settings in `backend/.env` (copy `backend/.env.example`) and a backend that stays running.
- Saving to **Supabase** and deploying: see `DEPLOY.md`.

## Liquid Glass theme

The nav bar and the About page's feature cards use frosted "liquid glass", with a pastel timetable-themed hero image (`frontend/public/hero.svg`) as the page backdrop.

- **Two layers.** A CSS frosted-glass look always works. When the browser supports WebGL2 and the library files can be loaded, [liquid-glass-js](https://github.com/dashersw/liquid-glass-js) draws real refraction on top (`src/components/GlassLayer.jsx`, `src/utils/liquidGlass.js`). If it can't load, you simply keep the CSS glass.
- **Offline use:** download `container.js`, `button.js`, `glass.css` (liquid-glass-js) and `html2canvas.min.js` (v1.4.1) into `frontend/public/vendor/`. They're used automatically instead of the CDN.
- **Tuning:** `--glass-blur` and `--glass-scrim` (higher = more readable text) at the bottom of `src/index.css`; tint strengths in `GLASS_TUNING` (`src/utils/liquidGlass.js`). Open `http://localhost:5173/glass-demo.html` for a standalone page with a tint slider. The WebGL blur radius itself lives inside the library's `container.js`.
- **Performance:** the effect re-samples the page with html2canvas; use the **Glass on/off** switch in the nav bar if a machine feels slow.
- Text contrast over the glass was checked against the strongest colours in the artwork (body text 11–13:1, secondary 6.7–7.9:1, nav links ≥ 4.5:1 — WCAG AA).
