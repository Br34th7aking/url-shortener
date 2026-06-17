from datetime import datetime, timezone

import pytest
from rest_framework.test import APIClient

from apps.links.models import Link


@pytest.mark.django_db
def test_resolve_returns_target_and_null_expiry():
    """A known code resolves to its long_url; an unset expiry serializes null."""
    Link.objects.create(code="res1234", long_url="https://example.com/page")

    resp = APIClient().get("/api/v1/links/res1234/resolve")

    assert resp.status_code == 200
    body = resp.json()
    assert body["long_url"] == "https://example.com/page"
    assert body["expires_at"] is None
    # Resolve is the Worker's KV-miss contract — it returns exactly these fields.
    assert set(body) == {"long_url", "expires_at"}


@pytest.mark.django_db
def test_resolve_returns_set_expiry():
    """When a link has an expiry, resolve surfaces it (edge enforces it later)."""
    Link.objects.create(
        code="exp1234",
        long_url="https://example.com",
        expires_at=datetime(2030, 1, 1, tzinfo=timezone.utc),
    )

    resp = APIClient().get("/api/v1/links/exp1234/resolve")

    assert resp.status_code == 200
    assert resp.json()["expires_at"].startswith("2030-01-01")


@pytest.mark.django_db
def test_resolve_unknown_code_is_404():
    """An unknown code is a 404 so the Worker can return 404 to the visitor."""
    resp = APIClient().get("/api/v1/links/nosuch1/resolve")

    assert resp.status_code == 404
