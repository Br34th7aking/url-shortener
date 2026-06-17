from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.links.models import Link
from apps.links.permissions import HasSharedSecret
from apps.links.serializers import LinkResolveSerializer, LinkSerializer


class LinkListCreateView(generics.ListCreateAPIView):
    """/api/v1/links — the owner's link collection.

    POST -> 201 {short_url, code, long_url}, stamping the caller as owner.
    GET  -> 200 paginated list of the caller's own links (most recent first).
    Both require authentication; a link always belongs to exactly one user.
    """

    serializer_class = LinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Link.objects.filter(owner=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class LinkResolveView(generics.RetrieveAPIView):
    """GET /api/v1/links/{code}/resolve -> 200 {long_url, expires_at}, 404 if absent.

    The Worker calls this on a KV miss, authenticating with the shared secret.
    Throttling is off: it's machine-to-machine, low-volume (KV-cached after the
    first hit), and already gated by the secret. get_object() -> Http404 -> 404.
    """

    queryset = Link.objects.all()
    serializer_class = LinkResolveSerializer
    lookup_field = "code"
    # Shared-secret only — no JWT here. Clearing authenticators means a failed
    # check returns 403 (not a 401 WWW-Authenticate challenge from JWTAuth).
    authentication_classes = []
    permission_classes = [HasSharedSecret]
    throttle_classes = []
