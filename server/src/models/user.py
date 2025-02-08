from sqlmodel import SQLModel, Field
from typing import Optional
from pydantic import EmailStr


class UserBase(SQLModel):
    email: EmailStr
    username: str


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str


class UserCreate(UserBase):
    password: str


class UserPublic(UserBase):
    id: int


class UserLoginRequest(SQLModel):
    email: EmailStr
    password: str


class UserLoginResponse(SQLModel):
    access_token: str
    token_type: str
