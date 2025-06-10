from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from src.models.vote import Vote, VoteRequest
from src.models.user import User
from src.models.post import Post
from src.services.auth import get_current_user
from src.db import engine
from sqlmodel import Session, select
from datetime import datetime, timezone

router = APIRouter()


@router.put("/{post_id}/vote")
def set_vote(
    post_id: int, vote_request: VoteRequest, user: User = Depends(get_current_user)
):
    """
    Creates new vote or updates existing vote to the specified type
    """
    with Session(engine) as session:
        post = session.exec(
            select(Post).where(Post.id == post_id).where(Post.deleted == False)
        ).first()
        if post is None:
            raise HTTPException(status_code=404, detail="Post not found")

        existing_vote = session.exec(
            select(Vote).where(Vote.user_id == user.id).where(Vote.post_id == post_id)
        ).first()

        if existing_vote:
            if existing_vote.vote_type == vote_request.vote_type:
                pass
            else:
                existing_vote.vote_type = vote_request.vote_type
                existing_vote.updated_at = datetime.now(timezone.utc)
                session.add(existing_vote)
        else:
            new_vote = Vote(
                user_id=user.id, post_id=post_id, vote_type=vote_request.vote_type
            )
            session.add(new_vote)

        session.commit()

        score = session.exec(
            select(func.coalesce(func.sum(Vote.vote_type), 0)).where(
                Vote.post_id == post_id
            )
        ).first()

        return {
            "message": "Vote updated successfully",
            "post": {
                "id": post_id,
                "score": score,
                "user_vote": vote_request.vote_type,
            },
        }


@router.delete("/{post_id}/vote")
def remove_vote(post_id: int, user: User = Depends(get_current_user)):
    """
    Removes vote if it exists, does nothing if no vote exists
    """
    with Session(engine) as session:
        post = session.exec(
            select(Post).where(Post.id == post_id).where(Post.deleted == False)
        ).first()
        if post is None:
            raise HTTPException(status_code=404, detail="Post not found")

        existing_vote = session.exec(
            select(Vote).where(Vote.user_id == user.id).where(Vote.post_id == post_id)
        ).first()

        if existing_vote:
            session.delete(existing_vote)
            session.commit()

        score = session.exec(
            select(func.coalesce(func.sum(Vote.vote_type), 0)).where(
                Vote.post_id == post_id
            )
        ).first()

        return {
            "message": "Vote removed successfully",
            "post": {"id": post_id, "score": score, "user_vote": None},
        }
