import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from apps.links.models import Link


@pytest.mark.django_db
def test_persists_core_fields():
    link = Link.objects.create(code="abc1234", long_url="https://example.com/path")
    link.refresh_from_db()
    assert link.code == "abc1234"
    assert link.long_url == "https://example.com/path"
    assert link.created_at is not None
    assert link.expires_at is None  # nullable; enforcement is Phase 3


@pytest.mark.django_db
def test_code_is_unique():
    Link.objects.create(code="dup1234", long_url="https://example.com")
    with pytest.raises(IntegrityError):
        Link.objects.create(code="dup1234", long_url="https://other.com")


@pytest.mark.django_db
def test_owner_is_optional_for_anonymous_links():
    link = Link.objects.create(code="anon123", long_url="https://example.com")
    assert link.owner is None


@pytest.mark.django_db
def test_owner_links_reverse_relation():
    User = get_user_model()
    user = User.objects.create_user(email="a@b.com", password="x")
    link = Link.objects.create(
        code="own1234", long_url="https://example.com", owner=user
    )
    assert list(user.links.all()) == [link]


@pytest.mark.django_db
def test_str_shows_code_and_target():
    link = Link.objects.create(code="str1234", long_url="https://example.com")
    assert "str1234" in str(link)
