import hashlib
import secrets
from typing import Tuple


def generate_device_token() -> Tuple[str, str, str]:
    """Generate a unique cryptographically secure credential for an edge device.

    Returns:
        (raw_token, prefix, token_hash)
        - raw_token: Plaintext token shown once to the user (e.g. txd_...)
        - prefix: Short visible identifier (e.g. txd_abc123) for dashboard display
        - token_hash: SHA-256 digest stored securely in PostgreSQL
    """
    random_part = secrets.token_urlsafe(32)
    raw_token = f"txd_{random_part}"
    prefix = raw_token[:12]
    token_hash = hash_device_token(raw_token)
    return raw_token, prefix, token_hash


def hash_device_token(raw_token: str) -> str:
    """Compute the SHA-256 hash of a raw device token."""
    cleaned = raw_token.strip()
    return hashlib.sha256(cleaned.encode("utf-8")).hexdigest()
