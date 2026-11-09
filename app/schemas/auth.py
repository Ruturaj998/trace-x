from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Password cannot be blank or whitespace only")
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    csrf_token: str | None = None
    user: "UserResponse | None" = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Password cannot be blank or whitespace only")
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return value

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Password cannot be blank or whitespace only")
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return value


from app.schemas.user import UserResponse

__all__ = [
    "RegisterRequest",
    "LoginRequest",
    "TokenResponse",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "ChangePasswordRequest",
    "UserResponse",
]
