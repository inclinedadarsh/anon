from typing import List, Optional
from src.models.user import User


def assign_user_tags(user: User, signup_source: Optional[str] = None) -> List[str]:
    """
    Assign tags to a user based on specific conditions.

    Args:
        user: The user object with id and google_id
        signup_source: How the user signed up ("waitlist", "referral", etc.)

    Returns:
        List of tag strings to assign to the user
    """
    tags = []

    # builder tag will be assigned to two users only. there google id's are hardcoded.
    BUILDER_GOOGLE_IDS = ["114562794821224414483"]
    if user.google_id and user.google_id in BUILDER_GOOGLE_IDS:
        tags.append("builder")

    # waitlist tag will be assigned to users who had joined the waitlist
    if signup_source == "waitlist":
        tags.append("waitlist")

    # early user is for the first hundred users.
    if user.id and user.id <= 100:
        tags.append("early_user")

    return tags
