import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import bmi, auth, workout
from core.defaultentries import register_default_user
from core.database import engine, ensure_exercises_schema, ensure_missing_tables
from contextlib import asynccontextmanager


def _cors_origins():
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    # localhost and 127.0.0.1 are different browser origins — include both for dev
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup:
    ensure_missing_tables(engine)
    ensure_exercises_schema(engine)
    register_default_user()

    yield

    # Shutdown:

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    # Dev server "On Your Network" (e.g. http://192.168.1.152:3000) calling API directly needs this.
    allow_origin_regex=r"http://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bmi.router, prefix="/api")
app.include_router(auth.router, prefix="/auth")
app.include_router(workout.router, prefix="/workout")

@app.get("/")
def root():
    return {"message": "Fitness App API Running"}


