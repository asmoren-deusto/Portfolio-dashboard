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
import socket

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def wait_for_port(port: int, host: str = "127.0.0.1", timeout: float = 12.0) -> bool:
    """Espera activamente a que un puerto esté abierto y aceptando conexiones."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection((host, port), timeout=0.3):
                return True
        except (OSError, ConnectionRefusedError):
            time.sleep(0.2)
    return False

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

def free_port(port: int):
    """Libera el puerto si algún proceso residual o huérfano lo está ocupando."""
    if sys.platform == "win32":
        try:
            out = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True, text=True, stderr=subprocess.DEVNULL)
            pids = set()
            for line in out.strip().splitlines():
                if "LISTENING" in line:
                    parts = line.strip().split()
                    if parts and parts[-1].isdigit():
                        pid = int(parts[-1])
                        if pid > 0 and pid != os.getpid():
                            pids.add(pid)
            for pid in pids:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

def open_browser():
    """Abrir dashboard una vez que frontend y backend hayan arrancado."""
    wait_for_port(5173, timeout=5.0)
    time.sleep(0.5)
    try:
        webbrowser.open("http://localhost:5173")
    except Exception:
        pass

if __name__ == "__main__":
    # Liberar puertos 8000 y 5173 de sesiones previas o huérfanas
    free_port(8000)
    free_port(5173)
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
        # 1. Iniciar Uvicorn backend primero
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

        # Esperar a que el backend esté listo antes de arrancar Vite para evitar ECONNREFUSED
        wait_for_port(8000, timeout=12.0)

        # 2. Iniciar Vite frontend una vez que el backend ya acepta peticiones
        if os.path.exists(os.path.join(frontend_dir, "package.json")):
            frontend_proc = subprocess.Popen(
                [npm_cmd, "run", "dev"],
                cwd=frontend_dir,
                stdin=subprocess.DEVNULL,
                creationflags=creation_flags
            )
        else:
            print("[WARN] No se encontró la carpeta frontend o package.json")

        # 3. Abrir navegador en segundo plano tras levantar el frontend
        threading.Thread(target=open_browser, daemon=True).start()

        # 4. Supervisor continuo: resucitar Vite o Backend si se detienen
        last_interrupt_time = 0.0

        while True:
            try:
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
                now = time.time()
                # Doble Ctrl+C en menos de 1.5s fuerza el cierre inmediato
                if now - last_interrupt_time < 1.5:
                    print("\n[INFO] Deteniendo servicios (Ctrl+C forzado)...")
                    break
                last_interrupt_time = now

                # En Windows, cuando Uvicorn recarga por cambios de código (WatchFiles), envía os.kill(pid, CTRL_C_EVENT)
                # a su proceso worker. Windows difunde este evento a toda la consola, generando un KeyboardInterrupt en start.py.
                # Verificamos si Uvicorn y Vite siguen vivos tras una breve pausa: si siguen vivos, fue una recarga interna (hot-reload).
                time.sleep(0.5)
                if backend_proc and backend_proc.poll() is None and frontend_proc and frontend_proc.poll() is None:
                    continue

                print("\n[INFO] Deteniendo servicios...")
                break
    finally:
        if frontend_proc:
            kill_process_tree(frontend_proc)
        if backend_proc:
            kill_process_tree(backend_proc)
        print("[INFO] Servidores detenidos correctamente.")