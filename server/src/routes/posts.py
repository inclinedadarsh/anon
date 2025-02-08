from fastapi import APIRouter
from src.models.post import PostPublic, PostCreate, Post
from src.db import engine
from sqlmodel import Session, select
from typing import List

router = APIRouter()


@router.post("/", response_model=PostPublic)
def post_posts(post: PostCreate):
    with Session(engine) as session:
        db_post = Post.model_validate(post)
        session.add(db_post)
        session.commit()
        session.refresh(db_post)
        return db_post


@router.get("/", response_model=List[PostPublic])
def get_posts():
    with Session(engine) as session:
        posts = session.exec(select(Post)).all()
        return posts
