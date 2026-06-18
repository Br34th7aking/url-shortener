from django.conf import settings
from django.core.validators import RegexValidator, URLValidator
from django.db import IntegrityError
from django.utils import timezone
from rest_framework import serializers

from apps.links.exceptions import AliasConflict
from apps.links.models import Link

# Path-like names the edge or origin owns; can't be claimed as an alias.
RESERVED_CODES = {"health", "api", "admin", "links"}

# Aliases are URL-path-safe: letters, digits, hyphen, underscore only.
_ALIAS_CHARSET = RegexValidator(
    regex=r"^[A-Za-z0-9_-]+$",
    message="Use only letters, numbers, hyphens, and underscores.",
)


class LinkSerializer(serializers.ModelSerializer):
    """Serialize a Link for the create endpoint.

    `long_url` is restricted to http/https — a shortener that accepts
    `javascript:`/`data:` URLs is an XSS/open-redirect vector. `code` is
    optional: omit it for a random code, or supply a custom alias (validated
    here, uniqueness enforced at insert). `short_url` is derived from the code.
    """

    long_url = serializers.URLField(
        max_length=2048,
        validators=[URLValidator(schemes=["http", "https"])],
    )
    code = serializers.CharField(
        required=False,
        min_length=3,
        max_length=12,
        validators=[_ALIAS_CHARSET],
    )
    short_url = serializers.SerializerMethodField()

    class Meta:
        model = Link
        fields = ["short_url", "code", "long_url", "expires_at"]

    def get_short_url(self, obj) -> str:
        return f"{settings.SHORT_BASE_URL}/{obj.code}"

    def validate_code(self, value: str) -> str:
        if value.lower() in RESERVED_CODES:
            raise serializers.ValidationError("That alias is reserved.")
        return value

    def validate_expires_at(self, value):
        # A non-future expiry would create an already-dead link.
        if value <= timezone.now():
            raise serializers.ValidationError("Expiry must be in the future.")
        return value

    def create(self, validated_data):
        # owner is injected by the view's perform_create (request.user).
        owner = validated_data.get("owner")
        expires_at = validated_data.get("expires_at")
        code = validated_data.get("code")
        if code:
            try:
                return Link.objects.create_with_code(
                    code=code,
                    long_url=validated_data["long_url"],
                    owner=owner,
                    expires_at=expires_at,
                )
            except IntegrityError:
                raise AliasConflict() from None
        return Link.objects.create_with_unique_code(
            long_url=validated_data["long_url"], owner=owner, expires_at=expires_at
        )


class LinkResolveSerializer(serializers.ModelSerializer):
    """Output-only shape for the Worker's KV-miss lookup: where + when-expires.

    Expiry is surfaced but not enforced here — the edge (Phase 3) acts on it.
    """

    class Meta:
        model = Link
        fields = ["long_url", "expires_at"]
