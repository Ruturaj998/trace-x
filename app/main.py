import hmac
import logging
import os

from fastapi import Depends, FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.services.csrf import CSRF_COOKIE_NAME, CSRF_HEADER_NAME
from app.routes.users import router as users_router
from app.routes.devices import router as devices_router
from app.routes.location import router as locations_router
from app.routes.status_history import router as status_history_router
from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router
from app.routes.contact import router as contact_router

app = FastAPI(title="TRACE-X API", version="1.0.0")

is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
default_cors = "" if is_production else "http://localhost:5173,http://127.0.0.1:5173"
raw_cors = os.getenv("CORS_ORIGINS", default_cors)
cors_origins = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]

if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def csrf_protection_middleware(request, call_next):
    """Enforce CSRF protection on state-changing methods for cookie-authenticated browser requests."""
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        path = request.url.path
        # Public or exempt endpoints
        exempt_prefixes = (
            "/auth/login",
            "/auth/register",
            "/auth/logout",
            "/auth/forgot-password",
            "/auth/reset-password",
            "/contact",
            "/health",
        )
        if not any(path.startswith(prefix) for prefix in exempt_prefixes):
            # Only enforce CSRF if request uses ambient browser cookie session and NOT an explicit Authorization header or edge device token
            has_auth_header = request.headers.get("Authorization", "").startswith("Bearer ")
            has_device_token = bool(request.headers.get("X-Device-Token"))
            if request.cookies.get("access_token") and not has_auth_header and not has_device_token:
                cookie_csrf = request.cookies.get(CSRF_COOKIE_NAME)
                header_csrf = request.headers.get(CSRF_HEADER_NAME) or request.headers.get("x-csrf-token")
                if not cookie_csrf or not header_csrf or not hmac.compare_digest(cookie_csrf, header_csrf):
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF validation failed: Missing or invalid CSRF token"},
                    )
    return await call_next(request)


@app.middleware("http")
async def add_security_and_cache_headers(request, call_next):
    response = await call_next(request)
    path = request.url.path

    # Standard security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Strict Cache-Control: Guarantee zero caching for private telemetry & auth data
    if any(
        path.startswith(prefix)
        for prefix in (
            "/devices",
            "/locations",
            "/status-history",
            "/dashboard",
            "/users",
            "/auth",
            "/contact",
        )
    ):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        response.headers["Pragma"] = "no-cache"
    elif path == "/health":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"

    return response


logger = logging.getLogger("tracex.api")


@app.get("/")
def home():
    return {"message": "TRACE-X Backend is running"}


@app.get("/health")
def health_check(
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        # Fast query with strict 5-second timeout to prevent connection hangs
        db.execute(text("SELECT 1").execution_options(timeout=5))
        db_status = "connected"
    except Exception as e:
        logger.warning(f"Database health check probe failed: {e}")
        db_status = "disconnected"

    if db_status != "connected":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "degraded",
            "api": "online",
            "database": "disconnected",
        }

    return {
        "status": "healthy",
        "api": "online",
        "database": "connected",
    }


app.include_router(users_router)
app.include_router(devices_router)
app.include_router(locations_router)
app.include_router(status_history_router)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(contact_router)
