# GridIQ (DS 440 Capstone)

GridIQ is an **AI assistant coach for American football**: chat with an AI coach, explore NFL dashboards, and draw plays in an interactive **Playbook** (routes, coverages, line of scrimmage).

---

## Quick start — read this first

Pick **one** path below. Use **two terminal windows** for the full app.

### You need installed

| Tool | Used for | Get it |
|------|----------|--------|
| **Node.js** 18+ (20+ recommended) | Website | [nodejs.org](https://nodejs.org/) |
| **Python** 3.10+ | API (skip if you only run the front-end) | [python.org](https://www.python.org/downloads/) |

---

### Option A — Front-end only (fastest)

Good for **Playbook** and browsing the UI. **No** Python, **no** database, **no** login/API.

1. Clone the repo and open a terminal at the **root** of the project (the folder that contains `gridiq-frontend`).

2. Copy and paste:

```bash
cd gridiq-frontend
npm install
npm run dev
```

3. In your browser, open **http://localhost:5173**  
4. In the sidebar, open **Playbook**.

---

### Option B — Full stack (login, chat, dashboard, API)

Use **two terminals**. Leave both running.

#### Terminal 1 — Backend (API)

```bash
cd gridiq-backend
```

**First time only:**

| Windows (PowerShell or CMD) | Mac / Linux |
|----------------------------|-------------|
| `copy .env.example .env` | `cp .env.example .env` |

Then edit **`gridiq-backend/.env`**:

- Set **`JWT_SECRET`** to any long random string (required for login).
- Set **`GEMINI_API_KEY`** if you want **live chat** (from [Google AI Studio](https://aistudio.google.com/)). If you skip it, other features still work; chat may show a setup message.

**First time only — install and database:**

```bash
pip install -r requirements.txt
python -m alembic upgrade head
```

**Start the API** (run this **every time** you work on the backend):

```powershell
cd gridiq-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

| If you see… | Fix |
|-------------|-----|
| `No module named 'app'` | You are not inside **`gridiq-backend`**. `cd` there, then run `uvicorn` again. |

- API: **http://localhost:8000**  
- Interactive docs: **http://localhost:8000/docs**

#### Terminal 2 — Front-end

```bash
cd gridiq-frontend
npm install
npm run dev
```

- App: **http://localhost:5173**

By default the UI calls **http://localhost:8000**. To change that, use **Settings** in the app or set `VITE_API_BASE_URL` for builds.

---

### After it’s running

1. Open **http://localhost:5173**  
2. **Register** / **Log in** (full stack only)  
3. Explore **Dashboard**, **Chat**, and **Playbook**

---

## What’s in this repo

| Folder | What it is |
|--------|------------|
| **`gridiq-frontend/`** | React + TypeScript + Vite — UI, Playbook, dashboard, chat client |
| **`gridiq-backend/`** | Python **FastAPI** — auth, chat (Gemini), NFL/nflverse data, cache |

---

## Features (current)

- **Playbook** — 120-yard field, line of scrimmage & first-down markers, offensive routes (pass / run / block), defensive coverage (zone / man / blitz toward QB), draggable players and bendable routes  
- **Dashboard** — NFL schedule / play views using nflverse-backed endpoints  
- **Chat** — AI coach (needs `GEMINI_API_KEY`)  
- **Auth** — Register, login, JWT  

---

## Tech stack

- **Front-end:** React, TypeScript, Vite, Tailwind  
- **Back-end:** FastAPI, SQLAlchemy, Alembic, SQLite by default (Postgres optional)  
- **AI:** Google Gemini  
- **Data:** nflverse / NFL play-by-play  

---

## Backend API (summary)

**Auth:** `POST /api/auth/register`, `POST /api/auth/login`  

**Chat:** conversations CRUD, `POST /api/chat/chat`  

**Games / data:** `GET /api/games/...`, nflverse dashboard routes under `/api/games/nflverse/...`, sync endpoints for games/plays  

**Cache:** `/api/cache/...`  

Full detail: **http://localhost:8000/docs** when the API is running.

### Database schema (high level)

Users, conversations, messages, games, plays, cache — see `gridiq-backend/app/models/`.

---

## Optional: Postgres via Docker

From `gridiq-backend`:

```bash
docker compose up -d
```

Point `DATABASE_URL` in `.env` at that database if you use it instead of SQLite.

---

## Usage tips

### Register and log in (full stack)

1. Go to **http://localhost:5173**  
2. **Register**, then **Log in**

### Sync NFL data (optional)

Authenticated `POST` requests, e.g.:

```bash
curl -X POST "http://localhost:8000/api/games/sync/games?season=2023" -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Project structure (short)

```
gridiq-backend/
  app/main.py          # FastAPI app
  app/api/routes/      # auth, chat, games, cache, users, nflverse dashboard
  app/models/, schemas/, core/

gridiq-frontend/
  src/pages/           # Login, Dashboard, Playbook, Chat, …
  src/lib/api/         # Axios client (default base: localhost:8000)
```

---

## Environment variables (`gridiq-backend/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Default dev: `sqlite:///./gridiq.db` |
| `JWT_SECRET` | Required for auth |
| `GEMINI_API_KEY` | Required for full AI chat behavior |
| `CORS_ORIGINS` | Optional; defaults allow `localhost:5173` |
| `ENV` | e.g. `dev` |

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| **`No module named 'app'`** | Run `uvicorn` from **`gridiq-backend`**, not the monorepo root. |
| **Chat not answering** | Set `GEMINI_API_KEY` in `.env`, restart `uvicorn`. |
| **Front-end can’t reach API** | Start the backend; check **http://localhost:8000/docs**; fix **Settings** API URL or CORS if you changed ports. |
| **`pip` / `python` not found** | Install Python 3.10+ and use `py -m pip` on Windows if needed. |

---

## License

See [LICENSE](LICENSE).
