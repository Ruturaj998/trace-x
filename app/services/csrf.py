import hmac
import secrets
from fastapi import HTTPException, Request, status

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"


def generate_csrf_token() -> str:
    """Generate a cryptographically secure random token for CSRF protection."""
    return secrets.token_urlsafe(32)


def validate_csrf(request: Request) -> None:
    """Validate CSRF token for state-changing browser cookie requests.

    Rules:
    - Safe methods (GET, HEAD, OPTIONS) are exempt.
    - Requests without the session cookie (pure Bearer token or X-Device-Token) are exempt.
    - Browser cookie-authenticated requests MUST supply matching X-CSRF-Token header.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    # Only enforce CSRF if the request utilizes browser cookie-based authentication
    has_auth_cookie = bool(request.cookies.get("access_token"))
    if not has_auth_cookie:
        return

    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get(CSRF_HEADER_NAME) or request.headers.get("x-csrf-token")

    if not cookie_token or not header_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing in header or cookie",
        )

    if not hmac.compare_digest(cookie_token, header_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token invalid",
        )
