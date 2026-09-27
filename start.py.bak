#!/usr/bin/env python3
"""
Portfolio Dashboard — Startup Script.
Starts the FastAPI backend (serving both API and compiled React frontend)
and opens the dashboard in your default browser.
"""
import subprocess
import sys
import os
import webbrowser
import time
import threading

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def open_browser():
    """Open dashboard after server starts."""
    time.sleep(2.5)
    try:
        webbrowser.open("http://localhost:8000")
    except Exception:
        pass

if __name__ == "__main__":
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")

    # Ensure data directory exists
    os.makedirs(os.path.join(root_dir, "data"), exist_ok=True)
    os.makedirs(os.path.join(backend_dir, "data"), exist_ok=True)

    # Copy .env.example if .env doesn't exist
    env_file = os.path.join(root_dir, ".env")
    env_example = os.path.join(root_dir, ".env.example")
    if not os.path.exists(env_file) and os.path.exists(env_example):
        import shutil
        shutil.copy(env_example, env_file)
        print("[INFO] Created .env from .env.example")

    # Select virtualenv Python if available
    venv_py_win = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    venv_py_nix = os.path.join(backend_dir, "venv", "bin", "python")

    if os.path.exists(venv_py_win):
        python = venv_py_win
    elif os.path.exists(venv_py_nix):
        python = venv_py_nix
    else:
        python = sys.executable

    print("==================================================")
    print(" [*] Portfolio Dashboard")
    print("==================================================")
    print(" [>] Aplicacion Web: http://localhost:8000")
    print(" [>] Documentacion:  http://localhost:8000/docs")
    print(" [>] Frontend Dev:   http://localhost:5173 (opcional)")
    print("==================================================")
    print(" Presione Ctrl+C para detener el servidor.\n")

    threading.Thread(target=open_browser, daemon=True).start()

    subprocess.run(
        [python, "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
        cwd=backend_dir,
    )

