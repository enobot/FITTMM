from sqlalchemy.orm import Session
import core.schemas as schemas
from core.database import User, SessionLocal
from core import security

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

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
