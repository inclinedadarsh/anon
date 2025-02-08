from fastapi import APIRouter, HTTPException, status
from src.models.user import UserPublic, User
from src.db import engine
from sqlmodel import Session, select
from typing import List

router = APIRouter()

@router.get("/", response_model=List[UserPublic], status_code=status.HTTP_200_OK)
def get_users():
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        return users
    

@router.get("/{username}", response_model=UserPublic, status_code=status.HTTP_200_OK)
def get_user(username: str):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return user