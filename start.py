#!/usr/bin/env python3
"""
Portfolio Dashboard — Startup Script.
Starts the FastAPI backend and the Vite frontend dev server,
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
    """Open dashboard after servers start."""
    time.sleep(3.0)
    try:
        # Si usas Vite en desarrollo, suele abrirse en el puerto 5173
        webbrowser.open("http://localhost:5173")
    except Exception:
        pass

def run_frontend(frontend_dir):
    """Inicia el servidor de desarrollo de Vite (npm run dev)."""
    # En Windows usamos 'npm.cmd', en Linux/Mac 'npm'
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    try:
        subprocess.run([npm_cmd, "run", "dev"], cwd=frontend_dir, check=True)
    except Exception as e:
        print(f"[WARN] No se pudo iniciar el frontend dev server: {e}")

if __name__ == "__main__":
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    # Asegurar directorios de datos y .env (tu lógica anterior)...
    os.makedirs(os.path.join(root_dir, "data"), exist_ok=True)
    os.makedirs(os.path.join(backend_dir, "data"), exist_ok=True)

    env_file = os.path.join(root_dir, ".env")
    env_example = os.path.join(root_dir, ".env.example")
    if not os.path.exists(env_file) and os.path.exists(env_example):
        import shutil
        shutil.copy(env_example, env_file)
        print("[INFO] Created .env from .env.example")

    # Seleccionar Python del venv
    venv_py_win = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    venv_py_nix = os.path.join(backend_dir, "venv", "bin", "python")

    if os.path.exists(venv_py_win):
        python = venv_py_win
    elif os.path.exists(venv_py_nix):
        python = venv_py_nix
    else:
        python = sys.executable

    print("==================================================")
    print(" [*] Portfolio Dashboard (Modo Desarrollo)")
    print("==================================================")
    print(" [>] Backend API:    http://localhost:8000")
    print(" [>] Frontend Dev:   http://localhost:5173")
    print(" [>] Documentacion:  http://localhost:8000/docs")
    print("==================================================")
    print(" Presione Ctrl+C para detener todo.\n")

    # 1. Lanzar el frontend de Vite en un hilo independiente en segundo plano
    if os.path.exists(os.path.join(frontend_dir, "package.json")):
        threading.Thread(target=run_frontend, args=(frontend_dir,), daemon=True).start()
    else:
        print("[WARN] No se encontró la carpeta frontend o package.json")

    # 2. Abrir el navegador apuntando a Vite (puerto 5173 para cambios en vivo)
    threading.Thread(target=open_browser, daemon=True).start()

    # 3. Ejecutar Uvicorn en el hilo principal
    try:
        subprocess.run(
            [python, "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
            cwd=backend_dir,
        )
    except KeyboardInterrupt:
        print("\n[INFO] Servidor detenido por el usuario.")