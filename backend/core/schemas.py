from pydantic import BaseModel, EmailStr
from datetime import date


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


class Token(BaseModel):
    access_token: str
    token_type: str

# ----- Workout Schemas -----
class WorkoutPlanCreate(BaseModel):
    name: str
    description: str
    workouts: list[WorkoutCreate]

class WorkoutPlanReturn(BaseModel):
    id: int
    name: str
    description: str
    workouts: list[WorkoutReturn]

class WorkoutCreate(BaseModel):
    name: str
    workout_type: str
    description: str
    exercises: list[ExerciseCreate]

class WorkoutReturn(BaseModel):
    id: int
    name: str
    workout_type: str
    description: str
    exercises: list[WorkoutExerciseReturn]

class ExerciseCreate(BaseModel):
    id: int
    name: str
    description: str
    sets: int
    reps: int
    weight: float
    duration: float

class ExerciseReturn(BaseModel):
    id: int

class WorkoutExerciseReturn(BaseModel):
    id: int
    name: str
    sets: int
    reps: int
    weight: float
    duration: float

class UserProgressCreate(BaseModel):
    id: int
    userid: int
    workoutid: int
    exerciseid: int
    sets_completed: int
    reps_completed: int
    weight: float
    duration: float
    date: date
