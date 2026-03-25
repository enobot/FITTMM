from pydantic import BaseModel, EmailStr
from datetime import date

# Properties to receive via API on user creation
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    fname: str
    lname: str
    date_of_birth: date
    gender: str
    weight: float
    height: int
    
# Properties to return
class UserReturn(BaseModel):
    id: int
    email: EmailStr

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
