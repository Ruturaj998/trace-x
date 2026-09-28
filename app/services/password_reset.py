import secrets
import hashlib

def generate_reset_token() -> str:
    """Generates a cryptographically secure random token."""
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    """Creates a SHA-256 hash of the token for secure storage."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()
