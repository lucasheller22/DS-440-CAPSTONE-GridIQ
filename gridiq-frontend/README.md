# GridIQ Frontend Starter (Vite + React + TS)

This is a front-end starter framework for **GridIQ**: an assistant coach UI with a football dashboard + chat interface.

## Requirements
- Node.js 18+ (recommended 20)
- VSCode (recommended extensions: ESLint, Prettier, Tailwind CSS IntelliSense)

## Quickstart
```bash
cd gridiq-frontend
npm install
npm run dev
```

Open http://localhost:5173

## Where to build next
- `src/pages/Chat.tsx` — threaded chat UI + streaming placeholder
- `src/pages/Dashboard.tsx` — team/game filters + insight cards
- `src/pages/Playbook.tsx` — play visualizer (SVG field) + route concepts
- `src/lib/api/` — API client + endpoints (swap to your backend when ready)

## Env
Create `.env` with:
```bash
VITE_API_BASE_URL=http://localhost:8080
```

> **Offline/login note**  The frontend is currently hard‑wired to use
> the mock API layer; you don’t need a backend to register or log in.
> The `useMocks()` helper in `src/lib/api/endpoints.ts` always returns
> `true`, so the app works without network access.  (Previously you could
> toggle this with `VITE_USE_MOCKS` or a localStorage flag.)

## Tech decisions
- React Router for routing
- TanStack Query for server state / caching
- Zustand for lightweight app state (auth, UI)
- Zod for runtime validation of API payloads
- Tailwind for styling
