"""Phase 3 #27 — purge_expired_links management command.

The edge already 410s expired links; this housekeeping job reclaims the dead
Postgres rows. It must delete only links whose expiry has passed — never
future-dated or never-expiring ones.
"""

from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.links.models import Link

pytestmark = pytest.mark.django_db


def _link(code, **kwargs):
    return Link.objects.create(code=code, long_url="https://example.com", **kwargs)


def test_purges_only_expired_rows():
    now = timezone.now()
    _link("expired", expires_at=now - timedelta(hours=1))
    _link("future", expires_at=now + timedelta(hours=1))
    _link("noexpiry")  # expires_at is null -> never expires

    call_command("purge_expired_links")

    assert set(Link.objects.values_list("code", flat=True)) == {"future", "noexpiry"}


def test_reports_deleted_count():
    now = timezone.now()
    _link("e1", expires_at=now - timedelta(hours=1))
    _link("e2", expires_at=now - timedelta(days=3))

    out = StringIO()
    call_command("purge_expired_links", stdout=out)

    assert "2" in out.getvalue()


def test_dry_run_deletes_nothing():
    now = timezone.now()
    _link("expired", expires_at=now - timedelta(hours=1))

    out = StringIO()
    call_command("purge_expired_links", "--dry-run", stdout=out)

    assert Link.objects.filter(code="expired").exists()
    assert "dry-run" in out.getvalue().lower()
