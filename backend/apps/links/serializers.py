from django.conf import settings
from django.core.validators import URLValidator
from rest_framework import serializers

from apps.links.models import Link


class LinkSerializer(serializers.ModelSerializer):
    """Serialize a Link for the create endpoint.

    `long_url` is restricted to http/https — a shortener that accepts
    `javascript:`/`data:` URLs is an XSS/open-redirect vector. `code` is
    allocated server-side (read-only) and `short_url` is derived from it.
    """

    long_url = serializers.URLField(
        max_length=2048,
        validators=[URLValidator(schemes=["http", "https"])],
    )
    short_url = serializers.SerializerMethodField()

    class Meta:
        model = Link
        fields = ["short_url", "code", "long_url"]
        read_only_fields = ["code"]

    def get_short_url(self, obj) -> str:
        return f"{settings.SHORT_BASE_URL}/{obj.code}"

    def create(self, validated_data):
        # owner is injected by the view's perform_create (request.user).
        return Link.objects.create_with_unique_code(
            long_url=validated_data["long_url"],
            owner=validated_data.get("owner"),
        )


class LinkResolveSerializer(serializers.ModelSerializer):
    """Output-only shape for the Worker's KV-miss lookup: where + when-expires.

    Expiry is surfaced but not enforced here — the edge (Phase 3) acts on it.
    """

    class Meta:
        model = Link
        fields = ["long_url", "expires_at"]
