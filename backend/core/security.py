from datetime import datetime, timedelta, timezone
from pwdlib import PasswordHash
import jwt

from config import settings

password_hash = PasswordHash.recommended()

# Hash a given password and return the new hash
def get_password_hash(password: str) -> str:
    return password_hash.hash(password)

# Verify the input password with a stored hash
def verify_password(password: str, hash: str) -> bool:
    return password_hash.verify(password, hash)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt
