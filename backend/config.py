from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT (legacy email/password tokens issued by /auth/login)
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Firebase Auth: the web and Android apps sign in with Firebase and send
    # its ID token as the Bearer token. Set FIREBASE_AUTH_EMULATOR_HOST
    # (e.g. 127.0.0.1:9099) in the environment to accept emulator tokens.
    FIREBASE_PROJECT_ID: str = "demo-fittmm"
    REQUIRE_EMAIL_VERIFICATION: bool = True

    # /auth/register and /auth/login predate Firebase. Turn them off in
    # production so every account goes through Firebase's email verification.
    ENABLE_LEGACY_PASSWORD_AUTH: bool = True

    # Startup seeding
    SEED_DEMO_USER: bool = True
    SEED_EXERCISE_LIBRARY: bool = True

    # Exercise photos from free-exercise-db (public domain), pinned to a commit
    EXERCISE_IMAGE_BASE_URL: str = (
        "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@"
        "f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/"
    )

    # YouTube Data API v3 key for exercise tutorial search (optional)
    YOUTUBE_API_KEY: str = ""
    YOUTUBE_CACHE_HOURS: int = 24 * 7

    # Comma-separated list of allowed browser origins
    CORS_ORIGINS: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
