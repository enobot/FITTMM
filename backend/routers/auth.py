from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import core.crud as crud, core.schemas as schemas
from core.database import (
    get_db,
    User,
    WorkoutPlan,
    WorkoutSession,
    UserProgress,
    Exercise,
)
from core.security import create_access_token, get_current_user

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = crud.authenticate_user(db,
                                     email=form_data.username, # Email stored in username field
                                     password=form_data.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": str(db_user.id)})
    return schemas.Token(access_token=access_token, token_type="bearer")

@router.post("/register", response_model=schemas.UserReturn)
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


@router.delete("/me/data")
def wipe_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Removes workout plans, sessions, progress, user-created exercises,
    and profile fields other than email, password_hash, fname, lname.
    """
    uid = current_user.id

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

    current_user.gender = None
    current_user.weight = None
    current_user.height = None
    current_user.date_of_birth = date(1900, 1, 1)

    db.commit()
    db.refresh(current_user)
    return {"ok": True}
