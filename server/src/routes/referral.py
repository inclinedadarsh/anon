from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlmodel import Session, select
from src.db import engine
from src.models.user import User
from src.models.referral import ReferralValidation, ReferralStats, ReferralCode
from src.services.referral import (
    create_referral_code_for_user,
    validate_referral_code,
    get_user_referral_stats,
)
from src.services.auth import get_current_user
import os

router = APIRouter()


@router.get("/me", response_model=ReferralStats, tags=["referral"])
async def get_user_referral_info(current_user: User = Depends(get_current_user)):
    """Get current user's referral code and statistics"""
    with Session(engine) as session:
        stats = get_user_referral_stats(session, current_user.id)
        return ReferralStats(**stats)


@router.post("/generate", response_model=ReferralStats, tags=["referral"])
async def generate_user_referral_code(current_user: User = Depends(get_current_user)):
    """Generate a referral code for the current user"""
    with Session(engine) as session:
        referral_code = create_referral_code_for_user(session, current_user.id)

        if not referral_code:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate referral code",
            )

        stats = get_user_referral_stats(session, current_user.id)
        return ReferralStats(**stats)


@router.get("/validate/{code}", response_model=ReferralValidation, tags=["referral"])
async def validate_referral_code_endpoint(code: str):
    """Validate a referral code"""
    with Session(engine) as session:
        is_valid, referral_code, user = validate_referral_code(session, code)

        if not is_valid or not referral_code or not user:
            return ReferralValidation(is_valid=False, code=code)

        remaining_uses = max(0, referral_code.max_uses - referral_code.current_uses)

        return ReferralValidation(
            is_valid=True,
            code=code,
            referrer_username=user.username,
            remaining_uses=remaining_uses,
        )


@router.get("/{code}", tags=["referral"], include_in_schema=False)
async def referral_landing_page(code: str):
    """Redirects to Google OAuth with referral code in state"""
    with Session(engine) as session:
        is_valid, referral_code, user = validate_referral_code(session, code)

        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired referral code",
            )

    from fastapi.responses import RedirectResponse

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

    scope = "email"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}&"
        f"scope={scope}&"
        f"access_type=offline&"
        f"prompt=consent&"
        f"state=referral_{code}"
    )

    return RedirectResponse(url=auth_url)
