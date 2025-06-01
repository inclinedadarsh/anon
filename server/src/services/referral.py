import random
import string
from sqlmodel import Session, select
from src.models.user import User
from src.models.referral import ReferralCode, Referral
from typing import Optional, Tuple


def generate_referral_code() -> str:
    """Generate a unique 8 character referral code"""
    while True:
        suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        code = f"ANON{suffix}"
        return code


def create_referral_code_for_user(
    session: Session, user_id: int
) -> Optional[ReferralCode]:
    """Create a new referral code for a user"""
    existing_code = session.exec(
        select(ReferralCode).where(ReferralCode.user_id == user_id)
    ).first()

    if existing_code:
        return existing_code

    attempts = 0
    max_attempts = 10

    while attempts < max_attempts:
        code = generate_referral_code()

        existing = session.exec(
            select(ReferralCode).where(ReferralCode.code == code)
        ).first()

        if not existing:
            referral_code = ReferralCode(
                code=code, user_id=user_id, is_active=True, max_uses=5, current_uses=0
            )
            session.add(referral_code)
            session.commit()
            session.refresh(referral_code)

            user = session.get(User, user_id)
            if user:
                user.referral_code = code
                session.add(user)
                session.commit()

            return referral_code

        attempts += 1

    return None


def validate_referral_code(
    session: Session, code: str
) -> Tuple[bool, Optional[ReferralCode], Optional[User]]:
    """Validate a referral code and return its details"""
    referral_code = session.exec(
        select(ReferralCode).where(ReferralCode.code == code)
    ).first()

    if not referral_code:
        return False, None, None

    if not referral_code.is_active:
        return False, referral_code, None

    if referral_code.current_uses >= referral_code.max_uses:
        return False, referral_code, None

    user = session.get(User, referral_code.user_id)

    return True, referral_code, user


def complete_referral_simple(
    session: Session, referrer_id: int, referred_user_id: int, referral_code: str
) -> bool:
    """Mark a referral as completed when the referred user signs up"""
    try:
        referral_code_obj = session.exec(
            select(ReferralCode).where(ReferralCode.code == referral_code)
        ).first()

        if not referral_code_obj:
            return False

        referral = Referral(
            referrer_id=referrer_id,
            referred_user_id=referred_user_id,
            referral_code_id=referral_code_obj.id,
            status="completed",
        )
        session.add(referral)

        referral_code_obj.current_uses += 1
        session.add(referral_code_obj)

        if referral_code_obj.current_uses >= referral_code_obj.max_uses:
            referral_code_obj.is_active = False

        referrer = session.get(User, referrer_id)
        if referrer:
            referrer.referral_count += 1
            session.add(referrer)

        session.commit()
        return True

    except Exception:
        session.rollback()
        return False


def get_user_referral_stats(session: Session, user_id: int) -> dict:
    """Get referral statistics for a user"""
    user = session.get(User, user_id)
    if not user:
        return {}

    referral_code = session.exec(
        select(ReferralCode).where(ReferralCode.user_id == user_id)
    ).first()

    if not referral_code:
        return {
            "referral_code": None,
            "total_referrals": 0,
            "successful_referrals": user.referral_count,
            "remaining_referrals": 5,
        }

    successful_referrals = session.exec(
        select(Referral).where(
            Referral.referrer_id == user_id, Referral.status == "completed"
        )
    ).all()

    return {
        "referral_code": referral_code.code,
        "total_referrals": referral_code.current_uses,
        "successful_referrals": len(successful_referrals),
        "remaining_referrals": max(
            0, referral_code.max_uses - referral_code.current_uses
        ),
    }
