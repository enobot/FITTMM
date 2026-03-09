from sqlalchemy.orm import Session
import schemas, security
from database import User


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not security.verify_password(password, user.password_hash):
        return False
    return user


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = User(email=user.email, password_hash=hashed_password, name="New User")
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
