import jwt
from sqlmodel import Session, select, or_
from src.db import engine
from fastapi import APIRouter, status, HTTPException
from src.models.user import (
    UserCreate,
    UserPublic,
    User,
    UserLoginRequest,
    UserLoginResponse,
)
import bcrypt
import os
from dotenv import load_dotenv, find_dotenv
import secrets
from datetime import datetime, timezone, timedelta
import resend
from src.services.email import load_email_template
from src.services.auth import hash_email

load_dotenv(find_dotenv())

router = APIRouter()


@router.post("/signup", tags=["auth"], response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate):
    """Create a new user with a hashed password and return the user."""
    try:
        with Session(engine) as session:
            # Hash the email first
            hashed_email = hash_email(user.email)
            # Check for existing user with same username or email
            # TODO: The problem is if someone creates account without verifying, the id will be given to it
            # so if we want to implement something like first 100, then we need to rely on id
            # TODO: add created_at and updated_at fields
            # Check for existing user with same username or hashed email
            results = session.exec(
                select(User).where(
                    or_(
                        User.username == user.username,
                        User.hashed_email == hashed_email
                    )
                )
            )
            existing_user = results.first()

            if existing_user:
                if not existing_user.is_verified:
                    session.delete(existing_user)
                    session.commit()
                # elif existing_user.username == user.username and existing_user.is_verified:
                # TODO: Fix race condition, right now we're just locking the username for saftey
                elif existing_user.username == user.username:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Username already exists",
                    )
                elif existing_user.hashed_email == hashed_email:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Email already exists and is verified",
                    )

            # Hash password
            hashed_password = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt())

            # Generate verification token
            token = secrets.token_urlsafe(32)
            token_expiry = datetime.now(timezone.utc) + timedelta(minutes=15)

            # Send verification email
            verification_link = f"http://127.0.0.1:8000/auth/verify-token?token={token}"
            email_html = load_email_template("verification.html", verification_link=verification_link)
            resend.api_key = os.getenv("RESEND_API_KEY")
            
            params: resend.Emails.SendParams = {
                "from": "anon@adarshdubey.com",
                "to": user.email,
                "subject": "Verify your email for Anon",
                "html": email_html,
            }

            email: resend.Email = resend.Emails.send(params)
            print(email)

            # Create and save user
            db_user = User(
                username=user.username,
                hashed_email=hashed_email,
                hashed_password=hashed_password,
                verification_token=token,
                verification_token_expires=token_expiry
            )
            session.add(db_user)
            session.commit()
            session.refresh(db_user)

            return db_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/login",
    tags=["auth"],
    status_code=status.HTTP_200_OK,
    response_model=UserLoginResponse,
)
async def login(login_user: UserLoginRequest):
    """
    Authenticate user by username and password, and return a JWT token.
    """
    with Session(engine) as session:
        # Fetch user by username
        results = session.exec(select(User).where(User.username == login_user.username))
        user = results.first()

        # Validate user exists
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )
        
        # Validate user is verified
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User is not verified! Please verify your email before logging in",
            )

        # Validate user exists and password matches
        if not bcrypt.checkpw(
            login_user.password.encode(), user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )

        # Generate JWT token
        JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
        token = jwt.encode(
            {"username": user.username, "id": str(user.id)},
            key=JWT_SECRET_KEY,
            algorithm="HS256",
        )
        return {"access_token": token, "token_type": "bearer"}


@router.get("/verify-token", tags=["auth"], status_code=status.HTTP_200_OK, response_model=UserPublic)
def verify_token(token: str):
    """
    Verify user by token and return the user.
    """
    with Session(engine) as session:
        # Fetch user by verification token
        results = session.exec(select(User).where(User.verification_token == token))
        user = results.first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or Expired token",
            )

        # Ensure token expiry datetime is timezone-aware
        token_expires = user.verification_token_expires
        if token_expires.tzinfo is None:
            token_expires = token_expires.replace(tzinfo=timezone.utc)

        # Compare timezone-aware datetimes
        if token_expires < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            )

        # Update user to be verified
        user.is_verified = True
        user.verification_token = None  # Clear the token after use
        user.verification_token_expires = None  # Clear the expiry after use
        session.add(user)
        session.commit()
        session.refresh(user)

        return user