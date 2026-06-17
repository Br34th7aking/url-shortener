"""Phase 2 #22 — link ownership + my-links.

Creating a link now requires authentication and stamps the caller as owner.
`GET /api/v1/links` lists only the caller's own links, paginated.
"""

import pytest
from rest_framework.test import APIClient

from apps.links.models import Link

pytestmark = pytest.mark.django_db

LINKS_URL = "/api/v1/links"


@pytest.fixture
def user(django_user_model):
    return django_user_model.objects.create_user(
        email="ada@example.com", password="s3cure-pass-23"
    )


@pytest.fixture
def other_user(django_user_model):
    return django_user_model.objects.create_user(
        email="bob@example.com", password="s3cure-pass-23"
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_anonymous_create_rejected():
    resp = APIClient().post(
        LINKS_URL, {"long_url": "https://example.com"}, format="json"
    )
    assert resp.status_code == 401
    assert Link.objects.count() == 0


def test_create_stamps_request_user_as_owner(auth_client, user):
    resp = auth_client.post(
        LINKS_URL, {"long_url": "https://example.com"}, format="json"
    )
    assert resp.status_code == 201
    link = Link.objects.get(code=resp.json()["code"])
    assert link.owner == user


def test_anonymous_list_rejected():
    resp = APIClient().get(LINKS_URL)
    assert resp.status_code == 401


def test_list_returns_only_callers_links(auth_client, user, other_user):
    Link.objects.create_with_unique_code(long_url="https://a.example", owner=user)
    Link.objects.create_with_unique_code(long_url="https://b.example", owner=user)
    Link.objects.create_with_unique_code(long_url="https://c.example", owner=other_user)

    resp = auth_client.get(LINKS_URL)

    assert resp.status_code == 200
    assert resp.data["count"] == 2
    owners = {row["long_url"] for row in resp.data["results"]}
    assert owners == {"https://a.example", "https://b.example"}


def test_list_is_paginated(auth_client, user):
    Link.objects.create_with_unique_code(long_url="https://a.example", owner=user)

    resp = auth_client.get(LINKS_URL)

    assert resp.status_code == 200
    # PageNumberPagination envelope
    assert set(resp.data) >= {"count", "next", "previous", "results"}
