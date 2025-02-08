from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from pydantic import EmailStr


class UserBase(SQLModel):
    email: EmailStr
    username: str


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    is_verified: Optional[bool] = Field(default=False)
    hashed_password: str
    verification_token: Optional[str] = Field(nullable=True)
    verification_token_expires: Optional[datetime] = Field(nullable=True)


class UserCreate(UserBase):
    password: str


class UserPublic(UserBase):
    id: int
    is_verified: bool


class UserLoginRequest(SQLModel):
    email: EmailStr
    password: str


class UserLoginResponse(SQLModel):
    access_token: str
    token_type: str
