# JW Meeting Assistant - Backend Architecture & Technical Design

## 1. Executive Summary

**JW Meeting Assistant** is a private, family-centric mobile application and backend service designed to assist family members in preparing spoken, conversational Tamil answers for congregation meetings.

The backend is built as a **Modular Monolith** using **Python 3.11+**, **FastAPI**, **SQLite** (primary relational store in WAL mode), **ChromaDB** (embedded vector database), and **Groq Cloud API** (high-speed inference for Llama 3.3).

The service is intentionally architected for **private home-server deployment over a Tailscale mesh network**. It is not exposed directly to the public internet, requiring no complex public authentication UI while providing enterprise-grade security and reliability.

---

## 2. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Clients["Clients & Presentation Tier"]
        RN["React Native / Expo Mobile App<br/>(Android / iOS)"]
        ADMIN["Private Admin / Monitoring Node<br/>(Family Laptop / CLI)"]
    end

    subgraph Network["Security Perimeter & Private Network"]
        TS["Tailscale Private Mesh Network<br/>(Encrypted WireGuard Tunnel 100.x.y.z)"]
        SEC["Security & Rate Limit Middleware<br/>- Payload size cap (2MB JSON / 15MB upload)<br/>- Sliding window rate limiter (60 rpm)<br/>- Path traversal & Magic byte validation<br/>- Optional Family Key Token Verification"]
    end

    subgraph Backend["FastAPI Modular Monolith Core"]
        ROUTERS["API Routing Layer (/api/v1)<br/>- /meetings & /questions<br/>- /answers & /search<br/>- /knowledge & /history<br/>- /saved-answers & /health"]
        SERVICES["Core Domain Services<br/>- AnswerGeneratorService<br/>- RetrievalEngine (RAG)<br/>- IngestionService (PDF/TXT)<br/>- GroqService (Async Llama 3.3)"]
    end

    subgraph DataStore["Persistence Tier (Local NVMe/SSD)"]
        SQLITE[("SQLite Database<br/>app.db (WAL Mode)<br/>Relational Entities & History")]
        CHROMA[("ChromaDB Vector Store<br/>Local Persistent Storage<br/>Cosine Embedding Collections")]
    end

    subgraph External["External Services"]
        GROQ["Groq Cloud API<br/>llama-3.3-70b-versatile<br/>(Encrypted TLS over HTTPS)"]
    end

    RN -->|Encrypted Mesh| TS
    ADMIN -->|Encrypted Mesh| TS
    TS --> SEC
    SEC --> ROUTERS
    ROUTERS --> SERVICES
    SERVICES --> SQLITE
    SERVICES --> CHROMA
    SERVICES --> GROQ
```

---

## 3. Component Architecture & Directory Structure

The backend adheres strictly to modular separation of concerns:

```
backend/
├── app/
│   ├── api/
│   │   └── routes/              # FastAPI APIRouter endpoints
│   │       ├── api.py           # Centralized router registry
│   │       ├── meetings.py      # Midweek and Weekend meeting endpoints
│   │       ├── questions.py     # Meeting section questions & reordering
│   │       ├── answers.py       # Meeting and independent question answer generation
│   │       ├── knowledge.py     # Document upload & text ingestion
│   │       ├── search.py        # Semantic vector search
│   │       ├── saved_answers.py # Curated family answers & personal notes
│   │       ├── history.py       # Search history & query logs
│   │       └── health.py        # System readiness & dependency probes
│   ├── core/                    # Core infrastructural settings
│   │   ├── config.py            # Pydantic Settings & environment variables
│   │   ├── exceptions.py        # Centralized exception handlers & error schemas
│   │   ├── logging.py           # Structured logging configuration
│   │   └── security.py          # Security, rate limiter, and validation middleware
│   ├── database/                # Database engine and ORM mappings
│   │   ├── connection.py        # SQLite engine, connection pool, WAL pragmas
│   │   └── crud.py              # Centralized transactional CRUD helpers
│   ├── models/                  # SQLAlchemy ORM declarative models
│   │   ├── meeting.py           # Meetings table
│   │   ├── question.py          # Questions table
│   │   ├── answer.py            # Generated answers table
│   │   ├── knowledge.py         # Ingested publications metadata
│   │   ├── saved_answer.py      # Family curated saved answers
│   │   ├── search.py            # Search query history
│   │   └── enums.py             # Meeting types, source categories, answer formats
│   ├── schemas/                 # Pydantic validation schemas (DTOs)
│   ├── services/                # Business logic and domain pipelines
│   │   ├── answer_generator.py  # Master RAG generation orchestrator
│   │   ├── retrieval.py         # Multi-lingual vector retrieval & deduplication
│   │   ├── ingestion.py         # PDF/TXT extraction, cleaning & chunking
│   │   ├── vector_store.py      # ChromaDB persistent client wrapper
│   │   ├── llm.py               # Groq LLM client with fallback handling
│   │   └── prompts.py           # Spoken conversational Tamil prompt templates
│   └── main.py                  # Application factory and lifespan manager
├── data/                        # Persistent local data
│   ├── app.db                   # SQLite primary database
│   └── chroma/                  # ChromaDB vector index files
├── deploy/                      # Production deployment artifacts
│   ├── jw-meetingmate.service   # Linux systemd hardened service
│   ├── gunicorn.conf.py         # Gunicorn process manager configuration
│   ├── backup.sh                # Automated backup script (WAL safe)
│   ├── restore.sh               # Automated disaster recovery restore script
│   └── logrotate.conf           # System log rotation policy
├── docs/                        # Complete technical documentation
└── tests/                       # Pytest automated test suite (106 tests)
```

---

## 4. End-to-End Data Flows

### A. RAG Answer Generation Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User as Family Member (App)
    participant API as FastAPI Router
    participant Orchestrator as AnswerGeneratorService
    participant Retriever as RetrievalEngine
    participant Chroma as ChromaDB Vector Store
    participant SQLite as SQLite (app.db)
    participant Groq as Groq API (Llama 3.3)

    User->>API: POST /api/v1/answers/generate {question, answer_type: "short"}
    API->>Orchestrator: generate_answer(question, answer_type, language="ta")
    Orchestrator->>Retriever: retrieve_context(question, top_k=4)
    Retriever->>Retriever: Normalize Tamil/English query
    Retriever->>Chroma: query_similar(query_text, n_results=4)
    Chroma-->>Retriever: Relevant document chunks with cosine distances
    Retriever->>Retriever: Filter relevance threshold & deduplicate chunks
    Retriever-->>Orchestrator: List of relevant chunks + source references
    Orchestrator->>Orchestrator: Construct system & user prompts (Spoken Tamil)
    Orchestrator->>Groq: generate_chat_completion_async(prompts, context)
    Groq-->>Orchestrator: Conversational Tamil Answer (Spoken format)
    Orchestrator->>SQLite: Record query & generated answer in search_history
    SQLite-->>Orchestrator: Saved history record
    Orchestrator-->>API: Answer + Sources + Metadata
    API-->>User: 200 OK {answer, sources, answer_type: "short"}
```

### B. Document Knowledge Ingestion Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin / User
    participant API as FastAPI Router (/knowledge/ingest)
    participant Sec as Security Validation
    participant Ingest as IngestionService
    participant Chroma as ChromaDB
    participant SQLite as SQLite (app.db)

    Admin->>API: POST /knowledge/ingest (multipart: file, title, source_type)
    API->>Sec: validate_file_upload(filename, file_bytes)
    Sec->>Sec: Sanitize filename & verify magic bytes (%PDF- or clean text)
    Sec-->>API: Validated bytes & sanitized filename
    API->>Ingest: ingest(db, title, source_type, file_bytes, filename)
    Ingest->>Ingest: Extract text page-by-page (pypdf or UTF-8 decode)
    Ingest->>Ingest: Clean formatting & remove extra whitespace
    Ingest->>Ingest: Split text into paragraph-aware chunks (200-500 words)
    Ingest->>SQLite: Insert knowledge_documents record (status: 'indexing')
    Ingest->>Chroma: upsert(chunk_ids, chunk_texts, metadatas)
    Chroma-->>Ingest: Chunks indexed
    Ingest->>SQLite: Update status: 'indexed'
    Ingest-->>API: Ingest summary (document_id, chunk_count)
    API-->>Admin: 201 Created {document, chunks_created: N}
```

---

## 5. Security & Isolation Perimeter

1. **Private Tailscale Mesh**:
   The server binds to `0.0.0.0` or directly to the Tailscale IP (`100.x.y.z`). It does not listen on public IPv4 addresses, avoiding public internet attack vectors and DDoS attempts.
2. **Rate Limiting**:
   In-memory sliding window limiter (default: 60 requests/minute per client IP) prevents runaway client retry loops and preserves Groq Cloud API tier limits.
3. **Payload Protection**:
   JSON payloads are capped at 2MB; file uploads are capped at 15MB. Oversized payloads are dropped with HTTP 413 without reading them into system RAM.
4. **Filesystem Defense**:
   Filenames are scrubbed against path traversal attempts (`../`, `..\`, null bytes). Magic bytes are verified before document extraction.
5. **No Credential Leakage**:
   In production (`APP_DEBUG=false`), unhandled exceptions return a standardized JSON error message without exposing database schema details, file paths, or stack traces.
6. **Optional Device Authorization**:
   `ENABLE_FAMILY_KEY_CHECK=true` requires all incoming requests to supply `X-Family-Token` or `X-API-Key`.
