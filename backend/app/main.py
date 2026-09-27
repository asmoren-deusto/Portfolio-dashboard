"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import logging

from app.database import init_db
from app.routers import portfolio, transactions, assets, market, auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Portfolio Dashboard API",
    description="Personal investment portfolio tracker",
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


# Include routers
app.include_router(auth.router)
app.include_router(portfolio.router)
app.include_router(transactions.router)
app.include_router(assets.router)
app.include_router(market.router)


@app.on_event("startup")
async def startup():
    logger.info("Initializing database...")
    init_db()
    logger.info("Database ready.")
    async def _warm_cache():
        try:
            import asyncio
            from app.database import SessionLocal
            from app.routers.portfolio import get_performance
            db = SessionLocal()
            for p in ["1y", "all"]:
                await get_performance(period=p, user_id="asier", broker=None, db=db)
            db.close()
            logger.info("Performance cache pre-warmed successfully.")
        except Exception as e:
            logger.warning(f"Error pre-warming performance cache: {e}")

    import asyncio
    asyncio.create_task(_warm_cache())


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


# Serve frontend static files (production) & SPA fallback for client-side routing
STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
ASSETS_DIR = os.path.join(STATIC_DIR, "assets")

if os.path.isdir(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Do not intercept API endpoints
    if full_path.startswith("api/"):
        return {"detail": "API endpoint not found"}

    # If file exists on disk (e.g. favicon.ico, manifest.json, etc.)
    file_path = os.path.join(STATIC_DIR, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)

    # SPA fallback: return index.html so React Router handles the route (/market, /positions, etc.)
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)

    return {"detail": "Frontend build not found. Please build the frontend."}
