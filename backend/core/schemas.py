from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import date, datetime
from typing import Optional, Any

# Properties to receive via API on user creation
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    fname: str
    lname: str
    date_of_birth: date
    gender: str
    weight: float
    height: int


# Properties to return
class UserReturn(BaseModel):
    id: int
    email: EmailStr

    model_config = {"from_attributes": True}


class UserMe(BaseModel):
    id: int
    email: EmailStr
    fname: str
    lname: str

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str

# ----- Workout Schemas -----
class WorkoutExerciseCreate(BaseModel):
    exerciseid: int
    day_of_week: int


class WorkoutCreate(BaseModel):
    name: str
    description: str
    workout_exercises: list[WorkoutExerciseCreate]


class WorkoutPlanCreate(BaseModel):
    name: str
    description: str
    workouts: list[WorkoutCreate]


class WorkoutExerciseUpdate(BaseModel):
    sets: int
    reps: int
    weight: float
    duration: float


class WorkoutExerciseReturn(BaseModel):
    id: int
    workoutid: int
    exerciseid: int
    sets: Optional[int]
    reps: Optional[int]
    weight: Optional[float]
    duration: Optional[float]
    day_of_week: int
    name: Optional[str] = None

    model_config = {"from_attributes": True}


class WorkoutReturn(BaseModel):
    id: int
    name: str
    description: str
    workout_exercises: list[WorkoutExerciseReturn]

    model_config = {"from_attributes": True}


class WorkoutPlanReturn(BaseModel):
    id: int
    name: str
    description: str
    workouts: list[WorkoutReturn]


class ExerciseCreate(BaseModel):
    name: str
    description: str = ""
    image: str = ""
    body_part: Optional[str] = Field(None, max_length=50)

    @field_validator("body_part", mode="before")
    @classmethod
    def normalize_body_part(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip().lower()
            return s if s else None
        return v


class ExerciseReturn(BaseModel):
    id: int
    name: str
    description: str
    image: str
    body_part: Optional[str] = None
    userid: Optional[int] = None

    model_config = {"from_attributes": True}


class UserProgressCreate(BaseModel):
    userid: int
    workoutid: int
    exerciseid: int
    sets_completed: int
    reps_completed: int
    weight: float
    duration: float
    date_start: date
    date_end: date


class WorkoutSessionCreate(BaseModel):
    payload: dict[str, Any]


class WorkoutSessionOut(BaseModel):
    id: int
    logged_at: datetime
    payload: dict[str, Any]

    model_config = {"from_attributes": True}


class UserProgressReturn(BaseModel):
    id: int
    userid: int
    workoutid: int
    exerciseid: int
    sets_completed: int
    reps_completed: int
    weight: float
    duration: float
    date_start: date
    date_end: date

    model_config = {"from_attributes": True}