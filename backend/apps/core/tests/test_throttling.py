"""Phase 2 #23 — DRF rate throttling (anon + user).

Anonymous callers are throttled by IP (protects login/register from brute
force); authenticated callers by user id. Machine endpoints (health, the
Worker's /resolve) are exempt — covered in their own tests.

DRF freezes ``SimpleRateThrottle.THROTTLE_RATES`` as a class attribute at
import time, so ``override_settings(REST_FRAMEWORK=...)`` doesn't reliably
change the active rates in tests. We monkeypatch that attribute directly — the
exact dict ``get_rate()`` reads — which is order-independent and restored
automatically. (Production is unaffected: rates are fixed before import.)
"""

import pytest
from django.core.cache import cache
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

LOGIN_URL = "/api/v1/auth/login"
LINKS_URL = "/api/v1/links"


@pytest.fixture(autouse=True)
def tiny_rates(monkeypatch):
    """Cap both scopes at 2/min and isolate throttle counters per test."""
    cache.clear()
    monkeypatch.setattr(
        SimpleRateThrottle, "THROTTLE_RATES", {"anon": "2/min", "user": "2/min"}
    )
    yield
    cache.clear()


def test_anonymous_requests_are_throttled():
    client = APIClient()
    payload = {"email": "nobody@example.com", "password": "wrong-password"}

    assert client.post(LOGIN_URL, payload, format="json").status_code == 401
    assert client.post(LOGIN_URL, payload, format="json").status_code == 401
    # Third anonymous hit exceeds 2/min — throttled before reaching the view.
    assert client.post(LOGIN_URL, payload, format="json").status_code == 429


def test_authenticated_requests_are_throttled(django_user_model):
    user = django_user_model.objects.create_user(
        email="ada@example.com", password="s3cure-pass-23"
    )
    client = APIClient()
    client.force_authenticate(user=user)

    assert client.get(LINKS_URL).status_code == 200
    assert client.get(LINKS_URL).status_code == 200
    # Third hit from the same user exceeds 2/min.
    assert client.get(LINKS_URL).status_code == 429
