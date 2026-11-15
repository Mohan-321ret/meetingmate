"""
Run FastAPI in a daemon thread and execute frontend integration tests.
Thread-based execution avoids pipe blocking and subprocess overhead on Windows.
"""

import os
import sys
import time
import threading
import urllib.request
import subprocess

# Ensure backend directory is in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
import uvicorn


def wait_for_server(url: str, timeout_sec: int = 15) -> bool:
    start = time.time()
    while time.time() - start < timeout_sec:
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(0.3)
    return False


def main():
    print("[Integration Runner] Starting in-process FastAPI backend on http://127.0.0.1:8000...")
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="warning",
        access_log=False,
    )
    server = uvicorn.Server(config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    try:
        health_url = "http://127.0.0.1:8000/api/v1/health"
        print("[Integration Runner] Waiting for backend ready probe...")
        ready = wait_for_server(health_url, timeout_sec=15)
        if not ready:
            print("[Integration Runner] ERROR: Server did not respond within 15s.")
            sys.exit(1)

        print("[Integration Runner] Server ready! Running node scripts/test-frontend-api.mjs...\n")
        test_script = os.path.join(root_dir, "scripts", "test-frontend-api.mjs")
        result = subprocess.run(["node", test_script], cwd=root_dir)

        if result.returncode != 0:
            print(f"[Integration Runner] Tests exited with code {result.returncode}")
            sys.exit(result.returncode)

        print("[Integration Runner] All integration tests succeeded!")

    finally:
        print("[Integration Runner] Stopping backend server...")
        server.should_exit = True
        server_thread.join(timeout=3)
        print("[Integration Runner] Server stopped.")


if __name__ == "__main__":
    main()
