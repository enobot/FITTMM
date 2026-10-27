from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import core.crud as crud, core.schemas as schemas
from config import settings
from core.database import (
    get_db,
    User,
    WorkoutPlan,
    WorkoutSession,
    UserProgress,
    Exercise,
    WeightEntry,
)
from core.security import create_access_token, get_current_user

router = APIRouter()


def require_legacy_password_auth():
    # The apps sign in with Firebase; these endpoints remain for API clients
    # and tests, and are switched off in production.
    if not settings.ENABLE_LEGACY_PASSWORD_AUTH:
        raise HTTPException(
            status_code=403,
            detail="Password sign-in moved to Firebase. Use the app's sign-in page.",
        )


@router.post("/login", response_model=schemas.Token, dependencies=[Depends(require_legacy_password_auth)])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = crud.authenticate_user(db,
                                     email=form_data.username, # Email stored in username field
                                     password=form_data.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": str(db_user.id)})
    return schemas.Token(access_token=access_token, token_type="bearer")

@router.post("/register", response_model=schemas.UserReturn, dependencies=[Depends(require_legacy_password_auth)])
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = crud.create_user(db=db, user=user)
    return schemas.UserReturn(id=new_user.id, email=new_user.email)


@router.get("/me", response_model=schemas.UserMe)
def read_me(current_user: User = Depends(get_current_user)):
    return schemas.UserMe(
        id=current_user.id,
        email=current_user.email,
        fname=current_user.fname,
        lname=current_user.lname,
    )


def _delete_training_data(db: Session, uid: int):
    db.query(UserProgress).filter(UserProgress.userid == uid).delete(
        synchronize_session=False
    )

    db.query(WorkoutSession).filter(WorkoutSession.userid == uid).delete(
        synchronize_session=False
    )

    for plan in db.query(WorkoutPlan).filter(WorkoutPlan.userid == uid).all():
        db.delete(plan)
    db.flush()

    db.query(Exercise).filter(Exercise.userid == uid).delete(synchronize_session=False)
    db.query(WeightEntry).filter(WeightEntry.userid == uid).delete(synchronize_session=False)


@router.delete("/me/data")
def wipe_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Removes workout plans, sessions, progress, user-created exercises,
    weight history, and profile fields other than email, sign-in and name.
    """
    _delete_training_data(db, current_user.id)

    current_user.gender = None
    current_user.weight = None
    current_user.height = None
    current_user.goal_weight = None
    current_user.date_of_birth = None

    db.commit()
    db.refresh(current_user)
    return {"ok": True}


@router.delete("/me")
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes the user and all their data. The app deletes the Firebase
    account itself right after this succeeds."""
    _delete_training_data(db, current_user.id)
    db.delete(current_user)
    db.commit()
    return {"ok": True}
