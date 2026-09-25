#!/usr/bin/env python3
"""
Portfolio Dashboard — Dev startup script.
Starts the FastAPI backend and opens the frontend in the browser.
"""
import subprocess
import sys
import os
import webbrowser
import time
import threading

def open_browser():
    """Open frontend after a short delay."""
    time.sleep(2)
    webbrowser.open("http://localhost:8000/docs")  # API docs
    # Open the frontend HTML directly (no Node needed)
    frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "frontend", "index.html"))
    webbrowser.open(f"file:///{frontend_path.replace(os.sep, '/')}")

if __name__ == "__main__":
    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)

    # Copy .env.example if .env doesn't exist
    if not os.path.exists(".env") and os.path.exists(".env.example"):
        import shutil
        shutil.copy(".env.example", ".env")
        print("📄 Created .env from .env.example")

    print("🚀 Starting Portfolio Dashboard backend...")
    print("   API:      http://localhost:8000")
    print("   API docs: http://localhost:8000/docs")
    print("   Frontend: Open frontend/index.html in your browser")
    print("   Press Ctrl+C to stop\n")

    # Open browser after delay
    threading.Thread(target=open_browser, daemon=True).start()

    # Run uvicorn
    python = sys.executable
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")

    subprocess.run(
        [python, "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
        cwd=backend_dir,
    )
