# Guía de Agentes y Reglas de Desarrollo (Portfolio Dashboard)

Este documento define el comportamiento y directrices para los agentes de IA (Google Antigravity IDE, CLI, etc.) en este repositorio.

## 🚀 Protocolo Automático de Releases y Sincronización de Chats
Para permitir el trabajo fluido entre múltiples ordenadores sin pérdida de contexto ni historial:

1. **Subidas y Sincronización:**
   Cada vez que se complete una tarea o se solicite una subida a Git, ejecuta:
   ```bash
   python scripts/sync_release.py "mensaje descriptivo de los cambios"
   ```
   Esto automatiza:
   - Exportación íntegra del chat actual a `.chats/latest_chat.md` y archivo histórico `.chats/archive/`.
   - Incremento automático de versión (`patch`) en `frontend/package.json` y `frontend/src/version.ts`.
   - Reflejo automático de la versión en la interfaz web (Sidebar y Login).
   - `git add .`, `git commit` y `git push`.

2. **Continuidad entre PCs:**
   Al trabajar en un ordenador distinto tras hacer `git pull`, consulta siempre `.chats/latest_chat.md` para retomar el contexto exacto de las últimas sesiones.
