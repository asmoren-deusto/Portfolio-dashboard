"""Authentication service: password hashing (PBKDF2-HMAC-SHA256) and session token management."""
import hashlib
import hmac
import os
import secrets
import time
from typing import Optional, Tuple

SECRET_KEY = os.getenv("SECRET_KEY", "portfolio-pro-super-secret-key-change-in-prod-2026")
PBKDF2_ITERATIONS = 100_000
TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 30  # 30 days


def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """
    Hash a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and a cryptographically
    secure 16-byte random salt.
    Returns (hex_hash, hex_salt).
    """
    if not salt:
        salt = secrets.token_hex(16)
    
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    )
    return key.hex(), salt


def verify_password(password: str, password_hash: str, salt: str) -> bool:
    """
    Verify a plaintext password against a stored PBKDF2 hash and salt using constant-time comparison.
    """
    if not password or not password_hash or not salt:
        return False
    computed_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(computed_hash, password_hash)


def create_access_token(user_id: str) -> str:
    """
    Generate an HMAC-SHA256 signed access token: {user_id}.{timestamp}.{hmac_signature}.
    """
    timestamp = str(int(time.time()))
    payload = f"{user_id}.{timestamp}"
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}.{signature}"


def verify_access_token(token: str) -> Optional[str]:
    """
    Verify the signature and timestamp of an access token.
    Returns user_id if valid, or None if invalid or expired.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        user_id, timestamp_str, received_sig = parts
        timestamp = int(timestamp_str)

        # Check expiration
        if time.time() - timestamp > TOKEN_EXPIRY_SECONDS:
            return None

        payload = f"{user_id}.{timestamp_str}"
        expected_sig = hmac.new(
            SECRET_KEY.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if secrets.compare_digest(expected_sig, received_sig):
            return user_id
        return None
    except Exception:
        return None
