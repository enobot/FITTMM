from pydantic import BaseModel, EmailStr


# Properties to receive via API on user creation
class UserCreate(BaseModel):
    email: EmailStr
    password: str


# Properties to return
class User(BaseModel):
    id: int
    email: EmailStr

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
