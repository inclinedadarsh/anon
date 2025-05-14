from fastapi import APIRouter, HTTPException, status, Depends
from src.models.user import UserPublic, User
from src.db import engine
from sqlmodel import Session, select
from typing import List
from src.services.auth import get_current_user
from pydantic import BaseModel, Field
import re

router = APIRouter()


class SetUsernameRequest(BaseModel):
    username: str = Field(..., min_length=4, max_length=15, pattern=r"^[a-zA-Z0-9_]+$")


class SetBioRequest(BaseModel):
    bio: str = Field(..., max_length=140)


@router.get("/", response_model=List[UserPublic], status_code=status.HTTP_200_OK)
def get_users():
    """
    Get all users
    """
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        return users


@router.get(
    "/user/{username}", response_model=UserPublic, status_code=status.HTTP_200_OK
)
def get_user(username: str):
    """
    Get a user by their username
    """
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return user


@router.patch("/me/username", response_model=UserPublic, status_code=status.HTTP_200_OK)
def set_my_username(
    username_data: SetUsernameRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(lambda: Session(engine)),
):
    """
    Sets the username for the currently authenticated user.
    Only allowed if the username hasn't been set previously.
    """
    if current_user.username is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username has already been set for this account.",
        )

    existing_user = session.exec(
        select(User).where(User.username == username_data.username)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken. Please choose another one.",
        )

    # although pydantic already does this, checking once again
    if not re.match(r"^[a-zA-Z0-9_]+$", username_data.username):
        raise HTTPException(status_code=422, detail="Invalid username format.")

    # set the username
    current_user.username = username_data.username
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    session.close()

    print(f"Username {current_user.username} set for user {current_user.id}")
    return current_user


@router.patch("/me/bio", response_model=UserPublic, status_code=status.HTTP_200_OK)
def set_my_bio(
    bio_data: SetBioRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(lambda: Session(engine)),
):
    """
    Sets the bio for the currently authenticated user.
    """
    current_user.bio = bio_data.bio
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    session.close()

    print(f"Bio updated for user {current_user.id}")
    return current_user


@router.get("/me", response_model=UserPublic, status_code=status.HTTP_200_OK)
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Get the profile data for the currently authenticated user.
    """
    return current_user
