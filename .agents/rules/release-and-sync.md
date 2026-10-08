---
description: Reglas y protocolo obligatorio de sincronización de chats, control de versiones y subidas automáticas a Git
globs: *
---

# Protocolo de Sincronización, Versiones y Git

Este proyecto cuenta con un sistema automatizado para sincronizar el contexto de desarrollo y los chats entre diferentes ordenadores y reflejar la versión de la app en la interfaz web.

## 1. Al Finalizar Tareas y Subir Cambios a Git
Siempre que completes una funcionalidad, corrección o tarea solicitada por el usuario (o cuando el usuario pida guardar, commitear o subir cambios):
1. **Ejecutar el script de sincronización y release:**
   ```bash
   python scripts/sync_release.py "tipo(scope): descripción clara del cambio"
   ```
2. **Qué hace automáticamente este script:**
   - **Exporta el chat activo:** Lee la transcripción de la sesión actual de Antigravity y la vuelca en formato Markdown en [latest_chat.md](file:///c:/Users/AsierM/Documents/GitHub/Portfolio-dashboard/.chats/latest_chat.md) y en el histórico `.chats/archive/`.
   - **Incrementa la versión:** Sube el número de versión (patch por defecto: ej. `2.7.1 -> 2.7.2`) en `frontend/package.json` y en `frontend/src/version.ts`.
   - **Refleja la versión en la web:** La app web importa `APP_VERSION` en el menú lateral ([Sidebar.tsx](file:///c:/Users/AsierM/Documents/GitHub/Portfolio-dashboard/frontend/src/components/layout/Sidebar.tsx)) y en el pie de página de login ([LoginPage.tsx](file:///c:/Users/AsierM/Documents/GitHub/Portfolio-dashboard/frontend/src/pages/LoginPage.tsx)).
   - **Git commit y push:** Ejecuta `git add .`, realiza el commit con la etiqueta de versión correspondiente (ej. `[v2.7.2]`) y hace `git push` a la rama remota.

## 2. Al Iniciar una Sesión en Otro PC
Cuando el usuario clone o haga `git pull` en otro ordenador e inicie una nueva conversación con frases como:
- *"Continúa donde lo dejamos"*
- *"Qué estábamos haciendo?"*
- *"Sigue con el punto pendiente del chat anterior"*
- O cuando referencie `@.chats/latest_chat.md`

**Acción obligatoria del agente:**
1. Leer [latest_chat.md](file:///c:/Users/AsierM/Documents/GitHub/Portfolio-dashboard/.chats/latest_chat.md) utilizando la herramienta `view_file`.
2. Absorber el contexto previo (decisiones tomadas, requerimientos del usuario y estado técnico).
3. Confirmar al usuario que el contexto del chat anterior ha sido recuperado y continuar el trabajo de inmediato sin repetir preguntas ya contestadas.
