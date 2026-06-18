"""Delete links whose expiry has passed.

The edge already returns 410 for expired links (reading expires_at from the KV
value), so this is pure housekeeping: reclaim the dead Postgres rows. Intended
to run on a cron / scheduled task. Use --dry-run to preview.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.links.models import Link


class Command(BaseCommand):
    help = "Delete links whose expires_at has passed."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report how many links would be deleted, without deleting.",
        )

    def handle(self, *args, **options):
        expired = Link.objects.filter(
            expires_at__isnull=False, expires_at__lte=timezone.now()
        )
        count = expired.count()

        if options["dry_run"]:
            self.stdout.write(f"[dry-run] {count} expired link(s) would be deleted.")
            return

        expired.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {count} expired link(s)."))
