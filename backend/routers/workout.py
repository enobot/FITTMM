from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import core.crud as crud, core.schemas as schemas
from core.database import get_db, WorkoutPlan, Workout, Exercise, UserProgress
from core.security import create_access_token

router = APIRouter()

@router.post("/plans", response_model=schemas.Token)
async def createplan(plan: schemas.WorkoutPlan, db: Session = Depends(get_db)):
    workoutplan = WorkoutPlan(id = plan.id, userid = plan.userid,
                          name = plan.name, description = plan.description)
    db.add(workoutplan)
    
    for workout in plan.workouts:
        wo = Workout(id = workout.id, planid = plan.id, name = workout.name,
                     workout_type = workout.workout_type, description = workout.description,
                     exercises = list[Exercise])
        db.add(wo)
    db.commit()
    db.refresh(db)
    return

@router.get("/plans", response_model=list[WorkoutPlan])
async def getplans(userid: int, db: Session = Depends(get_db)):
    return db.query(WorkoutPlan).filter(WorkoutPlan.userid == userid).all()

@router.get("/plans/{planid}", response_model=schemas.WorkoutPlan)
async def getplan(planid: int, db: Session = Depends(get_db)):
    return db.query(WorkoutPlan).filter(WorkoutPlan.id == planid).first()

@router.get("/workouts/{workoutid}", response_model=schemas.Workout)
async def getworkout(workoutid: int, db: Session = Depends(get_db)):
    return db.query(Workout).filter(Workout.id == workoutid).first()

@router.get("/exercises", response_model=list[schemas.Exercise])
async def getexercises(db: Session = Depends(get_db)):
    return db.query(Exercise).all()

@router.post("/exercises", response_model=schemas.Token)
async def createexercise(exercise: schemas.Exercise, db: Session = Depends(get_db)):
    db_exercise = Exercise(id = exercise.id, name = exercise.name, description = exercise.description)
    
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    return

@router.post("/progress", response_model=schemas.Token)
async def logprogress(db: Session = Depends(get_db)):
    return

@router.get("/progress", response_model=schemas.Token)
async def getprogress(userid: int, db: Session = Depends(get_db)):
    return db.query(UserProgress).filter(UserProgress.userid == userid).first()