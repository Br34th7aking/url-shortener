import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_health_returns_ok():
    """GET /api/v1/health reports the service + its DB and cache are reachable."""
    resp = APIClient().get("/api/v1/health")

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["db"] == "ok"
    assert body["redis"] == "ok"
