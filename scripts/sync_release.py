#!/usr/bin/env python3
"""
sync_release.py
Automates chat transcript export, semantic version bumping, and Git synchronization.

Features:
1. Exports the latest active Antigravity session transcript to .chats/latest_chat.md and .chats/archive/
2. Bumps project version in frontend/package.json and frontend/src/version.ts
3. Automatically stages, commits and pushes changes to the remote repository.
"""

import os
import sys
import json
import re
import argparse
import subprocess
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding for Unicode/Emojis
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
PACKAGE_JSON = FRONTEND_DIR / "package.json"
VERSION_TS = FRONTEND_DIR / "src" / "version.ts"
CHATS_DIR = ROOT_DIR / ".chats"
ARCHIVE_DIR = CHATS_DIR / "archive"

def get_latest_conversation_log():
    brain_dir = Path(os.path.expanduser("~/.gemini/antigravity-ide/brain"))
    if not brain_dir.exists():
        print(f"[!] Brain directory not found at {brain_dir}")
        return None, None

    candidates = []
    for conv_dir in brain_dir.iterdir():
        if conv_dir.is_dir():
            log_path = conv_dir / ".system_generated" / "logs" / "transcript_full.jsonl"
            if not log_path.exists():
                log_path = conv_dir / ".system_generated" / "logs" / "transcript.jsonl"
            if log_path.exists():
                candidates.append((log_path.stat().st_mtime, conv_dir.name, log_path))

    if not candidates:
        print("[!] No transcript logs found in brain directory.")
        return None, None

    candidates.sort(reverse=True, key=lambda x: x[0])
    _, conv_id, log_file = candidates[0]
    return conv_id, log_file

def export_chat_transcript():
    conv_id, log_file = get_latest_conversation_log()
    if not log_file:
        print("[-] Skipping chat export: no log file found.")
        return None

    turns = []
    try:
        with open(log_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except Exception:
                    continue

                source = entry.get("source")
                type_ = entry.get("type")
                content = entry.get("content", "")
                created_at = entry.get("created_at", "")

                if source == "USER_EXPLICIT" and type_ == "USER_INPUT":
                    m = re.search(r"<USER_REQUEST>\s*(.*?)\s*</USER_REQUEST>", content, re.DOTALL)
                    text = m.group(1).strip() if m else content.strip()
                    turns.append(("Usuario", created_at, text))
                elif source == "MODEL" and type_ == "PLANNER_RESPONSE" and content:
                    turns.append(("Asistente", created_at, content.strip()))
    except Exception as e:
        print(f"[!] Error reading transcript: {e}")
        return None

    if not turns:
        print("[-] No conversation turns found in latest transcript.")
        return None

    CHATS_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    file_timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")

    md_lines = [
        f"# Historial de Chat - Sesión Antigravity",
        f"- **Fecha de exportación:** {timestamp_str}",
        f"- **ID de Conversación:** `{conv_id}`",
        f"- **Total de interacciones registradas:** {len(turns)}",
        "",
        "> [!NOTE]",
        "> Este archivo fue exportado automáticamente para preservar el contexto entre diferentes PCs.",
        "> En un nuevo ordenador o chat, puedes referenciar este archivo con `@.chats/latest_chat.md`",
        "",
        "---",
        ""
    ]

    for role, dt, text in turns:
        badge = "👤 Usuario" if role == "Usuario" else "🤖 Asistente"
        time_display = dt[:19].replace("T", " ") if dt else ""
        header = f"### {badge}" + (f" ({time_display})" if time_display else "")
        md_lines.append(header)
        md_lines.append("")
        md_lines.append(text)
        md_lines.append("")
        md_lines.append("---")
        md_lines.append("")

    markdown_content = "\n".join(md_lines)

    latest_file = CHATS_DIR / "latest_chat.md"
    archive_file = ARCHIVE_DIR / f"chat_{file_timestamp}.md"

    latest_file.write_text(markdown_content, encoding="utf-8")
    archive_file.write_text(markdown_content, encoding="utf-8")

    print(f"[+] Chat exportado exitosamente:")
    print(f"    - Reciente: {latest_file.relative_to(ROOT_DIR)}")
    print(f"    - Archivo:  {archive_file.relative_to(ROOT_DIR)}")
    return latest_file

def bump_version(bump_type="patch"):
    if not PACKAGE_JSON.exists():
        print(f"[!] package.json no encontrado en {PACKAGE_JSON}")
        return None

    with open(PACKAGE_JSON, "r", encoding="utf-8") as f:
        pkg_data = json.load(f)

    current_ver = pkg_data.get("version", "2.7.0")
    parts = current_ver.split(".")
    while len(parts) < 3:
        parts.append("0")

    try:
        major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
    except ValueError:
        major, minor, patch = 2, 7, 0

    if bump_type == "major":
        major += 1
        minor = 0
        patch = 0
    elif bump_type == "minor":
        minor += 1
        patch = 0
    else:  # patch
        patch += 1

    new_ver = f"{major}.{minor}.{patch}"
    pkg_data["version"] = new_ver

    with open(PACKAGE_JSON, "w", encoding="utf-8") as f:
        json.dump(pkg_data, f, indent=2)
        f.write("\n")

    # Update src/version.ts
    VERSION_TS.parent.mkdir(parents=True, exist_ok=True)
    version_ts_content = f"// Single source of truth for the frontend application version\nexport const APP_VERSION = '{new_ver}'\n"
    VERSION_TS.write_text(version_ts_content, encoding="utf-8")

    print(f"[+] Versión actualizada: {current_ver} -> {new_ver}")
    return new_ver

def git_commit_and_push(commit_msg, version=None):
    if not (ROOT_DIR / ".git").exists():
        print("[!] Repositorio Git no encontrado.")
        return False

    final_msg = commit_msg
    if version and f"v{version}" not in commit_msg:
        final_msg = f"{commit_msg} [v{version}]"

    try:
        print("[*] Ejecutando git add .")
        subprocess.run(["git", "add", "."], cwd=ROOT_DIR, check=True)

        # Check if there are changes to commit
        status = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT_DIR, capture_output=True, text=True, check=True)
        if not status.stdout.strip():
            print("[-] No hay cambios para commitear.")
            return True

        print(f"[*] Ejecutando git commit -m '{final_msg}'")
        subprocess.run(["git", "commit", "-m", final_msg], cwd=ROOT_DIR, check=True)

        print("[*] Ejecutando git push")
        subprocess.run(["git", "push"], cwd=ROOT_DIR, check=True)

        print(f"[+] Sincronización con Git completada con éxito. Mensaje: '{final_msg}'")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[!] Error ejecutando comandos git: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Automatización de exportación de chat, versión y subida a Git.")
    parser.add_argument("message", nargs="?", default="feat: actualización y sincronización", help="Mensaje de commit")
    parser.add_argument("--bump", choices=["patch", "minor", "major"], default="patch", help="Tipo de incremento de versión (default: patch)")
    parser.add_argument("--no-bump", action="store_true", help="No incrementar la versión")
    parser.add_argument("--no-chat", action="store_true", help="No exportar el chat")
    parser.add_argument("--no-git", action="store_true", help="No ejecutar git add/commit/push")

    args = parser.parse_args()

    print("==================================================")
    print("🚀 Iniciando Sync & Release de Portfolio Dashboard")
    print("==================================================")

    # 1. Export Chat
    if not args.no_chat:
        export_chat_transcript()

    # 2. Bump Version
    new_version = None
    if not args.no_bump:
        new_version = bump_version(args.bump)

    # 3. Git commit & push
    if not args.no_git:
        git_commit_and_push(args.message, new_version)

    print("==================================================")
    print("✅ Proceso finalizado.")
    print("==================================================")

if __name__ == "__main__":
    main()
