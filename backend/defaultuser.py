from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import SessionLocal, User
from datetime import date
from sqlalchemy import func 
from core.security import hash_password

def register_default_user():
    session = SessionLocal()

    fname = "John"
    lname = "Doe"
    email = "cpsc362@gmail.com"
    password = "12345"
    weight = 180
    height = 63
    date_of_birth = date(2000, 1, 1)

    # Hash the given password to store in the database
    password_hash = hash_password(password)

    # Check if an account with that email already exists in the database
    existing_user = session.query(User).where(func.lower(User.email) == email.lower()).first()
    if not existing_user:
        # Create a new user with the given data
        user = User(fname = fname, lname = lname, email = email.lower(), password_hash = password_hash,
            date_of_birth = date_of_birth, weight = weight, height = height)
        
        session.add(user)
        session.commit()
        session.refresh(user)

    session.close()