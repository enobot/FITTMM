from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import SessionLocal, User
from datetime import date
from sqlalchemy import func 
from core.security import hash_password, verify_password

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    fname: str
    lname: str
    email: str
    password: str
    date_of_birth: date
    weight: float
    height: float

@router.post("/login")
async def login(info: LoginRequest):
    session = SessionLocal()
    # Get the first user in the database with the given email
    user = session.query(User).where(func.lower(User.email) == info.email.lower()).first()

    # If email or password incorrect, raise an exception
    if not user or not verify_password(info.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect Email or Password")

    return {"message": "Login successful", "user_id": user.id}

@router.post("/register")
def register(info: RegisterRequest):
    session = SessionLocal()
    
    # Hash the given password to store in the database
    password_hash = hash_password(info.password)

    # Check if an account with that email already exists in the database
    existing_user = session.query(User).where(func.lower(User.email) == info.email.lower()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Account with email already exists")
    
    # Create a new user with the given data
    user = User(fname = info.fname, lname = info.lname, email = info.email.lower(), password_hash = password_hash,
          date_of_birth = info.date_of_birth, weight = info.weight, height = info.height)
    
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"message": "User created successfully", "user_id": user.id}
