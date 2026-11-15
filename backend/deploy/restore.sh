#!/usr/bin/env bash
# ==============================================================================
# JW Meeting Assistant - Automated Production Restore Script
# Restores SQLite database and ChromaDB vector store from a backup timestamp.
# Usage: ./restore.sh [TIMESTAMP]
# Example: ./restore.sh 20261115_180000
# ==============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/jw-meetingmate/backend}"
DATA_DIR="${APP_DIR}/data"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/jw-meetingmate}"

# Determine backup directory
if [ $# -ge 1 ]; then
    BACKUP_SRC="${BACKUP_ROOT}/$1"
else
    # Find most recent backup directory
    BACKUP_SRC=$(find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d | sort -r | head -n 1)
fi

if [ -z "${BACKUP_SRC}" ] || [ ! -d "${BACKUP_SRC}" ]; then
    echo "ERROR: Backup directory '${BACKUP_SRC:-}' not found."
    echo "Usage: $0 [TIMESTAMP_DIR]"
    exit 1
fi

echo "=========================================================="
echo " JW Meeting Assistant Disaster Recovery Restore"
echo " Restoring from: ${BACKUP_SRC}"
echo " Target app dir: ${APP_DIR}"
echo " Target data:    ${DATA_DIR}"
echo "=========================================================="

# 1. Stop backend service if running under systemd
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet jw-meetingmate.service; then
    echo "[1/5] Stopping jw-meetingmate service..."
    sudo systemctl stop jw-meetingmate.service
fi

# 2. Backup current state to /tmp before overwriting
echo "[2/5] Creating emergency snapshot of current state..."
EMERGENCY_DIR="/tmp/jw-meetingmate-pre-restore-$(date +%s)"
mkdir -p "${EMERGENCY_DIR}"
[ -f "${DATA_DIR}/app.db" ] && cp "${DATA_DIR}/app.db"* "${EMERGENCY_DIR}/" || true
[ -d "${DATA_DIR}/chroma" ] && cp -r "${DATA_DIR}/chroma" "${EMERGENCY_DIR}/" || true
echo "  -> Pre-restore state saved in ${EMERGENCY_DIR}"

mkdir -p "${DATA_DIR}"

# 3. Restore SQLite database
if [ -f "${BACKUP_SRC}/app.db" ]; then
    echo "[3/5] Restoring SQLite database..."
    # Remove existing WAL and SHM files to ensure consistent state
    rm -f "${DATA_DIR}/app.db-wal" "${DATA_DIR}/app.db-shm"
    cp "${BACKUP_SRC}/app.db" "${DATA_DIR}/app.db"

    # Integrity verification
    echo "  -> Running database integrity check..."
    INTEGRITY=$(sqlite3 "${DATA_DIR}/app.db" "PRAGMA integrity_check;")
    if [ "${INTEGRITY}" != "ok" ]; then
        echo "ERROR: SQLite integrity check failed with: ${INTEGRITY}"
        exit 1
    fi
    echo "  -> SQLite integrity verified: OK"
else
    echo "  -> WARNING: No app.db found in backup archive."
fi

# 4. Restore ChromaDB vector database
if [ -f "${BACKUP_SRC}/chroma.tar.gz" ]; then
    echo "[4/5] Restoring ChromaDB vector database..."
    rm -rf "${DATA_DIR}/chroma"
    tar -xzf "${BACKUP_SRC}/chroma.tar.gz" -C "${DATA_DIR}"
    echo "  -> ChromaDB directory restored successfully."
else
    echo "  -> WARNING: No chroma.tar.gz found in backup archive."
fi

# 5. Fix permissions and start service
echo "[5/5] Finalizing permissions and restarting service..."
if id "meetingmate" >/dev/null 2>&1; then
    chown -R meetingmate:meetingmate "${DATA_DIR}"
fi

if command -v systemctl >/dev/null 2>&1; then
    echo "  -> Starting jw-meetingmate service..."
    sudo systemctl start jw-meetingmate.service
    sleep 2
    if systemctl is-active --quiet jw-meetingmate.service; then
        echo "  -> Service is ACTIVE and running."
    else
        echo "  -> WARNING: Service failed to start. Check 'journalctl -u jw-meetingmate.service'."
    fi
fi

echo "=========================================================="
echo " Restore completed successfully!"
echo " Restored from: ${BACKUP_SRC}"
echo "=========================================================="
