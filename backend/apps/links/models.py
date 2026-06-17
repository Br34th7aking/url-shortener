from django.conf import settings
from django.db import models

from apps.links.managers import LinkManager


class Link(models.Model):
    """A shortened link: a unique short `code` mapping to a `long_url`.

    `owner` is nullable so links can be created anonymously (no auth in Phase 1,
    and anonymous shortening stays supported). SET_NULL keeps a link's redirect
    working even if the owning user is later deleted. `expires_at` is stored now
    for the /resolve contract; expiry enforcement lands in Phase 3.
    """

    code = models.CharField(max_length=12, unique=True)
    long_url = models.URLField(max_length=2048)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="links",
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = LinkManager()

    def __str__(self):
        return f"{self.code} -> {self.long_url}"
