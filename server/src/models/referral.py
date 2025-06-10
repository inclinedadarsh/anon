from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime, UTC
from typing import Optional
from sqlalchemy import Column, DateTime, func


class ReferralCodeBase(SQLModel):
    code: str = Field(unique=True, index=True, max_length=8)
    is_active: bool = Field(default=True)
    max_uses: int = Field(default=5)
    current_uses: int = Field(default=0)


class ReferralCode(ReferralCodeBase, table=True):
    __tablename__ = "referral_codes"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )


class ReferralBase(SQLModel):
    status: str = Field(default="pending", max_length=20)  # pending, completed, expired


class Referral(ReferralBase, table=True):
    __tablename__ = "referrals"

    id: Optional[int] = Field(default=None, primary_key=True)
    referrer_id: int = Field(foreign_key="user.id")
    referred_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    referral_code_id: int = Field(foreign_key="referral_codes.id")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )


class ReferralCodePublic(ReferralCodeBase):
    id: int
    user_id: int
    created_at: datetime


class ReferralStats(SQLModel):
    referral_code: Optional[str] = None
    total_referrals: int = 0
    successful_referrals: int = 0
    remaining_referrals: int = 5


class ReferralValidation(SQLModel):
    is_valid: bool
    code: Optional[str] = None
    referrer_username: Optional[str] = None
    remaining_uses: Optional[int] = None
