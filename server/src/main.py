import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.db import create_db_and_tables
from src.routes.posts import router as posts_router
from src.routes.votes import router as votes_router
from src.routes.auth import router as auth_router
from src.routes.users import router as users_router
from src.routes.test import router as test_router
from src.routes.referral import router as referral_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application is starting up.")
    create_db_and_tables()
    yield
    print("Application is shutting down.")


app = FastAPI(lifespan=lifespan)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
origins = [FRONTEND_URL]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(posts_router, prefix="/posts", tags=["posts"])
app.include_router(votes_router, prefix="/posts", tags=["votes"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(test_router, prefix="/test", tags=["test"])
app.include_router(referral_router, prefix="/referral", tags=["referral"])


@app.get("/")
def read_root():
    return {"message": "Hello, World!"}
