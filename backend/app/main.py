"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import os
import logging
import math

from datetime import datetime
import asyncio

from app.database import init_db
from app.routers import portfolio, transactions, assets, market, auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _sanitize_nan_inf(obj):
    """Recursively convert float NaN and Inf to None (JSON null) to guarantee RFC 8259 compliance."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: _sanitize_nan_inf(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_sanitize_nan_inf(v) for v in obj]
    return obj


class SafeJSONResponse(JSONResponse):
    """Custom JSONResponse that sanitizes NaN and Inf floats into nulls before serialization."""
    def render(self, content) -> bytes:
        return super().render(_sanitize_nan_inf(content))


app = FastAPI(
    title="Portfolio Dashboard API",
    description="Personal investment portfolio tracker",
    version="1.0.0",
    default_response_class=SafeJSONResponse,
)

# CORS — allow frontend dev server, mobile apps and production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "https://localhost",
        "capacitor://localhost",
        "ionic://localhost",
        "https://portfolio.asiermoreno.es",
    ],
    allow_origin_regex=r"^(https?://.*asiermoreno\.es|capacitor://localhost|https://localhost)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/api") or path == "/" or path.endswith(".html") or "." not in path.split("/")[-1]:
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
    try:
        from app.services.price_service import preload_price_cache_from_db
        preload_price_cache_from_db()
    except Exception as e:
        logger.warning(f"Failed to preload price cache: {e}")
    async def _warm_cache():
        try:
            import asyncio
            from app.database import SessionLocal
            from app.routers.portfolio import get_performance
            from app.routers.market import get_indices
            db = SessionLocal()
            for p in ["1y", "all"]:
                await get_performance(period=p, user_id="asier", broker=None, db=db)
            db.close()
            # Pre-calentar caché de índices para el Ticker superior
            await get_indices()
            logger.info("Caches pre-warmed successfully (performance & market indices).")
        except Exception as e:
            logger.warning(f"Error pre-warming cache: {e}")

    async def _periodic_nav_scanner():
        # Allow initial app boot and warm-up to finish first
        try:
            await asyncio.sleep(30)
        except asyncio.CancelledError:
            return

        while True:
            sleep_sec = 1800
            try:
                from app.database import SessionLocal
                from app.routers.portfolio import check_portfolio_navs
                db = SessionLocal()
                logger.info("Executing periodic NAV scanner...")
                await check_portfolio_navs(user_id="asier", db=db)
                db.close()

                # Intelligent interval: funds publish NAVs on business days mostly 16:00-24:00 CET,
                # with late publishers (BlackRock, Fidelity IE...) catching up the next morning 07:00-12:00.
                # Fast daytime scan: on business days 07:00-23:59 CET, scan every 300s (5 min)
                # to detect any new NAV (from FT, Finect, Morningstar, Quefondos or gestoras) as early as possible.
                now = datetime.now()
                is_weekday = now.weekday() < 5
                in_window = 7 <= now.hour <= 23
                sleep_sec = 300 if (is_weekday and in_window) else 1800
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Error in periodic NAV scanner: {e}")

            try:
                await asyncio.sleep(sleep_sec)
            except asyncio.CancelledError:
                break

    import asyncio
    asyncio.create_task(_warm_cache())
    asyncio.create_task(_periodic_nav_scanner())


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
        resp = FileResponse(index_path)
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        return resp

    return {"detail": "Frontend build not found. Please build the frontend."}
