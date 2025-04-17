from datetime import datetime, timezone
import hashlib
from fastapi import Depends, HTTPException, status, Cookie

# from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from src.db import engine
from src.models.user import User
import jwt
import os
from typing import Annotated
from dotenv import load_dotenv, find_dotenv
from cryptography.fernet import Fernet

load_dotenv(find_dotenv())

# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/google/callback")

ENCRYPTION_KEY = os.getenv("REFRESH_TOKEN_ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    raise ValueError(
        "REFRESH_TOKEN_ENCRYPTION_KEY is not set in environment variables."
    )

fernet = Fernet(ENCRYPTION_KEY.encode())


def encrypt_refresh_token(token: str) -> str:
    if not token:
        return None
    return fernet.encrypt(token.encode()).decode()


def decrypt_refresh_token(token: str) -> str:
    if not token:
        return None
    try:
        return fernet.decrypt(token.encode()).decode()
    except Exception as e:
        print(f"Error decrypting token: {e}")
        return None


# def hash_email(email: str) -> bytes:
#     """Hash email using SHA-256 with a salt and return bytes"""
#     # Use a consistent salt from environment variable or generate one
#     SALT = os.getenv("EMAIL_HASH_SALT")
#     if isinstance(SALT, str):
#         SALT = SALT.encode()

#     email_bytes = email.lower().encode("utf-8")
#     return hashlib.pbkdf2_hmac(
#         "sha256", email_bytes, SALT, 100000  # Number of iterations
#     )


async def get_current_user(
    access_token: Annotated[str | None, Cookie()] = None,
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        # headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
        if not JWT_SECRET_KEY:
            raise ValueError("JWT_SECRET_KEY environment variable not set.")
        payload = jwt.decode(access_token, JWT_SECRET_KEY, algorithms=["HS256"])

        user_id: str = payload.get("sub")
        if user_id is None:
            print("JWT payload missing 'sub' field")
            raise credentials_exception

        exp = payload.get("exp")
        if exp is None:
            print("WARN: JWT missing 'exp' claim.")
            raise credentials_exception

    except jwt.ExpiredSignatureError:
        print("JWT validation failed: ExpiredSignatureError")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.PyJWTError as e:
        print(f"JWT Error: {e}")
        raise credentials_exception
    except ValueError as e:
        print(f"Configuration Error: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server configuration error"
        )

    with Session(engine) as session:
        try:
            db_user_id = int(user_id)
        except ValueError:
            print(f"Invalid user ID in JWT 'sub': {user_id}")
            raise credentials_exception

        user = session.exec(select(User).where(User.id == db_user_id)).first()
        if user is None:
            print(f"User with ID {user_id} not found in database")
            raise credentials_exception

        # # if the user has not completed their profile setup he is prevented from accessing protected routes.
        # # TODO: This can be improved in the future
        # if user.username is None:
        #     print("User profile setup not complete")
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="User profile setup not complete",
        #     )
        print(f"Successfully authenticated user {user.id} via cookie.")
        return user
