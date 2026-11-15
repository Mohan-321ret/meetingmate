# JW Meeting Assistant - Production Troubleshooting & Operational Runbook

## 1. Quick Diagnostic Checklist

When experiencing issues, run through this rapid diagnostic checklist:

```bash
# 1. Is the service running?
sudo systemctl status jw-meetingmate.service

# 2. Is Tailscale connected and operational?
tailscale status

# 3. Does the health endpoint respond locally?
curl -s http://localhost:8000/api/v1/health | jq

# 4. Are there any errors in the systemd journal?
journalctl -u jw-meetingmate.service -n 50 --no-pager
```

---

## 2. Common Issues & Solutions

### Issue 1: Mobile App Cannot Connect to Backend ("Offline / Connecting...")

**Symptoms:**
- The mobile app displays an offline badge or network timeout error in Settings.
- Requests to `http://100.x.y.z:8000` fail.

**Root Causes & Resolution:**
1. **Tailscale Disconnected:**
   - Verify Tailscale is active on both the phone and the server:
     ```bash
     tailscale status
     tailscale ping 100.x.y.z
     ```
2. **Firewall Blocking Port 8000:**
   - Verify UFW allows traffic on `tailscale0`:
     ```bash
     sudo ufw status verbose
     sudo ufw allow in on tailscale0 to any port 8000 proto tcp
     ```
3. **Server Binding to 127.0.0.1 Instead of 0.0.0.0:**
   - Check `.env` setting: `HOST=0.0.0.0` or `HOST=100.x.y.z`. If set to `127.0.0.1`, external devices on the mesh cannot connect.

---

### Issue 2: SQLite "Database Is Locked" (`OperationalError`)

**Symptoms:**
- API returns HTTP 500 with `sqlite3.OperationalError: database is locked`.

**Root Causes & Resolution:**
1. **WAL Mode Disabled:**
   - Verify WAL mode is active:
     ```bash
     sqlite3 /opt/jw-meetingmate/backend/data/app.db "PRAGMA journal_mode;"
     ```
     Should return `wal`. If it returns `delete`, run:
     ```bash
     sqlite3 /opt/jw-meetingmate/backend/data/app.db "PRAGMA journal_mode=WAL;"
     ```
2. **Long-Running Transactions:**
   - Increase busy timeout in `.env`: `SQLITE_BUSY_TIMEOUT_MS=10000` (10 seconds).
3. **Orphaned File Handles:**
   - Check for stalled Python processes:
     ```bash
     lsof /opt/jw-meetingmate/backend/data/app.db
     ```

---

### Issue 3: Groq LLM Generation Failures & Timeouts

**Symptoms:**
- Answers return fallback responses or errors: `Groq API Error: Rate limit reached` or `APITimeoutError`.

**Root Causes & Resolution:**
1. **Missing or Invalid API Key:**
   - Verify `GROQ_API_KEY` in `.env` starts with `gsk_` and has no trailing spaces.
2. **Groq Cloud Rate Limiting:**
   - Groq provides generous free tier quotas, but continuous high-frequency requests can trigger a 60-second cooldown.
   - The backend rate limiter (`RATE_LIMIT_PER_MINUTE=60`) automatically protects your Groq quota.
3. **Network Connectivity from Server:**
   - Test external HTTPS connectivity:
     ```bash
     curl -I https://api.groq.com/openai/v1/models
     ```

---

### Issue 4: HTTP 413 "Payload Too Large" on Document Upload

**Symptoms:**
- Uploading a meeting workbook or Watchtower PDF returns `413 Payload Too Large`.

**Root Causes & Resolution:**
- The default upload size cap is **15 MB**.
- If uploading large multi-issue PDF volumes, increase `MAX_UPLOAD_SIZE_MB` in `/opt/jw-meetingmate/backend/.env`:
  ```ini
  MAX_UPLOAD_SIZE_MB=25
  ```
- Restart the service:
  ```bash
  sudo systemctl restart jw-meetingmate.service
  ```

---

### Issue 5: ChromaDB Index Inconsistency or Corruption

**Symptoms:**
- Semantic search returns 0 results or `chromadb.errors.ChromaError`.

**Root Causes & Resolution:**
1. **Re-index a Specific Document:**
   - Use the API endpoint `POST /api/v1/knowledge/documents/{id}/reindex` to re-parse and re-embed.
2. **Full Vector Rebuild:**
   - Stop the backend service:
     ```bash
     sudo systemctl stop jw-meetingmate.service
     ```
   - Move corrupted chroma data directory aside:
     ```bash
     mv /opt/jw-meetingmate/backend/data/chroma /tmp/chroma_corrupted_$(date +%s)
     ```
   - Restart service (ChromaDB will automatically initialize an empty collection):
     ```bash
     sudo systemctl start jw-meetingmate.service
     ```
   - Re-ingest reference documents.

---

## 3. Log Analysis & Monitoring

View real-time structured logs from the backend:

```bash
# Follow live logs
journalctl -u jw-meetingmate.service -f

# View errors only
journalctl -u jw-meetingmate.service -p err -n 100

# View Gunicorn access log
tail -f /var/log/jw-meetingmate/access.log
```
