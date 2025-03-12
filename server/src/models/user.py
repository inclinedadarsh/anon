from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional, List
from pydantic import EmailStr, field_validator
import re
from sqlalchemy import LargeBinary, String, Column
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY


class UserBase(SQLModel):
    # TODO: Give it constraints
    username: str


class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    is_verified: bool = Field(default=False)
    hashed_email: bytes = Field(sa_type=LargeBinary, unique=True, index=True)
    hashed_password: bytes = Field(sa_type=LargeBinary)
    verification_token: Optional[str] = Field(nullable=True)
    verification_token_expires: Optional[datetime] = Field(nullable=True)
    tags: Optional[List[str]] = Field(default=None, sa_column=Column(PG_ARRAY(String())))
    # NOTE: The `tags` property is just an array of strings, however it should have been an array of
    # foreign keys "tag.key"
    # As of 12/3/25, it's not supported in SQLAlchemy / SQLModel, hence it's just an array of strings
    # As a result of this, we have to implement referential integrity manually.
    # Similarly, we have to implement backpopulate manually for this.


class UserCreate(SQLModel):
    username: str
    email: EmailStr = Field(description="Email must be from @kkwagh.edu.in domain")
    password: str

    @field_validator('email')
    def validate_kkwagh_email(cls, v):
        pattern = r'^[a-zA-Z0-9_.+-]+@kkwagh\.edu\.in$'
        if not re.match(pattern, v):
            raise ValueError('Email must be from @kkwagh.edu.in domain')
        return v


class UserPublic(UserBase):
    id: int
    is_verified: bool
    tags: Optional[List[str]] = None


class UserLoginRequest(SQLModel):
    username: str
    password: str


class UserLoginResponse(SQLModel):
    access_token: str
    token_type: str
