from fastapi import APIRouter, Depends, HTTPException, Request
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

    return new_user


@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    request: Request,
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

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get(
    "/me",
    response_model=UserResponse
)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
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
        
    if reset_entry.expires_at < datetime.now(timezone.utc):
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