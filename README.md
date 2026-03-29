# GridIQ (DS 440 Capstone)

GridIQ is an **AI assistant coach for American football**. The goal is to help players, coaches, and fans **learn concepts, evaluate situations, and consult on game plans** through a conversational interface, backed by football data and a dashboard for visualizing plays/schemes.

---

## What this repo contains

- **`gridiq-frontend/`** — Front-end web app (React + TypeScript, Vite-based project structure).
- **`gridiq-backend/`** — Back-end services/API (Python-based components).
- **`.vite/`** — Vite build artifacts / cached deps (generated).
- **`.gitignore`** — Git ignore rules.

> Repo is early-stage: expect rapid changes as the capstone progresses.

---

## Key capabilities (target)

- **Chat-first “assistant coach” experience**
  - Ask questions about football concepts, schemes, and situational decisions
  - Conversational flow with structured responses (and eventually citations/links to supporting data)
- **Football dashboard**
  - Team/game views
  - Filters & charts to explore plays and outcomes
- **Data foundation**
  - Play-by-play data (historically using nflverse / NFL pbp back to 1999)

---

## Tech stack (current + intended)

- **Frontend:** React + TypeScript + Vite
- **Backend:** Python services + REST API (expanding toward an API gateway and data layer)
- **AI:** Google Gemini (API key for live chat)
- **Data:** NFL play-by-play dataset(s), normalized for querying/analytics

---

## Backend API Architecture

### Database Schema (Step 2.2)

The backend implements a comprehensive database schema with the following models:

**Core Models:**
- **Users** — User accounts with authentication
- **Conversations** — Chat conversation threads with timestamps
- **Messages** — Individual messages (user/assistant) with AI metadata
- **Games** — NFL game data (teams, scores, dates, stadiums)
- **Plays** — Play-by-play records with advanced metrics (EPA, WPA, air yards, etc.)
- **Cache** — Performance optimization layer with TTL expiration

### REST API Endpoints (Step 2.3)

**Authentication:**
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login and get JWT token

**Chat & Conversations:**
- `POST /api/chat/conversations` — Create new conversation
- `GET /api/chat/conversations` — List user's conversations
- `GET /api/chat/conversations/{id}` — Get conversation with message history
- `PUT /api/chat/conversations/{id}` — Update conversation title
- `DELETE /api/chat/conversations/{id}` — Delete conversation
- `POST /api/chat/chat` — Send message & get AI coach response (with NFL data context)

**Games & Plays:**
- `GET /api/games/games` — List games (with season/week/team filters)
- `GET /api/games/games/{id}` — Get game details with all plays
- `GET /api/games/plays` — List plays (with filtering)
- `GET /api/games/plays/{id}` — Get specific play details
- `GET /api/games/plays/team/{team}/stats` — Get team offensive/defensive statistics
- `POST /api/games/sync/games` — Sync NFL games from nflverse
- `POST /api/games/sync/plays` — Sync play-by-play data from nflverse

**Cache Management:**
- `POST /api/cache/cache` — Set cache entry with TTL
- `GET /api/cache/{key}` — Get cached value
- `DELETE /api/cache/{key}` — Delete cache entry
- `DELETE /api/cache` — Clear all cache
- `POST /api/cache/cleanup` — Remove expired entries

### Key Features

✅ **AI Football Coach** — Gemini with football-focused prompting  
✅ **NFL Data Integration** — Real play-by-play data from nflverse (1999-present)  
✅ **Conversation Memory** — Store and retrieve full chat history  
✅ **Advanced Metrics** — EPA, WPA, air yards, yards-after-catch  
✅ **Team Analytics** — Aggregate offensive/defensive performance data  
✅ **Performance Caching** — TTL-based caching for frequently accessed data  
✅ **User Isolation** — Conversations scoped to authenticated users  
✅ **OpenAPI Documentation** — Auto-generated API docs at `/docs`

---

## Getting started (local dev)

### Prerequisites
- **Node.js 18+** (recommended: 20+)
- **Python 3.10+**
- A **Gemini** API key (for live AI chat)
- Optional: **PostgreSQL** (or configured database via `DATABASE_URL`). Local SQLite works by default.

### Environment Setup

Create a `.env` file in `gridiq-backend/` with:
```
ENV=dev
DATABASE_URL=sqlite:///./gridiq.db
JWT_SECRET=your-secret-key-here
GEMINI_API_KEY=your-gemini-api-key-here
```

### 1) Clone
```bash
git clone https://github.com/lucasheller22/DS-440-CAPSTONE-GridIQ.git
cd DS-440-CAPSTONE-GridIQ
```

### 2) Backend Setup

Navigate to the backend directory:
```bash
cd gridiq-backend
```

Create `.env` from the example and edit values:
```bash
copy .env.example .env  # Windows PowerShell
# or cp .env.example .env # macOS/Linux
```

Required keys in `.env`:
- `DATABASE_URL` (default local dev: `sqlite:///./gridiq.db`)
- `JWT_SECRET` (choose a strong secret)
- `JWT_ALG=HS256`
- `ACCESS_TOKEN_MINUTES=30`
- `GEMINI_API_KEY` (required for live chat; Google Gemini)
- `CORS_ORIGINS` (optional CSV of allowed frontend origins)
- `ENV=dev`

Install dependencies:
```bash
pip install -r requirements.txt
```

Run migrations (requires DB available):
```bash
python -m alembic upgrade head
```

If you don't have a DB yet, one quick way is Docker Compose:
```bash
docker compose up -d
```

Run the backend server (you must be inside `gridiq-backend`, not the monorepo root):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

If you see **`ModuleNotFoundError: No module named 'app'`**, you started uvicorn from the wrong directory. Either `cd gridiq-backend` first, or from the repo root run **`.\run-backend.ps1`** (PowerShell) or **`run-backend.bat`** (cmd).

The API will be available at `http://localhost:8000` with auto-generated docs at `/docs`.

### 3) Frontend Setup

Navigate to the frontend directory:
```bash
cd ../gridiq-frontend
```

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 4) Connect Frontend to Backend

Update the API endpoint in `gridiq-frontend/src/lib/api/client.ts`:
```typescript
const API_BASE = "http://localhost:8000";
```

---

## Usage

### Registering & Logging In

1. Navigate to the frontend at `http://localhost:5173`
2. Click "Register" to create a new account
3. Login with your credentials
4. You'll receive a JWT token for authenticated requests

### Using the Chat Feature

1. After login, navigate to the Chat page
2. Send a message to the AI football coach
3. The AI will analyze real NFL data and provide insights
4. View your conversation history in the sidebar

### Syncing NFL Data

To populate the database with NFL games and plays:

**Sync games for 2023 season:**
```bash
curl -X POST "http://localhost:8000/api/games/sync/games?season=2023" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Sync plays for 2023 season:**
```bash
curl -X POST "http://localhost:8000/api/games/sync/plays?season=2023" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### API Examples

**Create a conversation:**
```bash
curl -X POST "http://localhost:8000/api/chat/conversations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "2023 Strategy"}'
```

**Send a chat message:**
```bash
curl -X POST "http://localhost:8000/api/chat/chat" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conversation_id": "conv_xxx", "message": "How should I defend against the pass?"}'
```

**Get team statistics:**
```bash
curl -X GET "http://localhost:8000/api/games/plays/team/KC/stats?season=2023" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Project Structure

```
gridiq-backend/
├── app/
│   ├── main.py              # FastAPI app initialization
│   ├── api/
│   │   ├── routes/          # API endpoints
│   │   │   ├── auth.py      # Authentication
│   │   │   ├── chat.py      # Chat & conversations
│   │   │   ├── games.py     # NFL data & plays
│   │   │   ├── cache.py     # Cache operations
│   │   │   └── users.py     # User management
│   │   └── deps.py          # Dependencies
│   ├── models/              # Database models
│   │   ├── user.py
│   │   ├── conversation.py
│   │   ├── game.py
│   │   └── cache.py
│   ├── schemas/             # Pydantic schemas for validation
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── conversation.py
│   │   ├── game.py
│   │   └── cache.py
│   └── core/
│       ├── config.py        # Settings & configuration
│       ├── db.py            # Database connection
│       └── security.py      # Password hashing, JWT
├── requirements.txt         # Python dependencies
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose setup
└── .env                    # Environment variables

gridiq-frontend/
├── src/
│   ├── pages/              # Page components
│   ├── components/         # Reusable UI components
│   ├── stores/             # State management
│   ├── lib/
│   │   └── api/            # API client & endpoints
│   └── App.tsx             # Main app component
├── package.json
└── vite.config.ts
```

## Technologies

**Backend:**
- **FastAPI** — Modern Python web framework
- **SQLAlchemy 2.0** — ORM for database operations
- **Pydantic** — Data validation and serialization
- **PostgreSQL** — Relational database
- **Google Gemini** — AI coach responses
- **nflverse** — NFL data source (1999-present)

**Frontend:**
- **React 18+** — UI library
- **TypeScript** — Type safety
- **Vite** — Build tool & dev server
- **Tailwind CSS** — Styling
- **React Router** — Navigation

---

## Environment Variables

### Backend (`gridiq-backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/gridiq` |
| `JWT_SECRET` | Secret key for signing JWTs | `super-secret-key` |
| `GEMINI_API_KEY` | Gemini API key | `AIza...` |
| `GEMINI_MODEL` | Gemini model id | `gemini-2.5-flash` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173,http://127.0.0.1:5173` |
| `ENV` | Environment mode | `dev` or `prod` |

---

## Development Notes

- The backend automatically creates database tables on startup
- All API endpoints require JWT authentication (except `/api/auth/register` and `/api/auth/login`)
- Chat messages are stored with full history for context
- NFL data is cached to optimize performance
- Each user's conversations are isolated and secure

---

## Support & Troubleshooting

**Backend won't start:**
- Ensure PostgreSQL is running
- Check `.env` file is configured correctly
- Verify database connection: `psql postgresql://user:password@localhost:5432/gridiq`

**AI chat not responding:**
- Set **`GEMINI_API_KEY`** in `gridiq-backend/.env`, then restart uvicorn
- If it is empty, chat returns setup instructions instead of football answers

**Frontend can't connect to backend:**
- Ensure backend is running on `http://localhost:8000`
- Check browser console for CORS errors
- Verify API endpoint in frontend config

---

## License

See [LICENSE](LICENSE) file for details.
