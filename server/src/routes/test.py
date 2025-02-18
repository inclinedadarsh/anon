from fastapi import APIRouter, Depends
from src.models.user import User
from src.services.auth import get_current_user

router = APIRouter()

@router.get("/protected-route")
async def protected_route(current_user: User = Depends(get_current_user)):
    """
    This is a protected route that requires a valid JWT token to access.
    """
    return {"message": "This is a protected route."}