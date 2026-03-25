from pydantic import BaseModel, EmailStr, Field
from datetime import date

# Registration from signup form (email, password, profile); weight/height default if omitted
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    fname: str = Field(min_length=1, max_length=50)
    lname: str = Field(min_length=1, max_length=50)
    date_of_birth: date
    gender: str | None = Field(default=None, max_length=20)
    weight: float = 180.0
    height: int = 63

# Properties to receive via API on user creation
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    fname: str
    lname: str
    weight: float
    height: int
    date_of_birth: date

# Properties to return
class UserReturn(BaseModel):
    id: int
    email: EmailStr

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str
