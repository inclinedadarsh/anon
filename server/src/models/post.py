from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone
import sqlalchemy as sa
from pydantic import Field as PydanticField


class PostBase(SQLModel):
    content: str = PydanticField(..., min_length=1, max_length=420)


class Post(PostBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    author_id: int = Field(foreign_key="user.id")
    created_at: Optional[datetime] = Field(
        default=None,
        sa_type=sa.DateTime(timezone=True),
        sa_column_kwargs={"server_default": sa.func.now()},
        nullable=False,
    )


class PostCreate(PostBase):
    pass


class Author(SQLModel):
    author_id: int
    username: str


class PostPublic(PostBase):
    id: int
    created_at: datetime
    author: Author
