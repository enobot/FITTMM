from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import bmi

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bmi.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Fitness App API Running"}
