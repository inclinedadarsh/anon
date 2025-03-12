from sqlmodel import SQLModel, Field

class Tag(SQLModel, table=True):
    key: str = Field(primary_key=True)
    title: str
    font_color:  str
    bg_color: str
    border_color: str
    description: str