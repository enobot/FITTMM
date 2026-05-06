import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, Float, String, ForeignKey, Date
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Create the engine and base class
engine = create_engine(DATABASE_URL)
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

    workouts = relationship("Workout", back_populates="plan")
    
class Workout(Base):
    __tablename__ = 'workouts'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    planid = Column(ForeignKey("workout_plans.id"), index=True)
    name = Column(String(50), nullable=False)
    description = Column(String(250))

    plan = relationship("WorkoutPlan", back_populates="workouts")
    workout_exercises = relationship("WorkoutExercise", back_populates="workout")

class Exercise(Base):
    __tablename__ = 'exercises'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    userid = Column(Integer, ForeignKey("users.id"), nullable=True)         # Null for global exercises
    name = Column(String(50), nullable=False)
    description = Column(String(250))
    image = Column(String(500))


# Join table to reuse exercises between workouts
class WorkoutExercise(Base):
    __tablename__ = 'workout_exercises'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True) 
    workoutid = Column(ForeignKey("workouts.id"), index=True)
    exerciseid = Column(ForeignKey("exercises.id"), index=True)
    sets = Column(Integer, nullable=True)
    reps = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    duration = Column(Float, nullable=True)
    day_of_week = Column(Integer)       # 0 - 6 int representing days of the week, Sun = 0, Mon = 1... Sat = 6

    workout = relationship("Workout", back_populates="workout_exercises")
    exercise = relationship("Exercise")

# Track user progress of workouts
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