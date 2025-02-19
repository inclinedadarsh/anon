from sqlmodel import SQLModel, create_engine
from src.models.post import Post
from src.models.user import User

sqlite_file_name = "anon"
sqlite_url = f"postgresql://adarsh:root@127.0.0.1:5432/{sqlite_file_name}"
# TODO: Make this come from .env file

engine = create_engine(sqlite_url, echo=True)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
