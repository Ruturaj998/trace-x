import os
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from datetime import datetime, timezone, timedelta
from app.database.auth_dependencies import get_current_user
from app.database.dependencies import get_db
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest
)
from app.services.auth import (
    create_access_token,
    hash_password,
    verify_password
)
from app.services.email import EmailService
from app.services.password_reset import generate_reset_token, hash_token
from app.services.csrf import generate_csrf_token, CSRF_COOKIE_NAME
from app.services.rate_limiter import (
    login_limiter,
    register_limiter,
    forgot_password_limiter,
    reset_password_limiter,
    change_password_limiter
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post(
    "/register",
    response_model=UserResponse
)
def register(
    request: Request,
    response: Response,
    user_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    register_limiter.check(request, "register")
    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(
            user_data.password
        )
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize a secure CSRF token cookie on registration
    csrf_token = generate_csrf_token()
    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        secure=is_prod,
        samesite="lax",
        max_age=86400 * 7,
        path="/",
    )

    return new_user


@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    login_limiter.check(request, "login")
    user = (
        db.query(User)
        .filter(User.email == login_data.email)
        .first()
    )

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(user.id)
    csrf_token = generate_csrf_token()
    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"

    # 1. HttpOnly access_token cookie (immune to XSS theft)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=86400 * 7,
        path="/",
    )

    # 2. Double-submit CSRF cookie (readable by front-end client)
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        secure=is_prod,
        samesite="lax",
        max_age=86400 * 7,
        path="/",
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "csrf_token": csrf_token,
        "user": user,
    }


@router.post("/logout")
def logout(response: Response):
    """Log out user by clearing HttpOnly authentication and CSRF session cookies."""
    response.delete_cookie(key="access_token", path="/", samesite="lax")
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/", samesite="lax")
    return {"message": "Logged out successfully"}


@router.get("/csrf-token")
def get_csrf_token(request: Request, response: Response):
    """Retrieve or generate a CSRF token for browser-based API interactions."""
    existing_token = request.cookies.get(CSRF_COOKIE_NAME)
    token = existing_token or generate_csrf_token()
    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"

    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=token,
        httponly=False,
        secure=is_prod,
        samesite="lax",
        max_age=86400 * 7,
        path="/",
    )

    return {"csrf_token": token}


@router.get(
    "/me",
    response_model=UserResponse,
    deprecated=True,
    summary="Get current user profile (Deprecated)",
    description="Deprecated: Use /users/me for user profile retrieval.",
)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Retrieve the currently authenticated user profile. Deprecated: Prefer /users/me."""
    return current_user


@router.post("/forgot-password")
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    forgot_password_limiter.check(request, "forgot_password")

    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        # Generate token
        token = generate_reset_token()
        hashed = hash_token(token)

        expires = datetime.now(timezone.utc) + timedelta(hours=1)

        reset_token_entry = PasswordResetToken(
            token=hashed,
            user_id=user.id,
            expires_at=expires
        )
        db.add(reset_token_entry)
        db.commit()

        EmailService.send_password_reset_email(user.email, token)

    return {"message": "If an account exists with that email, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    reset_password_limiter.check(request, "reset_password")

    hashed = hash_token(payload.token)

    reset_entry = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token == hashed)
        .first()
    )

    if not reset_entry or reset_entry.used:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    expires_at = reset_entry.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.id == reset_entry.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    reset_entry.used = True

    db.commit()

    return {"message": "Password has been successfully reset."}


@router.post("/change-password")
def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    change_password_limiter.check(request, "change_password")

    if not current_user.password_hash or not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()

    return {"message": "Password updated successfully"}
