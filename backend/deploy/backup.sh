#!/usr/bin/env bash
# ==============================================================================
# JW Meeting Assistant - Automated Production Backup Script
# Backs up SQLite database (WAL safe via .backup) and ChromaDB vector store.
# Retention: 7 days.
# ==============================================================================

set -euo pipefail

# Configuration
APP_DIR="${APP_DIR:-/opt/jw-meetingmate/backend}"
DATA_DIR="${APP_DIR}/data"
DB_FILE="${DATA_DIR}/app.db"
CHROMA_DIR="${DATA_DIR}/chroma"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/jw-meetingmate}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7

BACKUP_DEST="${BACKUP_ROOT}/${TIMESTAMP}"
mkdir -p "${BACKUP_DEST}"

echo "=========================================================="
echo " Starting JW Meeting Assistant Backup: ${TIMESTAMP}"
echo " App Directory: ${APP_DIR}"
echo " Destination:   ${BACKUP_DEST}"
echo "=========================================================="

# 1. Online SQLite Backup (Atomic and WAL-safe using sqlite3 .backup)
if [ -f "${DB_FILE}" ]; then
    echo "[1/3] Performing atomic SQLite backup..."
    sqlite3 "${DB_FILE}" ".backup '${BACKUP_DEST}/app.db'"
    echo "  -> SQLite database backed up to: ${BACKUP_DEST}/app.db"
else
    echo "  -> WARNING: Database file ${DB_FILE} not found. Skipping DB backup."
fi

# 2. ChromaDB Vector Store Snapshot
if [ -d "${CHROMA_DIR}" ]; then
    echo "[2/3] Archiving ChromaDB vector database directory..."
    tar -czf "${BACKUP_DEST}/chroma.tar.gz" -C "${DATA_DIR}" chroma
    echo "  -> ChromaDB snapshot archived to: ${BACKUP_DEST}/chroma.tar.gz"
else
    echo "  -> WARNING: ChromaDB directory ${CHROMA_DIR} not found. Skipping Chroma backup."
fi

# 3. Create Backup Manifest
echo "[3/3] Generating backup manifest..."
cat <<EOF > "${BACKUP_DEST}/manifest.json"
{
  "timestamp": "${TIMESTAMP}",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "app_version": "1.0.0",
  "db_backup": "app.db",
  "chroma_backup": "chroma.tar.gz",
  "db_size_bytes": $(stat -c%s "${BACKUP_DEST}/app.db" 2>/dev/null || echo 0),
  "chroma_tar_bytes": $(stat -c%s "${BACKUP_DEST}/chroma.tar.gz" 2>/dev/null || echo 0)
}
EOF
echo "  -> Manifest written: ${BACKUP_DEST}/manifest.json"

# 4. Enforce Retention Policy (Purge backups older than 7 days)
echo "Enforcing ${RETENTION_DAYS}-day backup retention..."
find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d -mtime +"${RETENTION_DAYS}" -exec rm -rf {} +
echo "Retention purge complete."

echo "=========================================================="
echo " Backup successfully completed at $(date)"
echo " Archive location: ${BACKUP_DEST}"
echo "=========================================================="
