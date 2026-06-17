from rest_framework import generics
from rest_framework.permissions import AllowAny

from apps.links.serializers import LinkSerializer


class LinkCreateView(generics.CreateAPIView):
    """POST /api/v1/links -> 201 {short_url, code, long_url}.

    Open in Phase 1 (no auth yet); locked to IsAuthenticated in Phase 2.
    """

    serializer_class = LinkSerializer
    permission_classes = [AllowAny]
