"""Phase 3 #25 — custom aliases.

A caller may supply their own `code` instead of the random one. It's validated
(charset, length, reserved words) and must be unique; a collision is a 409
(distinct from a 400 validation error).
"""

import pytest
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


def _create(client, **extra):
    return client.post(LINKS_URL, {"long_url": LONG_URL, **extra}, format="json")


def test_custom_alias_is_used_as_the_code(auth_client):
    resp = _create(auth_client, code="my-talk")
    assert resp.status_code == 201
    assert resp.json()["code"] == "my-talk"
    assert Link.objects.filter(code="my-talk").exists()


def test_omitting_code_still_autogenerates(auth_client):
    resp = _create(auth_client)
    assert resp.status_code == 201
    code = resp.json()["code"]
    assert len(code) == 7 and code.isalnum()  # random Strategy-B code


@pytest.mark.parametrize(
    "alias",
    [
        "has space",
        "bad!char",
        "white/slash",
        "ab",  # too short (<3)
        "a" * 13,  # too long (>12)
    ],
)
def test_invalid_alias_is_400(auth_client, alias):
    resp = _create(auth_client, code=alias)
    assert resp.status_code == 400
    assert Link.objects.count() == 0


@pytest.mark.parametrize("reserved", ["health", "api", "admin", "links"])
def test_reserved_alias_is_400(auth_client, reserved):
    resp = _create(auth_client, code=reserved)
    assert resp.status_code == 400
    assert Link.objects.count() == 0


def test_duplicate_alias_is_409(auth_client):
    assert _create(auth_client, code="dup").status_code == 201
    resp = _create(auth_client, code="dup")
    assert resp.status_code == 409
    assert Link.objects.filter(code="dup").count() == 1


def test_alias_collision_with_existing_autocode_is_409(auth_client):
    existing = Link.objects.create_with_unique_code(long_url=LONG_URL)
    resp = _create(auth_client, code=existing.code)
    assert resp.status_code == 409
