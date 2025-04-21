from fastapi import FastAPI
from src.db import create_db_and_tables
from src.routes.posts import router as posts_router
from src.routes.auth import router as auth_router
from src.routes.users import router as users_router
from src.routes.test import router as test_router
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
origins = [
    FRONTEND_URL,
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    print("Application is starting up.")
    create_db_and_tables()


app.include_router(posts_router, prefix="/posts", tags=["posts"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(test_router, prefix="/test", tags=["test"])


@app.get("/")
def read_root():
    return {"message": "Hello, World!"}
