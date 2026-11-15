import os
import multiprocessing
from pathlib import Path

# Load settings from environment
bind_host = os.getenv("HOST", "0.0.0.0")
bind_port = os.getenv("PORT", "8000")
bind = f"{bind_host}:{bind_port}"

# Concurrency & Worker architecture
# For private family usage, 2 to 4 workers provide optimal concurrency without high memory usage
cpu_count = multiprocessing.cpu_count()
workers = min(max(2, cpu_count), 4)
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000

# Timeout settings
# Set to 60s to accommodate RAG retrieval and multi-document chunk indexing
timeout = 60
graceful_timeout = 30
keepalive = 5

# Logging configuration
log_dir = Path("/var/log/jw-meetingmate")
if log_dir.exists() and os.access(str(log_dir), os.W_OK):
    accesslog = str(log_dir / "access.log")
    errorlog = str(log_dir / "error.log")
else:
    # Fallback to stdout/stderr for systemd journal capture
    accesslog = "-"
    errorlog = "-"

loglevel = os.getenv("LOG_LEVEL", "info").lower()
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" (%(L)ss)'

# Process naming
proc_name = "jw-meetingmate-backend"


def on_starting(server):
    server.log.info("Starting JW Meeting Assistant Gunicorn master process...")


def when_ready(server):
    server.log.info(f"JW Meeting Assistant backend is ready. Serving on: {bind} with {workers} workers.")


def on_exit(server):
    server.log.info("JW Meeting Assistant backend shutting down gracefully.")
