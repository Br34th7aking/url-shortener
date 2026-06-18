"""Phase 3 #26 — link expiration (create side).

A caller may set a future `expires_at`; the edge enforces it (410). Past/now
values are rejected at create. Expiry is surfaced by /resolve for the Worker.
"""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.links.models import Link

pytestmark = pytest.mark.django_db

LINKS_URL = "/api/v1/links"
LONG_URL = "https://example.com/target"


@pytest.fixture
def auth_client(django_user_model):
    user = django_user_model.objects.create_user(
        email="ada@example.com", password="s3cure-pass-23"
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_create_with_future_expiry(auth_client):
    expires = (timezone.now() + timedelta(hours=1)).isoformat()
    resp = auth_client.post(
        LINKS_URL, {"long_url": LONG_URL, "expires_at": expires}, format="json"
    )
    assert resp.status_code == 201
    assert resp.json()["expires_at"] is not None
    link = Link.objects.get(code=resp.json()["code"])
    assert link.expires_at is not None


def test_create_without_expiry_is_null(auth_client):
    resp = auth_client.post(LINKS_URL, {"long_url": LONG_URL}, format="json")
    assert resp.status_code == 201
    assert resp.json()["expires_at"] is None


@pytest.mark.parametrize("delta", [timedelta(hours=-1), timedelta(seconds=-1)])
def test_past_expiry_rejected(auth_client, delta):
    expires = (timezone.now() + delta).isoformat()
    resp = auth_client.post(
        LINKS_URL, {"long_url": LONG_URL, "expires_at": expires}, format="json"
    )
    assert resp.status_code == 400
    assert Link.objects.count() == 0


def test_custom_alias_with_expiry(auth_client):
    expires = (timezone.now() + timedelta(days=2)).isoformat()
    resp = auth_client.post(
        LINKS_URL,
        {"long_url": LONG_URL, "code": "my-talk", "expires_at": expires},
        format="json",
    )
    assert resp.status_code == 201
    link = Link.objects.get(code="my-talk")
    assert link.expires_at is not None
