from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func
from src.models.post import PostPublic, PostCreate, Post, Author
from src.models.user import User
from src.services.auth import get_current_user
from src.db import engine
from sqlmodel import Session, select
from typing import List, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    limit: int
    offset: int


router = APIRouter()


@router.post("/", response_model=PostPublic)
def post_posts(post: PostCreate, user: User = Depends(get_current_user)):
    """
    Create a new post with the current user as the author
    """
    with Session(engine) as session:
        post_create = Post(**post.model_dump(), author_id=user.id)
        db_post = Post.model_validate(post_create)
        session.add(db_post)
        session.commit()
        session.refresh(db_post)
        author = session.exec(select(User).where(User.id == db_post.author_id)).first()
        post_public = PostPublic(
            **db_post.model_dump(),
            author=Author(author_id=author.id, username=author.username)
        )
        return post_public


@router.get("/", response_model=PaginatedResponse[PostPublic])
def get_posts(
    user: User = Depends(get_current_user),
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
):
    """
    Get paginated posts with their authors
    """
    with Session(engine) as session:
        total_count = session.exec(
            select(func.count()).select_from(Post).where(Post.deleted == False)
        ).first()

        statement = (
            select(Post, User)
            .join(User, Post.author_id == User.id)
            .where(Post.deleted == False)
            .order_by(desc(Post.created_at))
            .offset(offset)
            .limit(limit)
        )
        results = session.exec(statement).all()
        posts_public = [
            PostPublic(
                id=post.id,
                content=post.content,
                created_at=post.created_at,
                author=Author(author_id=user.id, username=user.username),
            )
            for post, user in results
        ]
        return PaginatedResponse(
            items=posts_public,
            total=total_count,
            limit=limit,
            offset=offset,
        )


@router.get("/{post_id}", response_model=PostPublic)
def get_post(post_id: int, user: User = Depends(get_current_user)):
    """
    Get a post by its ID with its author
    """
    with Session(engine) as session:
        post = session.exec(
            select(Post).where(Post.id == post_id).where(Post.deleted == False)
        ).first()
        if post is None:
            raise HTTPException(status_code=404, detail="Post not found")
        author = session.exec(select(User).where(User.id == post.author_id)).first()
        if author is None:
            raise HTTPException(status_code=404, detail="Author not found")
        post_public = PostPublic(
            **post.model_dump(),
            author=Author(author_id=author.id, username=author.username)
        )
        return post_public


@router.delete("/{post_id}", response_model=PostPublic)
def delete_post(post_id: int, user: User = Depends(get_current_user)):
    """
    Soft delete a post by its ID
    """
    with Session(engine) as session:
        post = session.exec(select(Post).where(Post.id == post_id)).first()
        if post is None:
            raise HTTPException(status_code=404, detail="Post not found")
        if post.author_id != user.id:
            raise HTTPException(
                status_code=403, detail="You are not the author of this post"
            )
        post.deleted = True
        session.add(post)
        session.commit()
        session.refresh(post)
        author = session.exec(select(User).where(User.id == post.author_id)).first()
        post_public = PostPublic(
            **post.model_dump(),
            author=Author(author_id=author.id, username=author.username)
        )
        return post_public


@router.get("/user/{username}", response_model=PaginatedResponse[PostPublic])
def get_posts_by_username(
    username: str,
    user: User = Depends(get_current_user),
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
):
    """
    Get paginated posts by a specific username
    """
    with Session(engine) as session:
        author = session.exec(select(User).where(User.username == username)).first()
        if author is None:
            raise HTTPException(status_code=404, detail="User not found")

        total_count = session.exec(
            select(func.count())
            .select_from(Post)
            .where(Post.author_id == author.id)
            .where(Post.deleted == False)
        ).first()

        statement = (
            select(Post)
            .where(Post.author_id == author.id)
            .where(Post.deleted == False)
            .order_by(desc(Post.created_at))
            .offset(offset)
            .limit(limit)
        )
        posts = session.exec(statement).all()
        posts_public = [
            PostPublic(
                id=post.id,
                content=post.content,
                created_at=post.created_at,
                author=Author(author_id=author.id, username=author.username),
            )
            for post in posts
        ]
        return PaginatedResponse(
            items=posts_public,
            total=total_count,
            limit=limit,
            offset=offset,
        )
