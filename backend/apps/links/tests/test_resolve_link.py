from datetime import datetime, timezone

import pytest
from rest_framework.test import APIClient

from apps.links.models import Link

# The Worker authenticates to the internal /resolve endpoint with this secret.
SECRET = "test-shared-secret"

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def shared_secret(settings):
    settings.SHARED_SECRET = SECRET


def resolve(code: str, secret: str | None = SECRET):
    """GET /resolve as the Worker would — with the shared-secret header."""
    headers = {"X-Shared-Secret": secret} if secret is not None else {}
    return APIClient().get(f"/api/v1/links/{code}/resolve", headers=headers)


def test_resolve_returns_target_and_null_expiry():
    """A known code resolves to its long_url; an unset expiry serializes null."""
    Link.objects.create(code="res1234", long_url="https://example.com/page")

    resp = resolve("res1234")

    assert resp.status_code == 200
    body = resp.json()
    assert body["long_url"] == "https://example.com/page"
    assert body["expires_at"] is None
    # Resolve is the Worker's KV-miss contract — it returns exactly these fields.
    assert set(body) == {"long_url", "expires_at"}


def test_resolve_returns_set_expiry():
    """When a link has an expiry, resolve surfaces it (edge enforces it later)."""
    Link.objects.create(
        code="exp1234",
        long_url="https://example.com",
        expires_at=datetime(2030, 1, 1, tzinfo=timezone.utc),
    )

    resp = resolve("exp1234")

    assert resp.status_code == 200
    assert resp.json()["expires_at"].startswith("2030-01-01")


def test_resolve_unknown_code_is_404():
    """An unknown code is a 404 so the Worker can return 404 to the visitor."""
    resp = resolve("nosuch1")

    assert resp.status_code == 404


def test_resolve_without_secret_is_403():
    """No shared-secret header -> 403; /resolve is Worker-internal only."""
    Link.objects.create(code="sec1234", long_url="https://example.com")

    resp = resolve("sec1234", secret=None)

    assert resp.status_code == 403


def test_resolve_with_wrong_secret_is_403():
    """A mismatched secret is rejected."""
    Link.objects.create(code="sec5678", long_url="https://example.com")

    resp = resolve("sec5678", secret="not-the-secret")

    assert resp.status_code == 403
