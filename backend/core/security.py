from datetime import datetime, timedelta, timezone
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from jwt import PyJWTError
import jwt

from config import settings

from core.database import get_db, User
from core import firebase_auth

password_hash = PasswordHash.recommended()

http_bearer = HTTPBearer()

# Hash a given password and return the new hash
def get_password_hash(password: str) -> str:
    return password_hash.hash(password)

# Verify the input password with a stored hash
def verify_password(password: str, hash: str) -> bool:
    try:
        return password_hash.verify(password, hash)
    except UnknownHashError:
        # A corrupt or foreign hash is a failed login, not a server error
        return False

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


def _credentials_exception(detail="Could not validate credentials"):
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _split_name(full_name: str):
    parts = (full_name or "").strip().split(None, 1)
    first = parts[0] if parts else ""
    last = parts[1] if len(parts) > 1 else ""
    return first[:50], last[:50]


def user_from_firebase_claims(db: Session, claims: dict) -> User:
    """Find the user row for a verified Firebase token, creating it on first sign-in.

    A legacy email/password row is linked to the Firebase account only when
    Firebase says the email is verified, so nobody can claim someone else's
    data by signing up with their address.
    """
    uid = claims.get("uid") or claims.get("sub")
    if not uid:
        raise _credentials_exception()

    email = (claims.get("email") or "").strip().lower()
    email_verified = bool(claims.get("email_verified"))
    provider = firebase_auth.sign_in_provider(claims)

    if settings.REQUIRE_EMAIL_VERIFICATION and provider in ("password", "phone", "emailLink") \
            and email and not email_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email address before continuing.",
        )

    user = db.query(User).filter(User.firebase_uid == uid).first()
    if user:
        return user

    if not email:
        raise HTTPException(
            status_code=400,
            detail="This account has no email address. Sign up with email, Google or Apple.",
        )

    if email_verified:
        existing = db.query(User).filter(User.email == email).first()
        if existing and existing.firebase_uid is None:
            existing.firebase_uid = uid
            db.commit()
            db.refresh(existing)
            return existing
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Sign in with the method you used before.",
        )

    fname, lname = _split_name(claims.get("name", ""))
    user = User(fname=fname, lname=lname, email=email, firebase_uid=uid,
                password_hash=None, unit_system="imperial")
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Two first requests raced; the other one created the row.
        db.rollback()
        user = db.query(User).filter(User.firebase_uid == uid).first()
        if user is None:
            raise
        return user
    db.refresh(user)
    return user


# Get the current session user
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        alg = jwt.get_unverified_header(token).get("alg")
    except PyJWTError:
        raise _credentials_exception()

    # Legacy tokens from /auth/login are HS256 and signed with SECRET_KEY
    if alg == settings.ALGORITHM:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except PyJWTError:
            raise _credentials_exception()
        user_id = payload.get("sub")
        if user_id is None:
            raise _credentials_exception()
        user = db.query(User).filter(User.id == int(user_id)).first()
        if user is None:
            raise _credentials_exception()
        return user

    # Everything else must be a Firebase ID token
    try:
        claims = firebase_auth.verify_id_token(token)
    except firebase_auth.InvalidFirebaseToken:
        raise _credentials_exception()
    return user_from_firebase_claims(db, claims)
