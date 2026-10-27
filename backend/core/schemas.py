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
    # Library fields (empty for custom exercises)
    slug: Optional[str] = None
    category: Optional[str] = None
    equipment: Optional[str] = None
    level: Optional[str] = None
    primary_muscles: list[str] = []
    images: list[str] = []

    model_config = {"from_attributes": True}


class ExerciseDetail(ExerciseReturn):
    force: Optional[str] = None
    mechanic: Optional[str] = None
    secondary_muscles: list[str] = []
    instructions: list[str] = []
    tips: list[str] = []
    video_query: str


class VideoResult(BaseModel):
    video_id: str
    title: str
    channel: str
    thumbnail: str
    published_at: Optional[str] = None
    duration_seconds: Optional[int] = None
    view_count: Optional[int] = None


class VideoSearchOut(BaseModel):
    configured: bool
    query: str
    videos: list[VideoResult]
    search_url: str
    error: Optional[str] = None


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


# ----- Profile Schemas -----
# Weight is stored in pounds and height in inches; the apps convert for display.
class ProfileOut(BaseModel):
    id: int
    email: EmailStr
    fname: str
    lname: str
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    previous_weight: Optional[float] = None
    goal_weight: Optional[float] = None
    unit_system: str = "imperial"
    bmi: Optional[float] = None
    bmi_category: Optional[str] = None
    profile_complete: bool


class ProfileUpdate(BaseModel):
    fname: Optional[str] = Field(None, max_length=50)
    lname: Optional[str] = Field(None, max_length=50)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=50)
    height: Optional[float] = Field(None, ge=20, le=108)
    weight: Optional[float] = Field(None, ge=20, le=1000)
    goal_weight: Optional[float] = Field(None, ge=20, le=1000)
    unit_system: Optional[str] = Field(None, pattern="^(imperial|metric)$")

    @field_validator("date_of_birth")
    @classmethod
    def birthday_in_range(cls, v):
        if v is None:
            return v
        today = date.today()
        if v > today:
            raise ValueError("Birthday can't be in the future")
        if v.year < 1900:
            raise ValueError("Birthday must be after 1900")
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 13:
            raise ValueError("You must be at least 13 to use FITTMM")
        return v

    @field_validator("fname", "lname", "gender", mode="before")
    @classmethod
    def strip_text(cls, v):
        return v.strip() if isinstance(v, str) else v


class WeightEntryCreate(BaseModel):
    weight: float = Field(..., ge=20, le=1000)
    recorded_on: Optional[date] = None

    @field_validator("recorded_on")
    @classmethod
    def not_in_future(cls, v):
        if v is not None and v > date.today():
            raise ValueError("Date can't be in the future")
        return v


class WeightEntryOut(BaseModel):
    id: int
    weight: float
    recorded_on: date

    model_config = {"from_attributes": True}


# ----- Volume Schemas -----
class VolumePoint(BaseModel):
    date: date
    volume: float


class WeeklyVolume(BaseModel):
    week_start: date
    volume: float
    workouts: int


class ExerciseVolume(BaseModel):
    name: str
    body_part: Optional[str] = None
    volume: float
    sets: int
    reps: int
    best_weight: float
    best_set_reps: int
    estimated_1rm: float


class BodyPartVolume(BaseModel):
    body_part: str
    volume: float
    sets: int


class VolumeSummary(BaseModel):
    days: int
    total_volume: float
    workouts: int
    sets: int
    reps: int
    this_week: float
    last_week: float
    daily: list[VolumePoint]
    weekly: list[WeeklyVolume]
    by_exercise: list[ExerciseVolume]
    by_body_part: list[BodyPartVolume]


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