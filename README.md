# JW Meeting Assistant (MeetingMate)

**JW Meeting Assistant** is a comprehensive, private family assistant application designed to aid family members in studying, preparing, and giving natural, conversational spoken answers in Tamil for congregation meetings (Midweek and Weekend meetings).

The repository is organized as a clean **Monorepo** separating the cross-platform mobile frontend and the high-performance Python FastAPI backend.

---

## 📁 Repository Structure

```
MeetingMate/
├── frontend/                     # React Native & Expo Mobile Client (Android & iOS)
│   ├── assets/                   # App icons, splash screens, and images
│   ├── scripts/                  # Frontend test & reset scripts
│   ├── src/
│   │   ├── app/                  # Expo Router file-based screens & navigators
│   │   ├── components/           # Reusable UI components & cards
│   │   ├── constants/            # Theme, styling tokens, and sample meeting data
│   │   ├── context/              # React Context state management
│   │   ├── data/                 # Local offline cache & seed data
│   │   ├── services/             # Centralized ApiClient & Domain API Services
│   │   └── types/                # TypeScript interface definitions
│   ├── app.json                  # Expo config & CNG plugins
│   ├── eas.json                  # EAS Build & Submit configurations
│   ├── eslint.config.js          # ESLint flat config
│   ├── package.json              # Frontend dependencies & scripts
│   └── tsconfig.json             # TypeScript config & path aliases (@/*)
│
├── backend/                      # Python FastAPI Modular Monolith REST Service
│   ├── app/                      # Application source code
│   │   ├── api/routes/           # Versioned API routes (/api/v1)
│   │   ├── core/                 # Config, security middleware, rate limiter, logging
│   │   ├── database/             # SQLite connection, WAL mode, CRUD helpers
│   │   ├── models/               # SQLAlchemy ORM declarative models
│   │   ├── schemas/              # Pydantic validation schemas (DTOs)
│   │   ├── services/             # Answer generator, RAG retrieval, ingestion, Groq
│   │   └── main.py               # Application factory & lifespan manager
│   ├── data/                     # Persistent storage (SQLite app.db, ChromaDB vector store)
│   ├── deploy/                   # Systemd service, Gunicorn config, backup & restore scripts
│   ├── docs/                     # Architectural, schema, deployment & recovery documentation
│   ├── tests/                    # Pytest test suite (106 tests, 100% pass rate)
│   ├── requirements.txt          # Python dependencies
│   ├── .env                      # Local development environment configuration
│   └── .env.production.example   # Production environment template
│
├── package.json                  # Root monorepo script runner
├── .gitignore                    # Comprehensive multi-language ignore rules
├── AGENTS.md                     # Agent development guidelines & conventions
└── README.md                     # Project overview and quickstart
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js 18+** & npm
- **Python 3.11+**
- (Optional) **Tailscale** for secure private family networking

---

### 2. Running the Backend

```bash
cd backend

# Setup Python virtual environment
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux / macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --reload --port 8000
```

- API Base: `http://localhost:8000/api/v1`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/v1/health`

---

### 3. Running the Frontend (Mobile App)

```bash
cd frontend

# Install dependencies
npm install

# Start Expo dev server
npx expo start
```

Press `a` for Android Emulator, `i` for iOS Simulator, or scan the QR code with **Expo Go**.

In the app's **Settings Screen**, enter your backend host URL (e.g. `http://localhost:8000` or Tailscale IP `http://100.x.y.z:8000`) and tap **Test Backend Connection**.

---

## 🛠️ Root Monorepo Commands

You can execute common workflows directly from the project root:

| Command | Action |
|---|---|
| `npm run frontend:start` | Start Expo development server |
| `npm run frontend:lint` | Run ESLint on frontend (`expo lint`) |
| `npm run frontend:typecheck` | Run TypeScript typecheck on frontend (`tsc --noEmit`) |
| `npm run frontend:test` | Run frontend API client unit tests |
| `npm run backend:dev` | Start FastAPI backend server with reload |
| `npm run backend:test` | Run Pytest backend test suite |
| `npm run test` | Run complete frontend & backend test suites |

---

## 🔒 Security & Architecture Highlights

- **Private Mesh Networking:** Designed to run privately over **Tailscale** (`100.x.y.z`) without public router port forwarding.
- **RAG Intelligence:** Retrieves relevant reference paragraphs from ChromaDB before generating conversational Tamil answers via Groq (Llama 3.3).
- **SQLite Performance:** WAL mode (`PRAGMA journal_mode=WAL`), normal synchronous mode, and a 64 MB in-memory cache ensure high concurrency across multiple family devices.
- **Zero Credential Leaks:** Stack traces and internal paths are masked in production mode (`APP_DEBUG=false`).
- **Rate & Size Limiting:** In-memory sliding-window limiter (60 rpm) protects Groq Cloud quotas, while 2 MB JSON and 15 MB upload size limits prevent memory exhaustion.
- **Automated Backup & Restore:** WAL-safe atomic SQLite snapshots and ChromaDB tarballs with 7-day automated retention management.

For full architectural, database, deployment, and troubleshooting details, see [backend/docs/](file:///d:/MeetingMate/backend/docs/).
