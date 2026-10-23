from sqlalchemy.orm import Session
from sqlalchemy import func
import core.schemas as schemas
from core.database import User, Exercise
from core import security

def get_user_by_email(db: Session, email: str):
    if not email:
        return None
    normalized = email.strip().lower()
    return db.query(User).filter(User.email == normalized).first()

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user or not security.verify_password(password, user.password_hash):
        return False
    return user

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = User(fname = user.fname, lname = user.lname, email = user.email.lower(), password_hash = hashed_password,
          date_of_birth = user.date_of_birth, gender = user.gender, weight = user.weight, height = user.height)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_exercise_by_id(db: Session, id: int):
    return db.query(Exercise).filter(Exercise.id == id).first()

def get_exercise_by_name(db: Session, name: str):
    if not name:
        return None
    n = name.strip()
    if not n:
        return None
    return (
        db.query(Exercise)
        .filter(func.lower(Exercise.name) == func.lower(n))
        .first()
    )
