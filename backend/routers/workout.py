from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
import core.crud as crud
import core.schemas as schemas
from core.database import (
    get_db,
    User,
    WorkoutPlan,
    Workout,
    Exercise,
    WorkoutExercise,
    WorkoutSession,
    UserProgress,
)
from core.security import get_current_user

router = APIRouter()


def serialize_workout_plan(plan: WorkoutPlan) -> schemas.WorkoutPlanReturn:
    workout_returns = []
    for wo in plan.workouts:
        we_list = []
        for woe in wo.workout_exercises:
            ex = woe.exercise
            we_list.append(
                schemas.WorkoutExerciseReturn(
                    id=woe.id,
                    workoutid=woe.workoutid,
                    exerciseid=woe.exerciseid,
                    sets=woe.sets,
                    reps=woe.reps,
                    weight=woe.weight,
                    duration=woe.duration,
                    day_of_week=woe.day_of_week,
                    name=ex.name if ex else None,
                )
            )
        workout_returns.append(
            schemas.WorkoutReturn(
                id=wo.id,
                name=wo.name,
                description=wo.description or "",
                workout_exercises=we_list,
            )
        )
    return schemas.WorkoutPlanReturn(
        id=plan.id,
        name=plan.name,
        description=plan.description or "",
        workouts=workout_returns,
    )


def load_plan_for_user(db: Session, user_id: int) -> WorkoutPlan | None:
    return (
        db.query(WorkoutPlan)
        .options(
            joinedload(WorkoutPlan.workouts)
            .joinedload(Workout.workout_exercises)
            .joinedload(WorkoutExercise.exercise)
        )
        .filter(WorkoutPlan.userid == user_id)
        .first()
    )


@router.post("/plans", response_model=schemas.WorkoutPlanReturn)
async def create_plan(
    plan: schemas.WorkoutPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workoutplan = WorkoutPlan(
        userid=current_user.id, name=plan.name, description=plan.description
    )
    db.add(workoutplan)
    db.flush()

    for workout in plan.workouts:
        wo = Workout(
            planid=workoutplan.id,
            name=workout.name,
            description=workout.description,
        )
        db.add(wo)
        db.flush()
        for exercise in workout.workout_exercises:
            if not crud.get_exercise_by_id(db, exercise.exerciseid):
                raise HTTPException(
                    status_code=404,
                    detail=f"Exercise {exercise.exerciseid} not found",
                )

            if exercise.day_of_week not in range(7):
                raise HTTPException(
                    status_code=400,
                    detail=f"{exercise.day_of_week} is not a valid day of the week",
                )

            woe = WorkoutExercise(
                workoutid=wo.id,
                exerciseid=exercise.exerciseid,
                day_of_week=exercise.day_of_week,
            )
            db.add(woe)
    db.commit()

    loaded = load_plan_for_user(db, current_user.id)
    if not loaded:
        raise HTTPException(status_code=500, detail="Plan created but could not be loaded")
    return serialize_workout_plan(loaded)


@router.get("/plan", response_model=schemas.WorkoutPlanReturn)
def get_plan(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = load_plan_for_user(db, current_user.id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return serialize_workout_plan(plan)


@router.put("/plan", response_model=schemas.WorkoutPlanReturn)
def update_plan(
    plan: schemas.WorkoutPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing_plan = (
        db.query(WorkoutPlan)
        .options(joinedload(WorkoutPlan.workouts))
        .filter(WorkoutPlan.userid == current_user.id)
        .first()
    )

    if existing_plan:
        wo_ids = [w.id for w in existing_plan.workouts]
        if wo_ids:
            db.query(UserProgress).filter(UserProgress.workoutid.in_(wo_ids)).delete(
                synchronize_session=False
            )
        db.delete(existing_plan)
        db.flush()

    new_plan = WorkoutPlan(
        userid=current_user.id, name=plan.name, description=plan.description
    )
    db.add(new_plan)
    db.flush()

    for workout in plan.workouts:
        wo = Workout(
            planid=new_plan.id,
            name=workout.name,
            description=workout.description,
        )
        db.add(wo)
        db.flush()

        for we_in in workout.workout_exercises:
            if not crud.get_exercise_by_id(db, we_in.exerciseid):
                raise HTTPException(
                    status_code=404,
                    detail=f"Exercise {we_in.exerciseid} not found",
                )
            if we_in.day_of_week not in range(7):
                raise HTTPException(
                    status_code=400,
                    detail=f"{we_in.day_of_week} is not a valid day of the week",
                )
            woe = WorkoutExercise(
                workoutid=wo.id,
                exerciseid=we_in.exerciseid,
                day_of_week=we_in.day_of_week,
            )
            db.add(woe)

    db.commit()

    loaded = load_plan_for_user(db, current_user.id)
    if not loaded:
        raise HTTPException(status_code=500, detail="Plan updated but could not be loaded")
    return serialize_workout_plan(loaded)


@router.patch("/workout-exercises/{workout_exercise_id}")
def update_workout_exercise(
    workout_exercise_id: int,
    data: schemas.WorkoutExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    woe = (
        db.query(WorkoutExercise)
        .join(Workout)
        .join(WorkoutPlan)
        .filter(
            WorkoutExercise.id == workout_exercise_id,
            WorkoutPlan.userid == current_user.id,
        )
        .first()
    )

    if not woe:
        raise HTTPException(status_code=404, detail="Workout exercise not found")

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


@router.post("/exercises", response_model=schemas.ExerciseReturn)
def create_exercise(
    exercise: schemas.ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if crud.get_exercise_by_name(db, exercise.name):
        raise HTTPException(
            status_code=400,
            detail="Exercise with name '" + exercise.name + "' already exists",
        )

    db_exercise = Exercise(
        name=exercise.name.strip(),
        userid=current_user.id,
        description=exercise.description or "",
        image=exercise.image or "",
        body_part=exercise.body_part,
    )

    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)

    return db_exercise


@router.get("/exercises", response_model=list[schemas.ExerciseReturn])
def get_exercises(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exercises = (
        db.query(Exercise)
        .filter((Exercise.userid == None) | (Exercise.userid == current_user.id))
        .all()
    )

    exercises_list = []
    for exercise in exercises:
        exercises_list.append(
            schemas.ExerciseReturn(
                id=exercise.id,
                name=exercise.name,
                description=exercise.description or "",
                image=exercise.image or "",
                body_part=exercise.body_part,
                userid=exercise.userid,
            )
        )

    return exercises_list


@router.post("/sessions", response_model=schemas.WorkoutSessionOut)
def create_session(
    body: schemas.WorkoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = WorkoutSession(userid=current_user.id, payload=body.payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/sessions", response_model=list[schemas.WorkoutSessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.userid == current_user.id)
        .order_by(WorkoutSession.logged_at.desc())
        .limit(500)
        .all()
    )
    return rows
