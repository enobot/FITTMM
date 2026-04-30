from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
import core.crud as crud, core.schemas as schemas
from core.database import get_db, User, WorkoutPlan, Workout, Exercise, WorkoutExercise, UserProgress
from core.security import get_current_user

router = APIRouter()

@router.post("/plans", response_model=schemas.WorkoutPlanReturn)
async def create_plan(plan: schemas.WorkoutPlanCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    workoutplan = WorkoutPlan(userid = current_user.id, name = plan.name, description = plan.description)
    db.add(workoutplan)
    db.flush()

    for workout in plan.workouts:
        wo = Workout(planid = workoutplan.id,
                     name = workout.name,
                     description = workout.description)
        db.add(wo)
        db.flush()
        for exercise in workout.workout_exercises:
            if not crud.get_exercise_by_id(db, exercise.exerciseid):
                raise HTTPException(status_code=404, detail=f"Exercise {exercise.exerciseid} not found")
            
            elif exercise.day_of_week not in range(7):
                raise HTTPException(status_code=400, detail=f"{exercise.day_of_week} is not a valid day of the week")
            
            else:
                woe = WorkoutExercise(workoutid = wo.id,
                                      exerciseid = exercise.exerciseid,
                                      day_of_week = exercise.day_of_week)
                db.add(woe)
    db.commit()
    db.refresh(workoutplan)
    return workoutplan

# Get the workout plan for the current user
@router.get("/plan", response_model=schemas.WorkoutPlanReturn)
def get_plan(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = (
        db.query(WorkoutPlan)
            .options(
                joinedload(WorkoutPlan.workouts)
                .joinedload(Workout.workout_exercises)
                .joinedload(WorkoutExercise.exercise)
            )
            .filter(WorkoutPlan.userid == current_user.id)
            .first()
        )

    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    workoutList = []
    for workout in plan.workouts:
        exerciseList = []
        for wo_exercise in workout.workout_exercises:
            exerciseList.append(schemas.WorkoutExerciseReturn(id = wo_exercise.id,
                                                              name = wo_exercise.exercise.name,
                                                              sets = wo_exercise.sets,
                                                              reps = wo_exercise.reps,
                                                              weight = wo_exercise.weight,
                                                              duration = wo_exercise.duration,
                                                              day_of_week = wo_exercise.day_of_week))
            
        workoutList.append(schemas.WorkoutReturn(id = workout.id,
                                                 name = workout.name,
                                                 description = workout.description,
                                                 exercises = exerciseList))

    return plan

# Update plan by deleting existing and recreating with new data
@router.put("/plan", response_model=schemas.WorkoutPlanReturn)
def update_plan(plan: schemas.WorkoutPlanCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing_plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.userid == current_user.id
    ).first()

    # Delete the existing plan
    if existing_plan:
        db.delete(existing_plan)
        db.flush()

    # Recreate the plan
    new_plan = WorkoutPlan(userid=current_user.id, name=plan.name, description=plan.description)
    db.add(new_plan)
    db.flush()

    for workout in plan.workouts:
        wo = Workout(planid=new_plan.id,
                     name=workout.name,
                     description=workout.description)
        db.add(wo)
        db.flush()

        for exercise in workout.exercises:
            woe = WorkoutExercise(workoutid=wo.id,
                                  exerciseid=exercise.id,
                                  day_of_week=exercise.day_of_week)
            db.add(woe)

    db.commit()
    db.refresh(new_plan)

    return new_plan

# Update a workout exercise for sets/reps/weight
@router.patch("/workout-exercises/{workout_exercise_id}")
def update_workout_exercise(workout_exercise_id: int, data: schemas.WorkoutExerciseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    woe = (db.query(WorkoutExercise)
           .join(Workout)
           .join(WorkoutPlan)
           .filter(WorkoutExercise.id == workout_exercise_id,
                   WorkoutPlan.userid == current_user.id
        ).first())

    if not woe:
        raise HTTPException(status_code=404, detail="Workout exercise not found")

    # Update only data that is given
    if data.sets is not None:
        woe.sets = data.sets
    if data.reps is not None:
        woe.reps = data.reps
    if data.weight is not None:
        woe.weight = data.weight
    if data.duration is not None:
        woe.duration = data.duration

    db.commit()
    db.refresh(woe)
    return woe

# Create a new exercise type tied to the current user
@router.post("/exercises", response_model=schemas.ExerciseReturn)
async def create_exercise(exercise: schemas.ExerciseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if crud.get_exercise_by_name(db, exercise.name):
        raise HTTPException(status_code=400, detail="Exercise with name '" + exercise.name + "' already exists")

    db_exercise = Exercise(name = exercise.name,
                           userid = current_user.id,
                           description = exercise.description,
                           image = exercise.image)

    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
        
    return db_exercise
    
# Get all global and custom user specific exercises
@router.get("/exercises", response_model=list[schemas.ExerciseReturn])
def get_exercises(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exercises = db.query(Exercise).filter(
        (Exercise.userid == None) | (Exercise.userid == current_user.id)
    ).all()

    exercisesList = []
    for exercise in exercises:
        exercisesList.append(schemas.ExerciseReturn(id = exercise.id,
                                                    name = exercise.name,
                                                    description = exercise.description,
                                                    image = exercise.image))

    return exercisesList

# TODO - User Progress tracking
#@router.post("/progress", response_model=schemas.UserProgressReturn)
#async def logprogress(progress: schemas.UserProgressCreate, db: Session = Depends(get_db)):
#    db_progress = UserProgress(userid = progress.userid, workoutid = progress.workoutid,
#                               exerciseid = progress.exerciseid, sets_completed = progress.sets_completed,
#                              reps_completed = progress.reps_completed, weight = progress.weight,
#                               duration = progress.duration, date_start = progress.date_start, date_end = progress.date_end)
#    
#    db.add(db_progress)
#    db.commit()
#    db.refresh(db_progress)
#    return
#
#@router.get("/progress", response_model=schemas.UserProgressReturn)
#async def getprogress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
#    db_progress = db.query(UserProgress).filter(UserProgress.userid == current_user.id).first()
#    if not db_progress:
#        raise HTTPException(status_code=404, detail="User progress not found")
