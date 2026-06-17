import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from apps.links.models import Link

# Deterministic base so short_url assertions don't depend on the dev env value.
BASE = "https://sho.rt"

pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client(django_user_model):
    """Authenticated client — creating links requires a logged-in user (Phase 2)."""
    user = django_user_model.objects.create_user(
        email="ada@example.com", password="s3cure-pass-23"
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@override_settings(SHORT_BASE_URL=BASE)
def test_creates_link_returns_201(auth_client):
    """POST a valid long_url -> 201 with {short_url, code, long_url} and a row."""
    resp = auth_client.post(
        "/api/v1/links", {"long_url": "https://example.com/path"}, format="json"
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["long_url"] == "https://example.com/path"
    assert body["code"]
    assert body["short_url"] == f"{BASE}/{body['code']}"

    link = Link.objects.get(code=body["code"])
    assert link.long_url == "https://example.com/path"


@override_settings(SHORT_BASE_URL=BASE)
def test_generated_code_is_seven_base62_chars(auth_client):
    """Auto codes are 7-char base62 draws (Strategy B)."""
    resp = auth_client.post(
        "/api/v1/links", {"long_url": "https://example.com"}, format="json"
    )

    code = resp.json()["code"]
    assert len(code) == 7
    assert code.isalnum()


@pytest.mark.parametrize(
    "bad_url",
    [
        "javascript:alert(1)",  # XSS vector
        "data:text/html,<script>alert(1)</script>",  # data-URI XSS
        "ftp://example.com/file",  # non-web scheme
        "not-a-url",  # no scheme/host
        "",  # empty
    ],
)
def test_rejects_non_http_urls(auth_client, bad_url):
    """Only http/https are shortenable; everything else is a 400 and no row."""
    resp = auth_client.post("/api/v1/links", {"long_url": bad_url}, format="json")

    assert resp.status_code == 400
    assert Link.objects.count() == 0


def test_rejects_missing_long_url(auth_client):
    """Omitting long_url is a 400."""
    resp = auth_client.post("/api/v1/links", {}, format="json")

    assert resp.status_code == 400
    assert Link.objects.count() == 0
