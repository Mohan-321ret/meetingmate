# JW Meeting Assistant – Backend Service

Lightweight modular monolithic backend service built with Python 3.11+, FastAPI, SQLite (SQLAlchemy + Alembic), and ChromaDB to power the JW Meeting Assistant Android mobile application.

---

## 🏛️ Architecture Overview

The backend uses a **Modular Monolithic** design:
- **FastAPI**: Asynchronous high-performance REST framework with automatic OpenAPI/Swagger documentation.
- **SQLite (SQLAlchemy ORM + Alembic)**: Embedded transactional database for storing meeting schedules, questions, crafted answers, personal study notes, knowledge document metadata, and search queries.
- **ChromaDB**: Embedded vector database for semantic search, publication context retrieval, and AI vector embeddings (handled in subsequent phases).
- **Groq API**: High-speed LLM inference gateway for meeting answer drafting and scripture reasoning (configured for future phases).
- **Pydantic v2 & Pydantic-Settings**: Type-safe schema validation, data serialization, and centralized environment variable loading.

```
backend/
├── alembic/                          # Alembic database migrations
│   ├── versions/
│   │   └── 66b43ce829c5_initial_schema.py   # Applied initial schema migration
│   └── env.py                        # Migration environment configuration
├── app/
│   ├── main.py                       # Application entry point, lifespan, CORS, and middleware
│   ├── core/
│   │   ├── config.py                 # Pydantic-Settings central configuration & .env loading
│   │   ├── logging.py                # Structured logger with timestamp, level, and caller info
│   │   └── exceptions.py             # Custom AppException hierarchy and centralized handlers
│   ├── api/
│   │   └── routes/
│   │       ├── api.py                # Aggregated API v1 router
│   │       ├── health.py             # Health check route (/api/v1/health)
│   │       ├── meetings.py           # Meeting Management routes (/api/v1/meetings)
│   │       ├── questions.py          # Question Management routes (/api/v1/meetings/{id}/questions, /api/v1/questions)
│   │       ├── knowledge.py          # Knowledge Ingestion routes (/api/v1/knowledge)
│   │       ├── search.py             # Semantic Search & RAG Retrieval routes (/api/v1/search)
│   │       ├── answers.py            # AI Answer Generation & Answers CRUD (/api/v1/answers)
│   │       ├── history.py            # Search & Question History routes (/api/v1/history)
│   │       └── saved_answers.py      # Saved Answers & Family Notes routes (/api/v1/saved-answers)
│   ├── database/
│   │   ├── connection.py             # SQLAlchemy SQLite engine, sessions, foreign key PRAGMA & init
│   │   └── crud.py                   # Decoupled repository layer for database CRUD operations
│   ├── models/                       # SQLAlchemy database models
│   │   ├── enums.py                  # MeetingType, AnswerType, DocumentStatus, SourceType
│   │   ├── meeting.py                # Meeting entity
│   │   ├── question.py               # Question entity
│   │   ├── answer.py                 # Answer entity
│   │   ├── knowledge.py              # KnowledgeDocument entity
│   │   ├── search.py                 # SearchHistory entity
│   │   └── saved_answer.py           # SavedAnswer entity
│   ├── schemas/                      # Pydantic request/response schemas
│   │   ├── health.py                 # Health response schema
│   │   ├── meeting.py                # Meeting create/update/response/detail schemas
│   │   ├── question.py               # Question create/update/response/reorder schemas
│   │   ├── answer.py                 # Answer create/update/response & AI generation schemas
│   │   ├── knowledge.py              # KnowledgeDocument create/update/response/detail/list schemas
│   │   ├── search.py                 # SearchRequest/Response and SearchHistory schemas
│   │   └── saved_answer.py           # SavedAnswer create/update/response schemas
│   ├── services/                     # Domain business logic & external clients
│   │   ├── vector_store.py           # Persistent ChromaDB vector database manager
│   │   ├── ingestion.py              # Extraction, cleaning, chunking & ingestion pipeline
│   │   ├── retrieval.py              # Semantic RAG search & hybrid lexical re-ranking
│   │   ├── llm.py                    # Groq API client with async, timeout & rate-limit handling
│   │   ├── prompts.py                # Separated system/user prompt engineering templates
│   │   └── answer_generator.py       # End-to-end RAG answer synthesis orchestrator
│   └── utils/                        # Common helper utilities
├── data/
│   ├── app.db                        # SQLite database file (git-ignored)
│   └── chroma/                       # Persistent Chroma vector store files
├── tests/
│   ├── conftest.py                   # Pytest fixtures and test client
│   ├── test_health.py                # Health check and endpoint test suite
│   ├── test_crud.py                  # Database CRUD and cascading integrity test suite
│   ├── test_schemas.py               # Pydantic schema validation test suite
│   ├── test_api_meetings.py          # Meeting Management API tests
│   ├── test_api_questions.py         # Question Management API tests
│   ├── test_knowledge_ingestion.py   # Knowledge Ingestion and Vector Store tests
│   ├── test_rag_search.py            # Semantic Search and RAG Retrieval tests
│   ├── test_answer_generation.py     # AI Answer Generation (15 questions & Groq mock tests)
│   └── test_phase7_features.py       # Saved Answers, History, Independent & Meeting-Specific tests
├── alembic.ini                       # Alembic migration configuration
├── .env.example                      # Example environment variables
├── .env                              # Local environment settings (git-ignored)
├── .gitignore                        # Backend git ignore rules
├── requirements.txt                  # Core dependencies
└── README.md                         # Documentation
```

---

## 📡 REST API Reference (Phase 3 – Meetings & Questions)

### 1. Meeting Management (`/api/v1/meetings`)

| Method | Endpoint | Description | Query Parameters | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/v1/meetings` | Create a new meeting | None | `201 Created`, `422 Unprocessable` |
| `GET` | `/api/v1/meetings` | List all meetings | `meeting_type`, `date` (YYYY-MM-DD), `skip`, `limit` | `200 OK` |
| `GET` | `/api/v1/meetings/{id}` | Get meeting details with questions | None | `200 OK`, `404 Not Found` |
| `PUT` | `/api/v1/meetings/{id}` | Update meeting details | None | `200 OK`, `404 Not Found`, `422 Unprocessable` |
| `DELETE`| `/api/v1/meetings/{id}` | Delete meeting (cascades to questions & answers) | None | `200 OK`, `404 Not Found` |

#### Sample Request: `POST /api/v1/meetings`
```json
{
  "meeting_type": "midweek",
  "meeting_date": "2026-11-18T19:00:00Z",
  "title": "கிறிஸ்தவ வாழ்க்கையும் ஊழியமும்",
  "description": "நடுவாரக் கூட்டம் - லேவியராகமம் 1-4"
}
```

#### Sample Response: `201 Created`
```json
{
  "id": "e98e7275-8025-4c07-8e50-f8faee15a45b",
  "meeting_type": "midweek",
  "meeting_date": "2026-11-18T19:00:00Z",
  "title": "கிறிஸ்தவ வாழ்க்கையும் ஊழியமும்",
  "description": "நடுவாரக் கூட்டம் - லேவியராகமம் 1-4",
  "question_count": 0,
  "created_at": "2026-11-15T07:20:00Z",
  "updated_at": "2026-11-15T07:20:00Z"
}
```

---

### 2. Question Management (`/api/v1/meetings/{id}/questions` & `/api/v1/questions`)

| Method | Endpoint | Description | Query Parameters | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/v1/meetings/{id}/questions` | List questions for a meeting | `section` | `200 OK`, `404 Not Found` |
| `POST` | `/api/v1/meetings/{id}/questions` | Add question to meeting | None | `201 Created`, `404 Not Found`, `422 Unprocessable` |
| `PUT` | `/api/v1/meetings/{id}/questions/reorder` | Reorder questions in meeting | None | `200 OK`, `404 Not Found`, `422 Unprocessable` |
| `GET` | `/api/v1/questions/{id}` | Get individual question | None | `200 OK`, `404 Not Found` |
| `PUT` | `/api/v1/questions/{id}` | Update question text/section/order | None | `200 OK`, `404 Not Found`, `422 Unprocessable` |
| `DELETE`| `/api/v1/questions/{id}` | Delete individual question | None | `200 OK`, `404 Not Found` |

#### Sample Request: `POST /api/v1/meetings/{id}/questions`
```json
{
  "section": "treasures",
  "question_text": "லேவியராகமம் 1:3-ல் இருந்து நாம் என்ன கற்றுக்கொள்ளலாம்?",
  "paragraph_reference": "பாரா 3",
  "display_order": 1
}
```

#### Sample Response: `201 Created`
```json
{
  "id": "31278148-739c-4993-9d41-471249b6574f",
  "meeting_id": "e98e7275-8025-4c07-8e50-f8faee15a45b",
  "section": "treasures",
  "question_text": "லேவியராகமம் 1:3-ல் இருந்து நாம் என்ன கற்றுக்கொள்ளலாம்?",
  "paragraph_reference": "பாரா 3",
  "display_order": 1,
  "created_at": "2026-11-15T07:22:00Z"
}
```

#### Sample Request: `PUT /api/v1/meetings/{id}/questions/reorder`
```json
{
  "items": [
    { "id": "31278148-739c-4993-9d41-471249b6574f", "display_order": 2 },
    { "id": "539e9921-1b9a-4f51-b016-9214731bb3a2", "display_order": 1 }
  ]
}
```

---

### 3. Knowledge Management & Document Ingestion (`/api/v1/knowledge`)

| Method | Endpoint | Description | Payload / Parameters | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/v1/knowledge/ingest` | Upload and ingest document file (.pdf, .txt) | Multipart Form: `file`, `title`, `source_type`, `source_url`, `language` | `201 Created`, `400 Bad Request`, `422 Unprocessable` |
| `POST` | `/api/v1/knowledge/ingest-text` | Ingest raw text directly into vector database | JSON: `title`, `content`, `source_type`, `source_url`, `language` | `201 Created`, `422 Unprocessable` |
| `GET` | `/api/v1/knowledge/documents` | List indexed documents with chunk counts | `source_type`, `language`, `document_status`, `skip`, `limit` | `200 OK` |
| `GET` | `/api/v1/knowledge/documents/{id}` | Get document metadata and chunk stats | None | `200 OK`, `404 Not Found` |
| `DELETE`| `/api/v1/knowledge/documents/{id}` | Delete document and purge vector chunks from ChromaDB | None | `200 OK`, `404 Not Found` |

#### Sample Request: `POST /api/v1/knowledge/ingest-text`
```json
{
  "title": "காவற்கோபுரம் படிப்பு - நவம்பர் 2026",
  "content": "யெகோவாவிடம் உங்கள் பாரத்தை இறக்கிவையுங்கள். அவர் உங்களை ஆதரிப்பார். நீதிமானை ஒருபோதும் தள்ளாடவிடமாட்டார்.\n\nநாம் ஜெபம் செய்யும்போது யெகோவா நம்முடைய மனவேதனையைக் கேட்கிறார். அவர் நமக்குத் தேவையான தெய்வீக சமாதானத்தை அருளுகிறார்.",
  "source_type": "watchtower",
  "source_url": "https://www.jw.org/ta/library/magazines/w202611/trust-in-jehovah/",
  "language": "ta"
}
```

#### Sample Response: `201 Created`
```json
{
  "document": {
    "title": "காவற்கோபுரம் படிப்பு - நவம்பர் 2026",
    "source_type": "watchtower",
    "source_url": "https://www.jw.org/ta/library/magazines/w202611/trust-in-jehovah/",
    "language": "ta",
    "document_status": "indexed",
    "id": "c1f7a85e-9908-410a-8b89-f53eec0dbb5a",
    "created_at": "2026-11-15T07:35:00Z",
    "chunk_count": 2
  },
  "chunks_created": 2,
  "message": "Successfully ingested and indexed text document 'காவற்கோபுரம் படிப்பு - நவம்பர் 2026' with 2 chunks."
}
```

#### Sample Request: `POST /api/v1/knowledge/ingest` (Multipart/form-data)
```
POST /api/v1/knowledge/ingest HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="sample_study.pdf"
Content-Type: application/pdf

<binary content>
------WebKitFormBoundary
Content-Disposition: form-data; name="title"

பைபிள் கற்பிப்புகள் வழிகாட்டி
------WebKitFormBoundary
Content-Disposition: form-data; name="source_type"

bible
------WebKitFormBoundary
Content-Disposition: form-data; name="language"

ta
------WebKitFormBoundary--
```

---

### 4. Semantic Search & RAG Retrieval Engine (`/api/v1/search`)

| Method | Endpoint | Description | Payload / Parameters | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/v1/search` | Execute semantic vector search with hybrid lexical ranking | JSON: `query`, `top_k`, `source_type`, `language`, `min_score` | `200 OK`, `422 Unprocessable` |

#### Sample Request: `POST /api/v1/search`
```json
{
  "query": "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?",
  "top_k": 3,
  "source_type": "watchtower",
  "language": "ta"
}
```

#### Sample Response: `200 OK`
```json
{
  "query": "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?",
  "results": [
    {
      "chunk_id": "c1f7a85e-9908-410a-8b89-f53eec0dbb5a_c1",
      "content": "இயேசு பூமியில் வாழ்ந்தபோது தம்முடைய பரலோகத் தந்தையிடம் தவறாமல் ஜெபம் செய்தார். அவர் பரிபூரண மனிதராக இருந்தபோதிலும், கடவுளுடைய வழிநடத்துதலுக்காகவும் பலத்திற்காகவும் அவரை முழுமையாகச் சார்ந்திருந்தார். ஜெபம் செய்வதன் மூலம் அவர் தாழ்மையைக் காட்டினார், மற்றும் தம்முடைய தந்தையிடம் உள்ள ஆழ்ந்த அன்பை வெளிப்படுத்தினார்.",
      "source_title": "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?",
      "source_url": "https://www.jw.org/ta/library/magazines/w202601/why-jesus-prayed/",
      "relevance_score": 0.8924,
      "page_number": 1,
      "paragraph_reference": "Page 1, para 1",
      "source_type": "watchtower",
      "language": "ta"
    }
  ],
  "total_results": 1
}
```

---

### 5. AI Answer Generation Using Groq (`/api/v1/answers`)

| Method | Endpoint | Description | Payload / Parameters | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/v1/answers/generate` | Generate natural conversational Tamil answer via RAG & Groq | JSON: `question`, `answer_type` (short/detailed), `language`, `question_id`, `save_answer` | `200 OK`, `422 Unprocessable`, `502 Bad Gateway`, `504 Timeout` |
| `POST` | `/api/v1/answers` | Manually store/create answer | JSON: `question_id`, `answer_text`, `answer_type` | `201 Created`, `404 Not Found`, `422 Unprocessable` |
| `GET` | `/api/v1/answers/{id}` | Retrieve answer details by ID | None | `200 OK`, `404 Not Found` |
| `PUT` | `/api/v1/answers/{id}` | Update answer text/type | JSON: `answer_text`, `answer_type` | `200 OK`, `404 Not Found`, `422 Unprocessable` |
| `DELETE`| `/api/v1/answers/{id}` | Delete answer from database | None | `200 OK`, `404 Not Found` |

#### Sample Request: `POST /api/v1/answers/generate` (Short Answer)
```json
{
  "question": "இயேசு ஏன் ஜெபித்தார்?",
  "answer_type": "short",
  "language": "ta"
}
```

#### Sample Response: `200 OK`
```json
{
  "answer": "இயேசு பூமியில் வாழ்ந்தபோது தம்முடைய பரலோகத் தந்தையிடம் தவறாமல் ஜெபம் செய்தார். அவர் பரிபூரண மனிதராக இருந்தபோதிலும், கடவுளுடைய வழிநடத்துதலுக்காகவும் பலத்திற்காகவும் அவரை முழுமையாகச் சார்ந்திருந்தார்.",
  "sources": [
    {
      "source_title": "இயேசுவின் முன்மாதிரியான ஜெப வாழ்க்கை",
      "source_url": "https://www.jw.org/ta/library/magazines/w202601/jesus-prayer-life/",
      "paragraph_reference": "பாரா 1",
      "content_snippet": "இயேசு பூமியில் வாழ்ந்தபோது தம்முடைய பரலோகத் தந்தையிடம் தவறாமல் ஜெபம் செய்தார்...",
      "relevance_score": 0.9124,
      "source_type": "watchtower",
      "page_number": 1
    }
  ],
  "answer_type": "short",
  "model_used": "llama-3.3-70b-versatile",
  "saved_answer_id": null
}
```

---

### 6. Search & Question History (`/api/v1/history`)

| Method | Endpoint | Description | Query / Parameters | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/v1/history` | List recent questions and generated answers | `skip`, `limit` | `200 OK` |
| `GET` | `/api/v1/history/{id}` | Retrieve individual history record with parsed sources | None | `200 OK`, `404 Not Found` |
| `DELETE`| `/api/v1/history/{id}` | Delete a single history record | None | `200 OK`, `404 Not Found` |
| `DELETE`| `/api/v1/history` | Clear all recorded search history | None | `200 OK` |

#### Sample Response: `GET /api/v1/history`
```json
[
  {
    "id": "7b0a70f5-bc50-48e0-a7d1-0a68a5c37463",
    "query": "விசுவாசம் என்றால் என்ன?",
    "answer": "விசுவாசம் என்பது காணப்படாத காரியங்களின் நிச்சயமான நம்பிக்கையாக இருக்கிறது...",
    "answer_type": "short",
    "created_at": "2026-11-15T12:45:00Z",
    "sources": [
      {
        "source_title": "சுயாதீன கேள்விகள் மற்றும் விசுவாசம்",
        "source_url": "https://www.jw.org/ta/library/faith-and-trials/",
        "relevance_score": 0.8924
      }
    ]
  }
]
```

---

### 7. Saved Answers & Family Notes (`/api/v1/saved-answers`)

| Method | Endpoint | Description | Payload / Parameters | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/v1/saved-answers` | Save an answer with custom title and study notes | JSON: `answer_id` (or `answer_text`), `custom_title`, `notes` | `201 Created`, `404 Not Found`, `422 Unprocessable` |
| `GET` | `/api/v1/saved-answers` | List all saved answers with joined meeting info | `question_id`, `skip`, `limit` | `200 OK` |
| `GET` | `/api/v1/saved-answers/{id}` | Retrieve single saved answer with full meeting context | None | `200 OK`, `404 Not Found` |
| `PUT` | `/api/v1/saved-answers/{id}` | Update personal notes, custom title, or answer text | JSON: `custom_title`, `notes`, `answer_text` | `200 OK`, `404 Not Found` |
| `DELETE`| `/api/v1/saved-answers/{id}` | Remove saved answer | None | `200 OK`, `404 Not Found` |

#### Sample Request: `POST /api/v1/saved-answers`
```json
{
  "answer_id": "87e35b71-d68a-49ae-a9ec-0466beaaec64",
  "custom_title": "என் சபை பதில் - எபிரெயர் 11:1",
  "notes": "கூட்டத்தில் பேசும்போது எபிரெயர் 11:1-ஐக் குறிப்பிட்டுப் பேசவும்."
}
```

#### Sample Response: `201 Created`
```json
{
  "id": "93b4a2d8-5ec8-45be-bb3d-c11f42d9921c",
  "answer_id": "87e35b71-d68a-49ae-a9ec-0466beaaec64",
  "custom_title": "என் சபை பதில் - எபிரெயர் 11:1",
  "notes": "கூட்டத்தில் பேசும்போது எபிரெயர் 11:1-ஐக் குறிப்பிட்டுப் பேசவும்.",
  "created_at": "2026-11-15T12:46:00Z",
  "answer_text": "விசுவாசம் என்பது காணப்படாத காரியங்களின் நிச்சயமான நம்பிக்கையாக இருக்கிறது.",
  "answer_type": "short",
  "question_id": "e98e7275-8025-4c07-8e50-f8faee15a45b",
  "meeting_id": "31278148-739c-4993-9d41-471249b6574f",
  "meeting_title": "விசுவாசம் குறித்த ஆய்வு கூட்டம்",
  "question_text": "எபிரெயர் 11:1-ன்படி விசுவாசம் எவ்வாறு விவரிக்கப்படுகிறது?",
  "paragraph_reference": "பாரா 2",
  "sources": []
}
```

---

## 🗄️ Database Design & Models (Phase 2)

### Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────┐
│            meetings             │
├─────────────────────────────────┤
│ id (PK, String 36, UUID)        │
│ meeting_type (String 20)        │
│ meeting_date (DateTime)         │
│ title (String 255)              │
│ description (Text, nullable)    │
│ created_at (DateTime UTC)       │
│ updated_at (DateTime UTC)       │
└────────────────┬────────────────┘
                 │ 1
                 │
                 │ N (ondelete CASCADE)
┌────────────────▼────────────────┐
│           questions             │
├─────────────────────────────────┤
│ id (PK, String 36, UUID)        │
│ meeting_id (FK -> meetings.id)  │
│ section (String 100)            │
│ question_text (Text)            │
│ paragraph_reference (String)    │
│ display_order (Integer)         │
│ created_at (DateTime UTC)       │
└────────────────┬────────────────┘
                 │ 1
                 │
                 │ N (ondelete CASCADE)
┌────────────────▼────────────────┐
│            answers              │
├─────────────────────────────────┤
│ id (PK, String 36, UUID)        │
│ question_id (FK -> questions.id)│  (nullable for independent answers)
│ answer_text (Text)              │
│ answer_type (String 50)         │
│ created_at (DateTime UTC)       │
│ updated_at (DateTime UTC)       │
└────────────────┬────────────────┘
                 │ 1
                 │
                 │ N (ondelete CASCADE)
┌────────────────▼────────────────┐
│         saved_answers           │
├─────────────────────────────────┤
│ id (PK, String 36, UUID)        │
│ answer_id (FK -> answers.id)    │
│ custom_title (String 255)       │
│ notes (Text, nullable)          │
│ created_at (DateTime UTC)       │
└─────────────────────────────────┘

┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│       knowledge_documents       │       │         search_history          │
├─────────────────────────────────┤       ├─────────────────────────────────┤
│ id (PK, String 36, UUID)        │       │ id (PK, String 36, UUID)        │
│ title (String 255)              │       │ query (Text)                    │
│ source_type (String 50)         │       │ answer (Text)                   │
│ source_url (String 1024)        │       │ created_at (DateTime UTC)       │
│ language (String 10, default ta)│       └─────────────────────────────────┘
│ document_status (String 30)     │
│ created_at (DateTime UTC)       │
└─────────────────────────────────┘
```

---

## 🔄 Database Migrations (Alembic)

```bash
cd backend
# Apply pending migrations
.\.venv\Scripts\alembic upgrade head

# Generate a new migration
.\.venv\Scripts\alembic revision --autogenerate -m "describe_changes"

# Rollback last migration
.\.venv\Scripts\alembic downgrade -1
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` if not already created:

```bash
cp .env.example .env
```

Key environment variables:
| Variable | Default | Purpose |
|---|---|---|
| `APP_NAME` | `JW Meeting Assistant API` | Application name |
| `APP_ENV` | `development` | Running environment |
| `APP_DEBUG` | `true` | Debug flag |
| `API_V1_PREFIX` | `/api/v1` | URL prefix for version 1 API |
| `HOST` | `0.0.0.0` | Listen host |
| `PORT` | `8000` | Listen port |
| `ALLOWED_ORIGINS`| `*` | Allowed CORS origins for Expo/React Native |
| `DATABASE_URL` | `sqlite:///./data/app.db` | Primary SQLite database path |
| `CHROMA_PERSIST_DIRECTORY` | `./data/chroma` | Vector database persistent directory |
| `GROQ_API_KEY` | *(blank)* | Groq API key for LLM generation |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Model name for Groq inference |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

---

## 🚀 Running the Application

### 1. Start the Development Server

From the `backend/` directory:
```bash
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Running the Test Suite

Run all automated unit, integration, and API tests with Pytest:

```bash
cd backend
.\.venv\Scripts\python -m pytest -v
```

Current test suite covers **85 automated tests**:
- **Meeting Management API Tests** (`test_api_meetings.py`):
  - `test_create_meeting_success`: Midweek & weekend creation.
  - `test_create_meeting_invalid_type`: Pydantic validation (422).
  - `test_list_meetings_and_filtering`: Filtering by type and date.
  - `test_get_meeting_by_id`: Retrieves meeting with questions array.
  - `test_get_meeting_not_found`: 404 error formatting.
  - `test_update_meeting`: Field updates.
  - `test_delete_meeting`: Cascading removal.
- **Question Management API Tests** (`test_api_questions.py`):
  - `test_add_questions_to_meeting`: Auto-incrementing display order.
  - `test_add_question_to_non_existent_meeting`: 404 validation.
  - `test_list_meeting_questions_and_filtering`: Section filter and ordering.
  - `test_reorder_questions`: Dynamic display order reordering.
  - `test_get_individual_question`: Single question retrieval.
  - `test_update_individual_question`: Question prompt text update.
  - `test_delete_individual_question`: Question removal.
- **Knowledge Ingestion & Vector Store Tests** (`test_knowledge_ingestion.py`):
  - `test_ingest_raw_text_success`: Text payload extraction, chunking, and ChromaDB indexing.
  - `test_ingest_txt_file_success`: Multipart plain text document file ingestion.
  - `test_ingest_pdf_file_success`: Multi-page PDF extraction and page-aware chunking.
  - `test_ingest_unsupported_file_extension`: Rejection of unsupported formats (.exe, .py).
  - `test_ingest_empty_file`: 0-byte file handling.
  - `test_ingest_empty_text_content`: Whitespace-only text validation.
  - `test_list_documents_filtering`: Source type, language, status filtering and pagination.
  - `test_reindex_existing_document`: Document re-indexing without duplicate creation.
  - `test_delete_document_and_cascade_chroma`: Cascading purge from SQLite and ChromaDB.
  - `test_delete_non_existent_document`: 404 handling.
  - `test_chroma_persistence_across_instances`: Vector persistence across client restarts.
  - `test_semantic_search_query_similar`: Cosine semantic similarity search on chunks.
- **Semantic Search & RAG Retrieval Tests** (`test_rag_search.py`):
  - `test_search_tamil_question`: Natural language Tamil search with verbatim reference matching.
  - `test_search_english_question`: English query retrieval with accurate score mapping.
  - `test_search_mixed_tamil_english_question`: Code-switched / bilingual query comprehension.
  - `test_search_source_type_filter`: Strict metadata filtering by publication type.
  - `test_search_language_filter`: Language code filtering ('ta', 'en').
  - `test_search_configurable_top_k`: Respects configurable top_k limits.
  - `test_search_min_score_threshold`: Quality threshold filtering weak semantic matches.
  - `test_search_deduplication`: Deduplicates near-identical chunks.
  - `test_search_empty_query_validation`: Rejection of empty/blank query payloads (422).
  - `test_search_invalid_source_type_validation`: Validation error on invalid source category (422).
  - `test_search_no_answer_generation`: Strict separation of retrieval from answer generation.
  - `test_search_excludes_deleted_document`: Automatic exclusion of chunks belonging to deleted documents.
- **AI Answer Generation Tests** (`test_answer_generation.py`):
  - `test_generate_answer_fifteen_questions`: Comprehensive evaluation across 15 distinct Tamil meeting questions for conversational Tamil quality, non-empty response, and valid source references.
  - `test_short_answer_conciseness`: Direct, 20–40s spoken answers (~35–65 words).
  - `test_detailed_answer_explanation`: Deeper spiritual reasoning for 45–90s spoken answers.
  - `test_insufficient_context_handling`: Honest, non-hallucinating fallback when knowledge base lacks supporting content.
  - `test_save_generated_answer_to_sqlite`: Optional persistence of crafted answers linked to questions.
  - `test_groq_async_client_mock_invocation`: AsyncGroq invocation with prompt templates, tokens, and temperature.
  - `test_validation_empty_question`: Rejection of blank questions (422).
- **Saved Answers, History & Independent Questions Tests** (`test_phase7_features.py`):
  - `test_saved_answers_lifecycle`: Save, list, view, update, and delete saved answers with custom titles & notes.
  - `test_saved_answer_direct_creation_without_preexisting_id`: Direct creation and persistence of answers without prior ID.
  - `test_saved_answer_validation_error`: Validation check rejecting empty answer attachments.
  - `test_search_history_lifecycle`: Automatic history logging, retrieval with parsed sources, single deletion, and full history clearing.
  - `test_independent_question_generation`: Asking general questions outside meeting agendas via the RAG pipeline.
  - `test_meeting_specific_answer_relationship`: Preserving Meeting -> Question -> Answer -> Sources relational hierarchy in SQLite.
- **Database CRUD & Cascading Tests** (`test_crud.py`):
  - Meeting, Question, Answer, Knowledge Document, Search History, Saved Answer lifecycle.
  - Cascading deletion across SQLite foreign keys.
- **System Health & Schema Tests** (`test_health.py`, `test_schemas.py`):
  - Health check ping, CORS headers, Pydantic type validation.
  - Meeting, Question, Answer, Knowledge Document, Search History, Saved Answer lifecycle.
  - Cascading deletion across SQLite foreign keys.
- **System Health & Schema Tests** (`test_health.py`, `test_schemas.py`):
  - Health check ping, CORS headers, Pydantic type validation.
