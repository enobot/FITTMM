from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import core.crud as crud, core.schemas as schemas
from core.database import get_db, User, WorkoutPlan, Workout, Exercise, WorkoutExercise, UserProgress
from core.security import get_current_user

router = APIRouter()

@router.post("/plans", response_model=schemas.WorkoutPlanReturn)
async def createplan(plan: schemas.WorkoutPlanCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    workoutplan = WorkoutPlan(userid = current_user.id, name = plan.name, description = plan.description)
    db.add(workoutplan)
    db.flush()

    for workout in plan.workouts:
        wo = Workout(planid = workoutplan.id, name = workout.name,
                     workout_type = workout.workout_type,
                     description = workout.description)
        db.add(wo)
        db.flush()
        for exercise in workout.exercises:
            if not crud.get_exercise_by_id(db, exercise.id):
                raise HTTPException(status_code=404, detail="Exercise not found")
            else:
                woe = WorkoutExercise(workoutid = wo.id, exerciseid = exercise.id,
                                    sets = exercise.sets, reps = exercise.reps,
                                    weight = exercise.weight, duration = exercise.duration)
                db.add(woe)
    db.commit()
    db.refresh(workoutplan)
    return plan

# Get all workout plans for the current user
@router.get("/plans", response_model=list[schemas.WorkoutPlanReturn])
def get_plans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plans = db.query(WorkoutPlan).filter(WorkoutPlan.userid == current_user.id).all()

    if not plans:
        raise HTTPException(status_code=404, detail="Plan not found")

    return plans

# Get a single plan from its id
@router.get("/plans/{plan_id}", response_model=schemas.WorkoutPlanReturn)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    return plan

@router.get("/workouts/{workoutid}", response_model=schemas.WorkoutReturn)
async def getworkout(workoutid: int, db: Session = Depends(get_db)):
    return db.query(Workout).filter(Workout.id == workoutid).first()

@router.get("/exercises", response_model=list[schemas.ExerciseReturn])
async def getexercises(db: Session = Depends(get_db)):
    return db.query(Exercise).all()

@router.post("/exercises", response_model=schemas.Token)
async def createexercise(name: str, description: str, db: Session = Depends(get_db)):
    if crud.get_exercise_by_name(db, name):
        raise HTTPException(status_code=400, detail="Exercise with name '" + name + "' already exists")
    else:
        db_exercise = Exercise(name = name, description = description)

        db.add(db_exercise)
        db.commit()
        db.refresh(db_exercise)
    return

# TODO:
#@router.post("/progress", response_model=schemas.Token)
#async def logprogress(progress: schemas.UserProgress, db: Session = Depends(get_db)):
#    db_progress = UserProgress(userid = progress.userid, workoutid = progress.workoutid,
#                               exerciseid = progress.exerciseid, sets_completed = progress.sets_completed,
#                              reps_completed = progress.reps_completed, weight = progress.weight,
#                               duration = progress.duration, date = progress.date)
#    
#    db.add(db_progress)
#    db.commit()
#    db.refresh(db_progress)
#    return
#
#@router.get("/progress", response_model=schemas.Token)
#async def getprogress(userid: int, db: Session = Depends(get_db)):
#    return db.query(UserProgress).filter(UserProgress.userid == userid).first()