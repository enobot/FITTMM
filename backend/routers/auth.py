from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import core.crud as crud, core.schemas as schemas
from core.database import get_db
from core.security import create_access_token

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = crud.authenticate_user(db,
                                     email=form_data.username, # Email stored in username field
                                     password=form_data.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": str(db_user.id)})
    return schemas.Token(access_token=access_token, token_type="bearer")

@router.post("/register", response_model=schemas.UserReturn)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    email_norm = str(payload.email).lower()
    db_user = crud.get_user_by_email(db, email=email_norm)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    # gender is accepted for API/UI parity; no users.gender column yet — ignored here
    user = schemas.UserCreate(
        email=payload.email,
        password=payload.password,
        fname=payload.fname.strip(),
        lname=payload.lname.strip(),
        weight=payload.weight,
        height=payload.height,
        date_of_birth=payload.date_of_birth,
    )
    new_user = crud.create_user(db=db, user=user)
    return schemas.UserReturn(id=new_user.id, email=new_user.email)
