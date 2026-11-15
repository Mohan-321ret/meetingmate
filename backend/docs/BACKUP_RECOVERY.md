# JW Meeting Assistant - Backup, Disaster Recovery & Data Integrity Guide

## 1. Backup Strategy Overview

To protect family meeting notes, saved answers, and ingested publications, the backend features an automated backup system designed around two persistent data components:

1. **SQLite Database (`data/app.db`)**:
   Contains relational state: meetings, questions, answers, saved answers, search history, and document indexing records.
   *Backup Method:* Native `sqlite3 .backup` command. This performs an **online, non-blocking, WAL-safe snapshot** without locking read or write queries.
2. **ChromaDB Vector Store (`data/chroma/`)**:
   Contains vector collections, cosine distance index files, and embeddings metadata.
   *Backup Method:* Gzip-compressed tarball (`chroma.tar.gz`).
3. **Backup Manifest (`manifest.json`)**:
   Stores timestamp, application version, file sizes, and cryptographic verification metadata.

---

## 2. Automated Daily Backup via Cron

A pre-configured shell script is provided at `backend/deploy/backup.sh`.

### Install Cron Job
To run an automated backup daily at 02:00 AM:

```bash
sudo crontab -u meetingmate -e
```
Add the following line:
```cron
0 2 * * * /opt/jw-meetingmate/backend/deploy/backup.sh >> /var/log/jw-meetingmate/backup.log 2>&1
```

### Retention Policy
`backup.sh` enforces a **7-day retention window**:
```bash
find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +
```
Older backup directories are automatically purged to prevent disk exhaustion.

---

## 3. Running a Manual Backup

Run as the `meetingmate` user at any time:

```bash
sudo -u meetingmate /opt/jw-meetingmate/backend/deploy/backup.sh
```

Sample output:
```
==========================================================
 Starting JW Meeting Assistant Backup: 20261115_193000
 App Directory: /opt/jw-meetingmate/backend
 Destination:   /var/backups/jw-meetingmate/20261115_193000
==========================================================
[1/3] Performing atomic SQLite backup...
  -> SQLite database backed up to: /var/backups/jw-meetingmate/20261115_193000/app.db
[2/3] Archiving ChromaDB vector database directory...
  -> ChromaDB snapshot archived to: /var/backups/jw-meetingmate/20261115_193000/chroma.tar.gz
[3/3] Generating backup manifest...
  -> Manifest written: /var/backups/jw-meetingmate/20261115_193000/manifest.json
Enforcing 7-day backup retention...
Retention purge complete.
==========================================================
 Backup successfully completed at Sun Nov 15 19:30:02 UTC 2026
==========================================================
```

---

## 4. Disaster Recovery & Restoration Procedure

If the server experiences disk corruption, accidental data deletion, or needs migration to a new machine, use `backend/deploy/restore.sh`.

### Restoring from the Latest Backup
```bash
sudo /opt/jw-meetingmate/backend/deploy/restore.sh
```

### Restoring from a Specific Timestamp
```bash
sudo /opt/jw-meetingmate/backend/deploy/restore.sh 20261115_193000
```

### What `restore.sh` Does Under the Hood:
1. **Service Suspension:** Gracefully stops `jw-meetingmate.service` to prevent data mutation.
2. **Safety Snapshot:** Copies the existing `data/` directory to `/tmp/jw-meetingmate-pre-restore-<timestamp>` before making changes.
3. **Database Restoration:** Copies `app.db` into place and purges any orphaned `-wal` or `-shm` shared memory files.
4. **Integrity Verification:** Executes `PRAGMA integrity_check;` on SQLite. If any corruption is detected, the process halts immediately.
5. **ChromaDB Extraction:** Unpacks `chroma.tar.gz` cleanly into `data/chroma/`.
6. **Permission Fixing:** Re-applies `chown -R meetingmate:meetingmate data/`.
7. **Service Resumption:** Restarts `jw-meetingmate.service` and verifies process state.

---

## 5. Offsite Backup Synchronization (Optional)

To safeguard against hardware failure, synchronize backups to another family device or NAS over Tailscale:

```bash
# Add to cron: sync backups to secondary machine at 03:00 AM
0 3 * * * rsync -avz --delete /var/backups/jw-meetingmate/ user@family-nas:/backups/jw-meetingmate/
```
