# ==========================================
# Etapa 1: Compilación del Frontend (React + Vite)
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

# Copiar manifiestos e instalar dependencias con caché
COPY frontend/package*.json ./
RUN npm ci

# Copiar código fuente y compilar bundle estático para producción
COPY frontend/ ./
RUN npm run build

# ==========================================
# Etapa 2: Backend FastAPI + Servidor Web
# ==========================================
FROM python:3.11-slim AS runner

# Optimizaciones de Python para contenedores
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DB_PATH=/app/data/portfolio.db \
    ENVIRONMENT=production

WORKDIR /app

# Instalar curl para Healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copiar el backend completo
COPY backend/ ./backend/

# Copiar el frontend compilado en la Etapa 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Asegurar directorio de datos persistentes
RUN mkdir -p /app/data

# Puerto del servicio
EXPOSE 8000

# Healthcheck de contenedor para Portainer / Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Iniciar Uvicorn desde el directorio backend
WORKDIR /app/backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
