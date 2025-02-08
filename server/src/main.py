from fastapi import FastAPI
from src.db import create_db_and_tables
from src.routes.posts import router as posts_router
from src.routes.auth import router as auth_router
from src.routes.users import router as users_router

app = FastAPI()


@app.on_event("startup")
def on_startup():
    print("Application is starting up.")
    create_db_and_tables()


app.include_router(posts_router, prefix="/posts", tags=["posts"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])


@app.get("/")
def read_root():
    return {"message": "Hello, World!"}
