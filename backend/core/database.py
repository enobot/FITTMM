import logging
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    Float,
    String,
    ForeignKey,
    Date,
    DateTime,
    JSON,
    inspect,
    text,
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

logger = logging.getLogger(__name__)

EXERCISES_USERID_FK_NAME = "fk_exercises_userid_users"

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Create the engine and base class (pre_ping avoids hung queries on stale MySQL connections)
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(autocommit=False, bind=engine)
Base = declarative_base()

# --------------- User Table ---------------
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    fname = Column(String(50), nullable=False)
    lname = Column(String(50), nullable=False)
    email = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(50))
    weight = Column(Float)
    height = Column(Float)

    plan = relationship("WorkoutPlan")

# --------------- Workout Tables ---------------
class WorkoutPlan(Base):
    __tablename__ = 'workout_plans'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    userid = Column(ForeignKey("users.id"), index=True)
    name = Column(String(50), nullable=False)
    description = Column(String(250))

    workouts = relationship(
        "Workout", back_populates="plan", cascade="all, delete-orphan"
    )

class Workout(Base):
    __tablename__ = 'workouts'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    planid = Column(ForeignKey("workout_plans.id"), index=True)
    name = Column(String(50), nullable=False)
    description = Column(String(250))

    plan = relationship("WorkoutPlan", back_populates="workouts")
    workout_exercises = relationship(
        "WorkoutExercise", back_populates="workout", cascade="all, delete-orphan"
    )

class Exercise(Base):
    """Rows reference workouts via ``workout_exercises.exerciseid`` → ``exercises.id``."""

    __tablename__ = "exercises"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    userid = Column(Integer, ForeignKey("users.id"), nullable=True)         # Null for global exercises
    name = Column(String(50), nullable=False)
    description = Column(String(250))
    image = Column(String(500))
    body_part = Column(String(50), nullable=True)


# Join table to reuse exercises between workouts
class WorkoutExercise(Base):
    """Assignment of an exercise from the ``exercises`` catalog to a workout."""

    __tablename__ = "workout_exercises"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    workoutid = Column(ForeignKey("workouts.id"), index=True)
    exerciseid = Column(ForeignKey("exercises.id"), index=True)
    # "sets" is reserved in MySQL; explicit name + quote so SQL emits `sets`.
    sets = Column("sets", Integer, nullable=True, quote=True)
    reps = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    duration = Column(Float, nullable=True)
    day_of_week = Column(Integer)       # 0 - 6 int representing days of the week, Sun = 0, Mon = 1... Sat = 6

    workout = relationship("Workout", back_populates="workout_exercises")
    exercise = relationship("Exercise")

# Track user progress of workouts
class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    userid = Column(ForeignKey("users.id"), index=True, nullable=False)
    logged_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    payload = Column(JSON, nullable=False)


class UserProgress(Base):
    __tablename__ = 'user_progress'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    userid = Column(ForeignKey("users.id"), index=True)
    workoutid = Column(ForeignKey("workouts.id"), index=True)
    exerciseid = Column(ForeignKey("exercises.id"), index=True)
    sets_completed = Column(Integer)
    reps_completed = Column(Integer)
    weight = Column(Float)
    duration = Column(Float)
    date_start = Column(Date)
    date_end = Column(Date)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_missing_tables(engine):
    """Create ORM tables if absent (e.g. workout_exercises missing after partial DB setup).

    Prefer `alembic upgrade head` long-term; this auto-heals common drift.
    """
    if not DATABASE_URL:
        return
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
    except Exception as exc:
        logger.warning("ensure_missing_tables: %s", exc)


def ensure_exercises_schema(engine):
    """Ensure ``exercises`` exists, then add ORM columns if missing (Alembic drift)."""
    if not DATABASE_URL:
        return
    try:
        insp = inspect(engine)
        if "exercises" not in insp.get_table_names():
            Exercise.__table__.create(bind=engine, checkfirst=True)
            insp = inspect(engine)
        if "exercises" not in insp.get_table_names():
            logger.warning("ensure_exercises_schema: exercises table still missing after create")
            return
        cols = {c["name"] for c in insp.get_columns("exercises")}
    except Exception as exc:
        logger.warning("ensure_exercises_schema: inspect/create failed: %s", exc)
        return

    try:
        with engine.begin() as conn:
            if "userid" not in cols:
                conn.execute(text("ALTER TABLE exercises ADD COLUMN userid INT NULL"))
                conn.execute(
                    text(
                        "ALTER TABLE exercises ADD CONSTRAINT "
                        + EXERCISES_USERID_FK_NAME
                        + " FOREIGN KEY (userid) REFERENCES users(id)"
                    )
                )
            if "image" not in cols:
                conn.execute(
                    text("ALTER TABLE exercises ADD COLUMN image VARCHAR(500) NULL")
                )
            if "body_part" not in cols:
                conn.execute(
                    text("ALTER TABLE exercises ADD COLUMN body_part VARCHAR(50) NULL")
                )
    except Exception as exc:
        logger.warning("ensure_exercises_schema: ALTER failed: %s", exc)