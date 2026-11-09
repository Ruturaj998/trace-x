from dataclasses import dataclass
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.models.device import Device
from app.models.user import User
from app.services.auth import decode_access_token
from app.services.device_auth import hash_device_token

# auto_error=False allows cookies to be checked if Authorization header is omitted
security = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Authenticate user via Bearer Authorization header (explicit) or HttpOnly access_token cookie."""
    token = None

    # 1. Prefer explicit Bearer Authorization header if supplied
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif request.headers.get("Authorization", "").startswith("Bearer "):
        token = request.headers["Authorization"].split(" ", 1)[1].strip()
    # 2. Fall back to HttpOnly browser session cookie
    elif request.cookies.get("access_token"):
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
        )

    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def get_current_device(
    request: Request,
    db: Session = Depends(get_db),
) -> Device:
    """Authenticate edge tracking device via X-Device-Token header or Bearer txd_ token."""
    raw_token = request.headers.get("X-Device-Token")
    if not raw_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer txd_"):
            raw_token = auth_header.split(" ", 1)[1].strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device authentication credential required (X-Device-Token)",
        )

    token_hash = hash_device_token(raw_token)
    device = db.query(Device).filter(Device.device_token_hash == token_hash).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked device credentials",
        )

    if device.status == "disabled":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device is disabled",
        )

    return device


@dataclass
class TelemetryCaller:
    """Represents an authenticated caller submitting telemetry (either a Device or a User)."""
    device: Optional[Device] = None
    user: Optional[User] = None

    def resolve_and_authorize_device(self, target_device_id: int, db: Session) -> Device:
        """Ensure caller is strictly authorized to submit telemetry for the target device ID."""
        if self.device:
            if self.device.id != target_device_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-device impersonation forbidden: Credential does not match target device ID",
                )
            return self.device

        if self.user:
            device = (
                db.query(Device)
                .filter(
                    Device.id == target_device_id,
                    Device.user_id == self.user.id,
                )
                .first()
            )
            if not device:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Device not found or not owned by user",
                )
            if device.status == "disabled":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Device is disabled",
                )
            return device

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to submit telemetry",
        )


def get_telemetry_caller(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> TelemetryCaller:
    """Flexible dependency supporting both device-token telemetry and user-authenticated telemetry."""
    # Check if device credentials are provided
    raw_device_token = request.headers.get("X-Device-Token")
    auth_header = request.headers.get("Authorization", "")
    if not raw_device_token and auth_header.startswith("Bearer txd_"):
        raw_device_token = auth_header.split(" ", 1)[1].strip()

    if raw_device_token:
        device = get_current_device(request, db)
        return TelemetryCaller(device=device)

    # Otherwise authenticate as user
    user = get_current_user(request, credentials, db)
    return TelemetryCaller(user=user)
