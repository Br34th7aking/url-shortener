"""Phase 2 #20 — register + login.

Auth contract: the short-lived access token is returned in the JSON body
(frontend keeps it in memory); the long-lived refresh token is set as an
httpOnly cookie and never appears in the body (XSS can't read it).
"""

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"

EMAIL = "ada@example.com"
PASSWORD = "s3cure-pass-23"
REFRESH_COOKIE = "refresh_token"


@pytest.fixture
def client():
    return APIClient()


def test_register_creates_user(client, django_user_model):
    resp = client.post(
        REGISTER_URL, {"email": EMAIL, "password": PASSWORD}, format="json"
    )
    assert resp.status_code == 201
    assert django_user_model.objects.filter(email=EMAIL).exists()


def test_register_returns_access_and_sets_refresh_cookie(client):
    resp = client.post(
        REGISTER_URL, {"email": EMAIL, "password": PASSWORD}, format="json"
    )
    assert resp.status_code == 201
    assert "access" in resp.data
    assert "refresh" not in resp.data  # refresh never in body
    cookie = resp.cookies.get(REFRESH_COOKIE)
    assert cookie is not None
    assert cookie["httponly"]


def test_register_weak_password_rejected(client, django_user_model):
    resp = client.post(REGISTER_URL, {"email": EMAIL, "password": "123"}, format="json")
    assert resp.status_code == 400
    assert not django_user_model.objects.filter(email=EMAIL).exists()


def test_register_duplicate_email_rejected(client, django_user_model):
    django_user_model.objects.create_user(email=EMAIL, password=PASSWORD)
    resp = client.post(
        REGISTER_URL, {"email": EMAIL, "password": PASSWORD}, format="json"
    )
    assert resp.status_code == 400


def test_login_returns_access_and_sets_refresh_cookie(client, django_user_model):
    django_user_model.objects.create_user(email=EMAIL, password=PASSWORD)
    resp = client.post(LOGIN_URL, {"email": EMAIL, "password": PASSWORD}, format="json")
    assert resp.status_code == 200
    assert "access" in resp.data
    assert "refresh" not in resp.data
    cookie = resp.cookies.get(REFRESH_COOKIE)
    assert cookie is not None
    assert cookie["httponly"]


def test_login_bad_credentials_rejected(client, django_user_model):
    django_user_model.objects.create_user(email=EMAIL, password=PASSWORD)
    resp = client.post(
        LOGIN_URL, {"email": EMAIL, "password": "wrong-password"}, format="json"
    )
    assert resp.status_code == 401


@override_settings(AUTH_COOKIE_SECURE=True)
def test_refresh_cookie_marked_secure_when_configured(client):
    """When AUTH_COOKIE_SECURE is on (prod), the refresh cookie carries Secure
    so the long-lived token never travels over plain HTTP."""
    resp = client.post(
        REGISTER_URL, {"email": EMAIL, "password": PASSWORD}, format="json"
    )
    assert resp.cookies[REFRESH_COOKIE]["secure"]
