# JW Meeting Assistant - Developer Setup & Local Environment Guide

## 1. Prerequisites

Before installing the backend, ensure your workstation has:
- **Python 3.11 or higher** (`python --version`)
- **Git** (`git --version`)
- **Node.js 18+ & npm** (for the React Native frontend)
- A free **Groq Cloud API Key** from [console.groq.com](https://console.groq.com/keys)

---

## 2. Step-by-Step Backend Setup

### Step 1: Clone Repository & Navigate to Backend
```bash
git clone <repository-url> MeetingMate
cd MeetingMate/backend
```

### Step 2: Create and Activate Virtual Environment

**On Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**On Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Step 3: Install Essential Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables
Copy the development template to `.env`:
```bash
cp .env.example .env   # Or create .env based on the template below
```

**Sample `.env` for Local Development:**
```ini
APP_NAME="JW Meeting Assistant API"
APP_ENV=development
APP_DEBUG=true
APP_VERSION=1.0.0
API_V1_PREFIX=/api/v1

HOST=0.0.0.0
PORT=8000
ALLOWED_ORIGINS=*

DATABASE_URL=sqlite:///./data/app.db
SQLITE_WAL_MODE=true
SQLITE_BUSY_TIMEOUT_MS=5000

CHROMA_PERSIST_DIRECTORY=./data/chroma
CHROMA_ANONYMIZED_TELEMETRY=false

GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TIMEOUT=30.0

MAX_UPLOAD_SIZE_MB=15
MAX_REQUEST_BODY_SIZE_MB=2
RATE_LIMIT_PER_MINUTE=60
ENABLE_FAMILY_KEY_CHECK=false

LOG_LEVEL=INFO
```

---

## 3. Starting the Development Server

Run the development server with auto-reload:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Output:
```
[INFO] Starting JW Meeting Assistant API v1.0.0 [development]
[INFO] Database initialized successfully: sqlite:///d:/MeetingMate/backend/data/app.db
[INFO] Vector DB directory verified at: d:\MeetingMate\backend\data\chroma
[INFO] Application startup sequence completed successfully.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## 4. Verifying Installation

### 1. Health Probe
```bash
curl http://localhost:8000/api/v1/health
```
Expected output:
```json
{
  "status": "healthy",
  "service": "jw-meetingmate-backend",
  "app_name": "JW Meeting Assistant API",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-11-15T14:00:00Z",
  "database": "connected",
  "vector_db": "ready"
}
```

### 2. Interactive API Documentation
Open your browser to:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## 5. Running Automated Tests

Run the complete 106-test automated suite using pytest:

```bash
pytest -v
```

Run specific test modules:
```bash
pytest -v tests/test_health.py
pytest -v tests/test_crud.py
pytest -v tests/test_answer_generation.py
pytest -v tests/test_phase9_security_production.py
```
