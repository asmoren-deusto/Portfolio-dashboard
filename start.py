#!/usr/bin/env python3
"""
Portfolio Dashboard — Startup Script.
Starts the FastAPI backend and the Vite frontend dev server with auto-resurrection,
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

def kill_process_tree(proc):
    """Termina limpiamente un proceso y todos sus subprocesos hijos."""
    if not proc:
        return
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        else:
            proc.terminate()
            proc.wait(timeout=3)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass

def open_browser():
    """Abrir dashboard una vez que los servidores hayan arrancado."""
    time.sleep(2.5)
    try:
        webbrowser.open("http://localhost:5173")
    except Exception:
        pass

if __name__ == "__main__":
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    os.makedirs(os.path.join(root_dir, "data"), exist_ok=True)
    os.makedirs(os.path.join(backend_dir, "data"), exist_ok=True)

    env_file = os.path.join(root_dir, ".env")
    env_example = os.path.join(root_dir, ".env.example")
    if not os.path.exists(env_file) and os.path.exists(env_example):
        import shutil
        shutil.copy(env_example, env_file)
        print("[INFO] Creado .env desde .env.example")

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

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0

    frontend_proc = None
    backend_proc = None

    try:
        # 1. Iniciar Vite frontend
        if os.path.exists(os.path.join(frontend_dir, "package.json")):
            frontend_proc = subprocess.Popen(
                [npm_cmd, "run", "dev"],
                cwd=frontend_dir,
                stdin=subprocess.DEVNULL,
                creationflags=creation_flags
            )
        else:
            print("[WARN] No se encontró la carpeta frontend o package.json")

        # 2. Iniciar Uvicorn backend
        backend_cmd = [
            python, "-m", "uvicorn", "app.main:app",
            "--reload", "--reload-dir", "app", "--reload-include", "*.py",
            "--host", "0.0.0.0", "--port", "8000"
        ]
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=backend_dir,
            stdin=subprocess.DEVNULL,
            creationflags=creation_flags
        )

        # 3. Abrir navegador en segundo plano
        threading.Thread(target=open_browser, daemon=True).start()

        # 4. Supervisor continuo: resucitar Vite o Backend si se detienen
        while True:
            time.sleep(1.0)
            if frontend_proc and frontend_proc.poll() is not None:
                print(f"\n[WARN] El servidor frontend de Vite se detuvo (código: {frontend_proc.returncode}). Reiniciando frontend...")
                time.sleep(1.0)
                frontend_proc = subprocess.Popen(
                    [npm_cmd, "run", "dev"],
                    cwd=frontend_dir,
                    stdin=subprocess.DEVNULL,
                    creationflags=creation_flags
                )

            if backend_proc and backend_proc.poll() is not None:
                print(f"\n[WARN] El servidor backend de Uvicorn se detuvo (código: {backend_proc.returncode}). Reiniciando backend...")
                time.sleep(1.0)
                backend_proc = subprocess.Popen(
                    backend_cmd,
                    cwd=backend_dir,
                    stdin=subprocess.DEVNULL,
                    creationflags=creation_flags
                )

    except KeyboardInterrupt:
        print("\n[INFO] Deteniendo servicios...")
    finally:
        if frontend_proc:
            kill_process_tree(frontend_proc)
        if backend_proc:
            kill_process_tree(backend_proc)
        print("[INFO] Servidores detenidos correctamente.")