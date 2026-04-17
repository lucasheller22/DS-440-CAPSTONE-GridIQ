# GridIQ (DS 440 Capstone)

GridIQ is an **AI assistant coach for American football**: chat with an AI coach, explore NFL dashboards, and draw plays in an interactive **Playbook** (routes, coverages, line of scrimmage).

---

## Prerequisites

Install these on your machine before you start.

| Software | Version | Role |
|----------|---------|------|
| [**Git**](https://git-scm.com/downloads) | Current | Clone the repo |
| [**Node.js**](https://nodejs.org/) | **18+** (20+ recommended) | Front-end (`gridiq-frontend`) |
| [**Python**](https://www.python.org/downloads/) | **3.10+** | Back-end API (`gridiq-backend`) |
| [**Docker Desktop**](https://www.docker.com/products/docker-desktop/) | Optional | Local PostgreSQL only |

**Shell tips**

- **Windows:** Use **PowerShell** or **Command Prompt**. If `python` is not found, try the [`py` launcher](https://docs.python.org/3/using/windows.html#launcher): `py -3 -m venv .venv`.
- **macOS / Linux:** Prefer `python3` if `python` is not on your `PATH`.

---

## 1. Get the code

```bash
git clone https://github.com/lucasheller22/DS-440-CAPSTONE-GridIQ.git
cd DS-440-CAPSTONE-GridIQ
```

---

## 2. Choose how you run it

| Mode | What you get | What you need |
|------|----------------|----------------|
| **Front-end only** | Playbook + UI (no login/API) | Node.js only |
| **Full stack** | Register/login, chat, dashboard, API | Node.js + Python |

Use **two terminals** for full stack (API + UI).

---

### Option A — Front-end only

From the **repo root** (the folder that contains `gridiq-frontend`):

```bash
cd gridiq-frontend
npm install
npm run dev
```

Open **http://localhost:5173** and use **Playbook** from the sidebar.

**Optional — front-end env** (`gridiq-frontend/.env`, not committed):

```bash
VITE_API_BASE_URL=http://localhost:8000
```

**Optional — mock API responses** (no back-end): set `VITE_USE_MOCKS=true` in that `.env`, or enable **Settings → Use local mocks** in the app.

---

### Option B — Full stack (API + UI)

#### Terminal 1 — Back-end API

Always run these commands from **`gridiq-backend`**.

1. **Virtual environment (recommended)**

   ```bash
   cd gridiq-backend
   python -m venv .venv
   ```

   Activate it:

   | OS / shell | Command |
   |------------|---------|
   | Windows **cmd** | `.venv\Scripts\activate.bat` |
   | Windows **PowerShell** | `.venv\Scripts\Activate.ps1` |
   | macOS / Linux | `source .venv/bin/activate` |

   If PowerShell blocks activation, run once: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.

2. **Install Python dependencies**

   ```bash
   python -m pip install --upgrade pip
   python -m pip install -r requirements.txt pyarrow
   ```

   `pyarrow` is needed so the dashboard can read nflverse **parquet** data. Alternative: `fastparquet` instead of (or in addition to) `pyarrow`.

3. **Environment file**

   | Windows (cmd / PowerShell) | macOS / Linux |
   |----------------------------|---------------|
   | `copy .env.example .env` | `cp .env.example .env` |

   Edit **`gridiq-backend/.env`**:

   - **`JWT_SECRET`** — set to a long random string (required for auth).
   - **`GEMINI_API_KEY`** — from [Google AI Studio](https://aistudio.google.com/) for live **Chat**; if empty, the app still runs; chat may show a setup message.

   See **Configuration** below for other variables.

4. **Database migrations** (first time, or after pulling migration changes)

   ```bash
   python -m alembic upgrade head
   ```

5. **Start the API**

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

- API: **http://localhost:8000**
- OpenAPI docs: **http://localhost:8000/docs**

---

#### Terminal 2 — Front-end

From the **repo root**:

```bash
cd gridiq-frontend
npm install
npm run dev
```

App: **http://localhost:5173** (defaults to API at **http://localhost:8000**; override with `VITE_API_BASE_URL` or **Settings** in the UI).

---

## 3. After startup (full stack)

1. Open **http://localhost:5173**
2. **Register** and **Log in**
3. Use **Dashboard**, **Chat**, and **Playbook**

---

## Configuration (`gridiq-backend/.env`)

Full template: **`gridiq-backend/.env.example`**.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Default: SQLite (`sqlite:///./gridiq.db` in the example). |
| `JWT_SECRET` | Required for auth; use a strong secret in production. |
| `GEMINI_API_KEY` | Optional; enables Gemini-powered chat. |
| `CORS_ORIGINS` | Comma-separated browser origins; defaults include `localhost:5173`. |
| `ENV` | e.g. `dev` |

---

## Optional: PostgreSQL (Docker)

From **`gridiq-backend`**:

```bash
docker compose up -d db
```

Set `DATABASE_URL` in `.env` to the Postgres URL (see comments in `.env.example`), then run **`python -m alembic upgrade head`** again.

The Compose file also defines an **`api`** service for containerized runs; local development is usually **uvicorn on the host** + optional `db` container.

---

## Optional: Sync NFL data

Authenticated `POST` requests to the games sync routes (example):

```bash
curl -X POST "http://localhost:8000/api/games/sync/games?season=2023" -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Repository layout

| Path | Contents |
|------|----------|
| `gridiq-frontend/` | React, TypeScript, Vite — UI, Playbook, dashboard, chat client |
| `gridiq-backend/` | FastAPI — auth, chat (Gemini), NFL / nflverse data, cache |

---

## Tech stack (short)

- **Front-end:** React, TypeScript, Vite, Tailwind  
- **Back-end:** FastAPI, SQLAlchemy, Alembic, SQLite by default (Postgres optional)  
- **AI:** Google Gemini  
- **Data:** nflverse / NFL play-by-play  

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| `No module named 'app'` | Run `uvicorn` from **`gridiq-backend`**, not the monorepo root. |
| `python` / `pip` not found | Install Python 3.10+; on Windows use `py -3` in place of `python`. |
| Chat does not reply | Set `GEMINI_API_KEY`, restart the API. |
| Dashboard / parquet errors | Install **`pyarrow`** (or **`fastparquet`**) with pip as in back-end step 2. |
| UI cannot reach API | Confirm **http://localhost:8000/docs** loads; check **Settings** and `CORS_ORIGINS` if you changed ports or host. |

---

## License

See [LICENSE](LICENSE).
