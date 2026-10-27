import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text
from routers import bmi, auth, workout, profile
from config import settings
from core.defaultentries import register_default_user
from core.database import engine, SessionLocal, ensure_exercises_schema, ensure_missing_tables
from core.exercise_library import seed_exercise_library
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


def _cors_origins():
    raw = settings.CORS_ORIGINS.strip()
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    # localhost and 127.0.0.1 are different browser origins — include both for dev
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def _cors_origin_regex():
    # Dev server "On Your Network" (e.g. http://192.168.1.152:3000) calling API directly needs this.
    # Production sets CORS_ORIGINS explicitly, which turns this off.
    if settings.CORS_ORIGINS.strip():
        return None
    return r"http://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup:
    ensure_missing_tables(engine)
    ensure_exercises_schema(engine)
    if settings.SEED_DEMO_USER:
        register_default_user()
    if settings.SEED_EXERCISE_LIBRARY:
        try:
            with SessionLocal() as session:
                seed_exercise_library(session)
        except Exception as exc:  # the API still works without the library
            logger.warning("Exercise library seeding failed: %s", exc)

    yield

    # Shutdown:

app = FastAPI(title="FITTMM API", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=_cors_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bmi.router, prefix="/api")
app.include_router(auth.router, prefix="/auth")
app.include_router(workout.router, prefix="/workout")
app.include_router(profile.router, prefix="/profile")

@app.get("/")
def root():
    return {"message": "Fitness App API Running"}


@app.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}
