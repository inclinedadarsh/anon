from sqlmodel import SQLModel, create_engine
from src.models.post import Post
from src.models.user import User
from src.models.tag import Tag
from src.models.vote import Vote
from src.models.referral import ReferralCode, Referral
from dotenv import load_dotenv, find_dotenv
import os

load_dotenv(find_dotenv())


DATABASE_URL = os.getenv("DATABASE_URL")
ECHO = os.getenv("ECHO", "false")
engine = create_engine(DATABASE_URL, echo=ECHO)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
