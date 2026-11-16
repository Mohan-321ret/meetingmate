# JW Meeting Assistant - REST API Reference

## 1. Overview & Base URL

All endpoints are versioned and mounted under `/api/v1`:

```
Base URL: http://<tailscale-ip>:8000/api/v1
Interactive Docs: http://<tailscale-ip>:8000/docs
OpenAPI JSON: http://<tailscale-ip>:8000/openapi.json
```

---

## 2. Standard Headers & Error Format

### Request Headers
| Header | Type | Description |
|---|---|---|
| `Content-Type` | `string` | `application/json` (or `multipart/form-data` for file ingestion) |
| `X-Family-Token` | `string` | *(Optional)* Family device authorization token if `ENABLE_FAMILY_KEY_CHECK=true` |

### Response Security & Rate Limit Headers
| Header | Description |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-RateLimit-Limit` | Maximum allowable requests per minute (e.g. `60`) |
| `X-RateLimit-Remaining` | Remaining request quota in the current window |
| `X-RateLimit-Reset` | Seconds until rate limit quota resets |

### Standard Error Schema
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable localized error message.",
    "details": {}
  }
}
```

---

## 3. Endpoints Reference

### 3.1 System & Health

#### `GET /api/v1/health`
Returns backend health status, database connection state, and vector database readiness.
- **Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "jw-meetingmate-backend",
  "app_name": "JW Meeting Assistant API",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2026-11-15T13:50:00Z",
  "database": "connected",
  "vector_db": "ready"
}
```

---

### 3.2 Meetings (`/api/v1/meetings`)

#### `POST /api/v1/meetings/sync-jw`
Automatically fetches the current week's Midweek (*Our Christian Life and Ministry* workbook) and Weekend (*The Watchtower* study article) meetings and questions from `jw.org`, stores them in SQLite, and indexes lesson paragraphs into ChromaDB for immediate RAG answer generation.
- **Query Parameters:**
  - `target_date` (optional): `YYYY-MM-DD` (defaults to current date; automatically aligns to Monday-Sunday week)
  - `language` (default: `ta`): `ta` (Tamil) | `en` (English)
  - `force_refresh` (default: `false`): `true` to overwrite existing meeting data
- **Response (200 OK):**
```json
{
  "success": true,
  "week_label": "நவம்பர் 16-22, 2026",
  "target_date": "2026-11-18",
  "midweek_meeting": { ... },
  "weekend_meeting": { ... },
  "total_questions_created": 15,
  "chroma_chunks_indexed": 4,
  "source_urls": ["https://www.jw.org/ta/library/..."],
  "message": "Successfully synced meetings and indexed lesson chunks."
}
```

#### `GET /api/v1/meetings/current-week`
Retrieves active Midweek and Weekend meetings with all attached questions for the current week, automatically syncing from JW.org if not yet present in SQLite.
- **Query Parameters:**
  - `language` (default: `ta`): `ta` | `en`
  - `auto_sync` (default: `true`): Boolean
- **Response (200 OK):** Current week meetings and structured questions.

#### `GET /api/v1/meetings`
List scheduled meetings.
- **Query Parameters:**
  - `meeting_type` (optional): `midweek` | `weekend`
  - `meeting_date` (optional): `YYYY-MM-DD`
  - `skip` (default: 0): pagination offset
  - `limit` (default: 50): pagination limit
- **Response (200 OK):** Array of meeting objects.

#### `POST /api/v1/meetings`
Create a new meeting.
- **Request Body:**
```json
{
  "meeting_type": "midweek",
  "meeting_date": "2026-11-18T19:00:00Z",
  "title": "கிறிஸ்தவ வாழ்க்கை மற்றும் ஊழியக் கூட்டம்",
  "description": "வாராந்திர ஆவிக்குரிய கூட்ட குறிப்புகள்"
}
```

#### `GET /api/v1/meetings/{id}`
Retrieve a meeting by ID with all its associated questions ordered by `display_order`.

#### `PUT /api/v1/meetings/{id}`
Update meeting attributes.

#### `DELETE /api/v1/meetings/{id}`
Delete a meeting and cascade delete all its questions and answers.

---

### 3.3 Questions (`/api/v1/questions` & `/api/v1/meetings/{id}/questions`)

#### `GET /api/v1/meetings/{id}/questions`
Get all questions for a specific meeting, ordered by `display_order`.

#### `POST /api/v1/meetings/{id}/questions`
Add a question to a meeting.
- **Request Body:**
```json
{
  "section": "பைபிள் புதையல்கள்",
  "question_text": "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?",
  "paragraph_reference": "பத்தி 3-4",
  "display_order": 1
}
```

#### `POST /api/v1/meetings/{id}/questions/reorder`
Reorder questions in a meeting.
- **Request Body:** Array of strings `["question-id-1", "question-id-2", ...]`

---

### 3.4 AI Answer Generation (`/api/v1/answers`)

#### `POST /api/v1/answers/generate`
Generate a conversational Tamil answer using retrieved reference context from ChromaDB.
- **Request Body:**
```json
{
  "question": "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?",
  "question_id": "optional-uuid",
  "answer_type": "short",
  "language": "ta"
}
```
- **Response (200 OK):**
```json
{
  "question": "இயேசு ஏன் கடவுளிடம் ஜெபித்தார்?",
  "answer": "இயேசு கடவுளிடம் ஜெபித்ததற்கு முக்கிய காரணம், அவர் பரிபூரண மனிதராக வாழ்ந்தபோதிலும் தன் பரலோகத் தந்தையை முழுமையாகச் சார்ந்திருந்தார் என்பதைக் காட்டவே. இதன் மூலம் நமக்குத் தாழ்மையையும் கீழ்ப்படிதலையும் கற்றுக்கொடுத்தார்.",
  "answer_type": "short",
  "language": "ta",
  "sources": [
    {
      "document_id": "doc-uuid",
      "title": "இயேசுவின் முன்மாதிரியான ஜெப வாழ்க்கை",
      "source_type": "watchtower",
      "source_url": "https://www.jw.org/...",
      "paragraph_reference": "பத்தி 3",
      "relevance_score": 0.92
    }
  ]
}
```

#### `POST /api/v1/answers/independent`
Ask an independent question outside scheduled meeting materials. Executes the same high-precision RAG pipeline and logs to search history.

---

### 3.5 Semantic Search (`/api/v1/search`)

#### `POST /api/v1/search`
Query ChromaDB vector embeddings for semantically relevant chunks across ingested publications.
- **Request Body:**
```json
{
  "query": "கவலைகளை சமாளிக்க பைபிள் ஆலோசனை",
  "top_k": 5,
  "source_type": "awake",
  "language": "ta"
}
```

---

### 3.6 Knowledge Ingestion (`/api/v1/knowledge`)

#### `POST /api/v1/knowledge/ingest`
Upload and index a document file (`.pdf` or `.txt`) into ChromaDB.
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `file`: binary upload
  - `title`: `string`
  - `source_type`: `watchtower` | `awake` | `meeting_workbook` | `bible` | `manual` | `other`
  - `language`: `ta` | `en`
  - `source_url`: *(optional)*

#### `POST /api/v1/knowledge/ingest-text`
Ingest raw text content directly into the vector database.

#### `GET /api/v1/knowledge/documents`
List indexed documents with chunk counts.

#### `DELETE /api/v1/knowledge/documents/{id}`
Deletes document record from SQLite and purges associated chunks from ChromaDB.

---

### 3.7 Saved Answers & Notes (`/api/v1/saved-answers`)

#### `GET /api/v1/saved-answers`
List all saved answers for family members.

#### `POST /api/v1/saved-answers`
Save a generated answer with personalized custom title and family notes.

#### `PUT /api/v1/saved-answers/{id}`
Update custom notes or title.

#### `DELETE /api/v1/saved-answers/{id}`
Delete a saved answer.

---

### 3.8 Search History (`/api/v1/history`)

#### `GET /api/v1/history`
Retrieve past questions and answers.

#### `DELETE /api/v1/history/{id}`
Delete a specific history entry.

#### `DELETE /api/v1/history`
Clear all history entries.
