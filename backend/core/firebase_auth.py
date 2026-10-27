"""Verifies Firebase ID tokens sent by the web and Android apps.

When FIREBASE_AUTH_EMULATOR_HOST is set, firebase-admin accepts the unsigned
tokens the local Auth emulator issues. Never set it in production.
"""
import logging
import os
import threading

import firebase_admin
from firebase_admin import auth as firebase_auth

from config import settings

logger = logging.getLogger(__name__)

_app = None
_lock = threading.Lock()


class InvalidFirebaseToken(Exception):
    pass


def _get_app():
    global _app
    if _app is None:
        with _lock:
            if _app is None:
                # Verifying ID tokens only needs the project ID; Google's public
                # signing keys are fetched and cached by firebase-admin.
                _app = firebase_admin.initialize_app(
                    options={"projectId": settings.FIREBASE_PROJECT_ID},
                    name="fittmm",
                )
                if os.getenv("FIREBASE_AUTH_EMULATOR_HOST"):
                    logger.warning(
                        "Accepting Firebase Auth emulator tokens (FIREBASE_AUTH_EMULATOR_HOST is set)"
                    )
    return _app


def verify_id_token(token: str) -> dict:
    """Return the token's claims, or raise InvalidFirebaseToken."""
    try:
        return firebase_auth.verify_id_token(token, app=_get_app(), clock_skew_seconds=10)
    except (ValueError, firebase_auth.InvalidIdTokenError,
            firebase_auth.ExpiredIdTokenError, firebase_auth.RevokedIdTokenError,
            firebase_auth.CertificateFetchError, firebase_auth.UserDisabledError) as exc:
        raise InvalidFirebaseToken(str(exc)) from exc


def sign_in_provider(claims: dict) -> str:
    return (claims.get("firebase") or {}).get("sign_in_provider", "")
