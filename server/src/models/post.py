from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone
import sqlalchemy as sa

class PostBase(SQLModel):
    content: str



class Post(PostBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    author_id: int = Field(foreign_key="user.id")
    created_at: Optional[datetime] = Field(
        default=None,
        sa_type=sa.DateTime(timezone=True),
        sa_column_kwargs={"server_default": sa.func.now()},
        nullable=False
    )


class PostCreate(PostBase):
    pass


class PostPublic(PostBase):
    id: int
    author_id: int
    created_at: datetime
