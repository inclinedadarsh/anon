from fastapi import FastAPI
from src.db import create_db_and_tables
from src.routes.posts import router as posts_router
from src.routes.auth import router as auth_router

app = FastAPI()


@app.on_event("startup")
def on_startup():
    print("Application is starting up.")
    create_db_and_tables()


app.include_router(posts_router, prefix="/posts", tags=["posts"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])


@app.get("/")
def read_root():
    return {"message": "Hello, World!"}
