import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.auth_dependencies import get_current_user
from app.database.dependencies import get_db
from app.models.user import User
from app.routes.users import router as users_router
from app.routes.devices import router as devices_router
from app.routes.location import router as locations_router
from app.routes.status_history import router as status_history_router
from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router

app = FastAPI(title="TRACE-X API", version="1.0.0")

default_cors = "http://localhost:5173,http://127.0.0.1:5173"
raw_cors = os.getenv("CORS_ORIGINS", default_cors)
cors_origins = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "TRACE-X Backend is running"}


@app.get("/health")
def health_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "api": "online",
        "database": db_status,
    }


app.include_router(users_router)
app.include_router(devices_router)
app.include_router(locations_router)
app.include_router(status_history_router)
app.include_router(auth_router)
app.include_router(dashboard_router)
