from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import bmi, auth, workout
from core.defaultentries import register_default_user
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup:
    register_default_user()

    yield

    # Shutdown:

app = FastAPI(lifespan=lifespan)

origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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


