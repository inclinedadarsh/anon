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

load_dotenv(find_dotenv())

router = APIRouter()


@router.post(
    "/signup",
    tags=["auth"],
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
)
def signup(user: UserCreate):
    with Session(engine) as session:
        results = session.exec(
            select(User).where(
                or_(User.username == user.username, User.email == user.email)
            )
        )
        existing_user = results.first()

        if existing_user:
            if existing_user.username == user.username:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username already exists",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Email already exists"
            )

        hashed = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt())
        db_user = User(username=user.username, email=user.email, hashed_password=hashed)
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return db_user


@router.post(
    "/login",
    tags=["auth"],
    status_code=status.HTTP_200_OK,
    response_model=UserLoginResponse,
)
def login(login_user: UserLoginRequest):
    """
    Authenticate user by username and password, and return a JWT token.
    """
    with Session(engine) as session:
        # Fetch user by email
        results = session.exec(select(User).where(User.email == login_user.email))
        user = results.first()

        # Validate user exists and password matches
        if not user or not bcrypt.checkpw(
            login_user.password.encode("utf-8"), user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )

        # Generate JWT token
        JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
        token = jwt.encode(
            {"email": user.email, "id": str(user.id)},
            key=JWT_SECRET_KEY,
            algorithm="HS256",
        )
        return {"access_token": token, "token_type": "bearer"}
