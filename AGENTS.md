# JW Meeting Assistant - Project Architecture & Agent Instructions

This repository is structured as a clean Monorepo containing:
- **`frontend/`**: React Native / Expo mobile application (SDK 58, Expo Router, TypeScript).
- **`backend/`**: Python 3.11+ FastAPI modular monolith with SQLite (WAL mode), ChromaDB vector store, and Groq LLM integration.

Prioritize mobile-first patterns, performance, and cross-platform compatibility.

---

## Folder Structure

```
MeetingMate/
├── frontend/                     # React Native / Expo Mobile Application
│   ├── assets/                   # App icons, splash screens, and images
│   ├── scripts/                  # Frontend test & reset scripts
│   ├── src/
│   │   ├── app/                  # Expo Router screens and navigators (_layout.tsx)
│   │   ├── components/           # Reusable UI components
│   │   ├── constants/            # Theme, color palettes, sample meeting data
│   │   ├── context/              # React context providers
│   │   ├── data/                 # Local offline cache & seed data
│   │   ├── services/             # Centralized ApiClient & Domain API Services
│   │   └── types/                # TypeScript interface definitions
│   ├── app.json                  # Expo application configuration & plugins
│   ├── eas.json                  # EAS cloud build & submit profiles
│   ├── eslint.config.js          # ESLint flat configuration (Expo)
│   ├── package.json              # Frontend dependencies and scripts
│   └── tsconfig.json             # TypeScript configuration & path aliases (@/*)
├── backend/                      # Python FastAPI REST Backend Service
│   ├── app/                      # Application modular monolithic source code
│   │   ├── api/routes/           # FastAPI APIRouter endpoint definitions
│   │   ├── core/                 # Settings, exceptions, logging, security middleware
│   │   ├── database/             # SQLite connection, WAL pragmas, CRUD layer
│   │   ├── models/               # SQLAlchemy ORM declarative models
│   │   ├── schemas/              # Pydantic DTO request/response schemas
│   │   ├── services/             # Answer generator, RAG retrieval, ingestion, Groq LLM
│   │   └── main.py               # FastAPI application factory and lifespan manager
│   ├── data/                     # Local persistent storage (app.db, chroma/)
│   ├── deploy/                   # Systemd service, Gunicorn config, backup/restore scripts
│   ├── docs/                     # Comprehensive architectural & operational guides
│   ├── tests/                    # Pytest test suite (106 tests)
│   ├── requirements.txt          # Python dependencies
│   ├── .env                      # Local development environment configuration
│   └── .env.production.example   # Production configuration template
├── package.json                  # Root monorepo script runner
├── README.md                     # Project overview and quickstart guide
└── AGENTS.md                     # Development rules and commands
```

---

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `frontend/package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

---

## Commands

Run from the root or appropriate directory:

### Root Monorepo Commands
```bash
npm run frontend:start      # Start Expo development server (frontend)
npm run frontend:lint       # Run ESLint on frontend
npm run frontend:typecheck  # Run TypeScript typecheck on frontend
npm run frontend:test       # Run frontend API client test suite
npm run backend:dev         # Start FastAPI backend server with reload
npm run backend:test        # Run pytest backend test suite
npm run test                # Run all frontend and backend tests
```

### Direct Frontend Commands (inside `frontend/`)
Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).
```bash
cd frontend
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # Start the dev server
npx expo lint               # Lint
npx tsc --noEmit            # Typecheck
npx expo-doctor             # Diagnose dependency and config issues
npx expo install --fix      # Fix incompatible package versions
```

Always run lint and typecheck before declaring any frontend task done.

### Direct Backend Commands (inside `backend/`)
```bash
cd backend
.\.venv\Scripts\Activate.ps1       # On Windows PowerShell (or source .venv/bin/activate on Linux)
uvicorn app.main:app --reload      # Start development server
pytest -v                          # Run test suite
```

---

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `frontend/src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

---

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

---

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `frontend/app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
