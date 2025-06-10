from sqlmodel import SQLModel, Field, UniqueConstraint, CheckConstraint
from datetime import datetime, timezone
from typing import Optional
import sqlalchemy as sa


class Vote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    post_id: int = Field(foreign_key="post.id")
    vote_type: int = Field(description="1 for upvote, -1 for downvote")
    created_at: Optional[datetime] = Field(
        default=None,
        sa_type=sa.DateTime(timezone=True),
        sa_column_kwargs={"server_default": sa.func.now()},
        nullable=False,
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_type=sa.DateTime(timezone=True),
        sa_column_kwargs={"server_default": sa.func.now(), "onupdate": sa.func.now()},
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="unique_user_post_vote"),
        CheckConstraint("vote_type IN (1, -1)", name="valid_vote_type"),
    )


class VoteRequest(SQLModel):
    vote_type: int = Field(ge=-1, le=1, description="1 for upvote, -1 for downvote")
