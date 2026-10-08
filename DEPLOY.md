# Putting Periodic online (GitHub → Supabase → Render → Vercel)

Do these in order. Nothing here is required to run it on your own computer.

## 1. Push to GitHub
1. Install Git (https://git-scm.com/downloads) and make a free account at github.com.
2. On github.com click **New repository**, name it `periodic`, leave it empty (no README), **Create**.
3. In a terminal, inside the project folder:
   ```
   git init
   git add .
   git commit -m "Periodic timetable generator"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/periodic.git
   git push -u origin main
   ```
   (If Git says it doesn't know who you are: `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`, then commit again.)
   `.gitignore` already keeps `node_modules`, `venv`, `.env` and your passwords out of GitHub — double-check `git status` shows no `.env` file.

## 2. Supabase (saves timetables in a database)
1. supabase.com → **New project** (pick a region near you; save the database password).
2. Left menu **SQL Editor → New query**, paste, **Run**:
   ```sql
   create table timetables (
     id uuid primary key default gen_random_uuid(),
     name text not null,
     config jsonb not null,
     schedule jsonb,
     created_at timestamptz not null default now()
   );
   alter table timetables enable row level security;
   create policy "prototype read"   on timetables for select using (true);
   create policy "prototype insert" on timetables for insert with check (true);
   create policy "prototype delete" on timetables for delete using (true);
   ```
   ⚠ These policies let **anyone who has your site's URL** read/save/delete timetables, because the app's login is only a placeholder. Fine for a private demo; before real use, add real Supabase Auth and tighten the policies.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
4. Locally: copy `frontend/.env.example` to `frontend/.env`, paste both values, restart `npm run dev`. The "Save & Load" tab on the Set Up page now works.

## 3. Backend on Render (Python + email reminders)
Vercel can't host this part: reminders need a program that stays running to watch the clock, and Vercel only runs code in response to a request.
1. render.com → **New → Web Service** → connect your GitHub repo.
2. **Root Directory:** `backend` · **Build Command:** `pip install -r requirements.txt` · **Start Command:** `gunicorn app:app --workers 1 --threads 4`
   (keep **one** worker — more would send duplicate reminder emails).
3. **Environment** tab: add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (see `backend/.env.example`) and `TZ=Asia/Kolkata`.
4. ⚠ Render's **free** plan puts the service to sleep when idle — a sleeping service sends **no** reminders. For real reminders use a paid always-on instance (or Railway / a small VM).
5. Copy the service URL (e.g. `https://periodic-api.onrender.com`).
6. Note: the reminder schedule is saved to a file on the server; on Render that file is wiped on every redeploy, so just press **Turn on reminders** again after deploying.

## 4. Frontend on Vercel
1. vercel.com → **Add New → Project** → import the same GitHub repo.
2. **Root Directory:** `frontend` (Framework: Vite is auto-detected; build `npm run build`, output `dist`).
3. **Environment Variables:** `VITE_API_URL` = `https://YOUR-RENDER-URL/api` · `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY`.
4. **Deploy.** Every `git push` to `main` redeploys automatically.
