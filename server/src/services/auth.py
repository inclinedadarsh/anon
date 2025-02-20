import hashlib
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from src.db import engine
from src.models.user import User
import jwt
import os
from typing import Annotated
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def hash_email(email: str) -> bytes:
    """Hash email using SHA-256 with a salt and return bytes"""
    # Use a consistent salt from environment variable or generate one
    SALT = os.getenv("EMAIL_HASH_SALT")
    if isinstance(SALT, str):
        SALT = SALT.encode()
    
    email_bytes = email.lower().encode('utf-8')
    return hashlib.pbkdf2_hmac(
        'sha256',
        email_bytes,
        SALT,
        100000  # Number of iterations
    )


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("id")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    with Session(engine) as session:
        user = session.exec(select(User).where(User.id == int(user_id))).first()
        if user is None:
            raise credentials_exception
        return user