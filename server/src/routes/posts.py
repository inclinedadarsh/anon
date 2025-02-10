from fastapi import APIRouter, Depends, HTTPException
from src.models.post import PostPublic, PostCreate, Post, Author
from src.models.user import User
from src.services.auth import get_current_user
from src.db import engine
from sqlmodel import Session, select
from typing import List

router = APIRouter()


@router.post("/", response_model=PostPublic)
def post_posts(post: PostCreate, user: User = Depends(get_current_user)):
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


@router.get("/", response_model=List[PostPublic])
def get_posts():
    with Session(engine) as session:
        statement = select(Post, User).join(User, Post.author_id == User.id)
        results = session.exec(statement).all()
        posts_public = [
            PostPublic(
                id=post.id,
                content=post.content,
                created_at=post.created_at,
                author=Author(author_id=user.id, username=user.username)
            )
            for post, user in results
        ]
        return posts_public


@router.get("/{post_id}", response_model=PostPublic)
def get_post(post_id: int):
    with Session(engine) as session:
        post = session.exec(select(Post).where(Post.id == post_id)).first()
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