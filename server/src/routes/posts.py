from fastapi import APIRouter, Depends
from src.models.post import PostPublic, PostCreate, Post
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
        return db_post


@router.get("/", response_model=List[PostPublic])
def get_posts():
    with Session(engine) as session:
        posts = session.exec(select(Post)).all()
        return posts
