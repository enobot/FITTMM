from pydantic import BaseModel, EmailStr
from datetime import date
from typing import Optional

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

    model_config = {"from_attributes": True}

class WorkoutCreate(BaseModel):
    name: str
    description: str
    workout_exercises: list[WorkoutExerciseCreate]

class WorkoutReturn(BaseModel):
    id: int
    name: str
    description: str
    workout_exercises: list[WorkoutExerciseReturn]
    
    model_config = {"from_attributes": True}

class WorkoutExerciseCreate(BaseModel):
    exerciseid: int
    day_of_week: int

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
    
    model_config = {"from_attributes": True}

class ExerciseCreate(BaseModel):
    name: str
    description: str
    image: str

class ExerciseReturn(BaseModel):
    id: int
    name: str
    description: str
    image: str
    
    model_config = {"from_attributes": True}

class UserProgressCreate(BaseModel):
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