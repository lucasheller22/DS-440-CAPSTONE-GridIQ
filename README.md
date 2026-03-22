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
- **AI:** OpenAI API (key required for chat features)
- **Data:** NFL play-by-play dataset(s), normalized for querying/analytics

---

## Getting started (local dev)

### Prerequisites
- **Node.js 18+** (recommended: 20+)
- **Python 3.10+**
- An **OpenAI API key** (for any AI-backed endpoints)

### 1) Clone
```bash
git clone https://github.com/lucasheller22/DS-440-CAPSTONE-GridIQ.git
cd DS-440-CAPSTONE-GridIQ
