"""Phase 2 #21 — refresh + logout (cookie-based, with rotation + blacklist).

The refresh token is read from the httpOnly cookie (never the body). Refresh
rotates: a new refresh token is issued (and re-cookied) and the old one is
blacklisted. Logout blacklists the current refresh token and clears the cookie.
"""

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

LOGIN_URL = "/api/v1/auth/login"
REFRESH_URL = "/api/v1/auth/refresh"
LOGOUT_URL = "/api/v1/auth/logout"

EMAIL = "ada@example.com"
PASSWORD = "s3cure-pass-23"
REFRESH_COOKIE = "refresh_token"


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def logged_in(client, django_user_model):
    """A client carrying a fresh refresh cookie from a real login."""
    django_user_model.objects.create_user(email=EMAIL, password=PASSWORD)
    resp = client.post(LOGIN_URL, {"email": EMAIL, "password": PASSWORD}, format="json")
    assert resp.status_code == 200
    return client


def test_refresh_returns_new_access_and_rotates_cookie(logged_in):
    old_refresh = logged_in.cookies[REFRESH_COOKIE].value

    resp = logged_in.post(REFRESH_URL, format="json")

    assert resp.status_code == 200
    assert "access" in resp.data
    assert "refresh" not in resp.data  # rotated refresh goes to the cookie
    new_cookie = resp.cookies.get(REFRESH_COOKIE)
    assert new_cookie is not None
    assert new_cookie["httponly"]
    assert new_cookie.value != old_refresh  # rotated, not echoed


def test_refresh_without_cookie_rejected(client):
    resp = client.post(REFRESH_URL, format="json")
    assert resp.status_code == 401


def test_old_refresh_blacklisted_after_rotation(logged_in):
    old_refresh = logged_in.cookies[REFRESH_COOKIE].value

    first = logged_in.post(REFRESH_URL, format="json")
    assert first.status_code == 200

    # Replay the pre-rotation token explicitly — it must be blacklisted now.
    logged_in.cookies[REFRESH_COOKIE] = old_refresh
    replay = logged_in.post(REFRESH_URL, format="json")
    assert replay.status_code == 401


def test_logout_blacklists_token_and_clears_cookie(logged_in):
    resp = logged_in.post(LOGOUT_URL, format="json")
    assert resp.status_code == 205

    cleared = resp.cookies.get(REFRESH_COOKIE)
    assert cleared is not None
    assert cleared.value == ""  # cookie cleared

    # The logged-out refresh token can no longer mint an access token.
    again = logged_in.post(REFRESH_URL, format="json")
    assert again.status_code == 401


def test_logout_without_cookie_is_idempotent(client):
    resp = client.post(LOGOUT_URL, format="json")
    assert resp.status_code == 205
