from fastapi import APIRouter, Depends

from app.database.auth_dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(tags=["Users"])


@router.get("/users/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user
