from rest_framework import generics
from rest_framework.permissions import AllowAny

from apps.links.models import Link
from apps.links.serializers import LinkResolveSerializer, LinkSerializer


class LinkCreateView(generics.CreateAPIView):
    """POST /api/v1/links -> 201 {short_url, code, long_url}.

    Open in Phase 1 (no auth yet); locked to IsAuthenticated in Phase 2.
    """

    serializer_class = LinkSerializer
    permission_classes = [AllowAny]


class LinkResolveView(generics.RetrieveAPIView):
    """GET /api/v1/links/{code}/resolve -> 200 {long_url, expires_at}, 404 if absent.

    The Worker calls this on a KV miss. Open in Phase 1; shared-secret auth in
    Phase 2. get_object() raises Http404 for an unknown code -> DRF 404.
    """

    queryset = Link.objects.all()
    serializer_class = LinkResolveSerializer
    lookup_field = "code"
    permission_classes = [AllowAny]
