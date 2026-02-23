import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, Column, Integer, Float, String, ForeignKey, Date
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Create the engine and base class
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Tables
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    email = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(100), nullable=False)
    age = Column(Integer)
    weight = Column(Float)
    height = Column(Float)

# Create the tables in the database
# Base.metadata.create_all(engine)

print("Tables created successfully!")