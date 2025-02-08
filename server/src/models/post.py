from typing import Optional
from sqlmodel import SQLModel, Field


class PostBase(SQLModel):
    post: str
    author: str


class Post(PostBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class PostCreate(PostBase):
    pass


class PostPublic(PostBase):
    id: int
