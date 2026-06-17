from django.conf import settings
from django.utils.crypto import constant_time_compare
from rest_framework.permissions import BasePermission


class HasSharedSecret(BasePermission):
    """Worker↔origin auth for the internal /resolve endpoint.

    The edge Worker is the only legitimate caller; it presents a shared secret
    in the `X-Shared-Secret` header. Compared in constant time so a wrong
    secret can't be recovered by timing the response.
    """

    message = "Invalid or missing shared secret."

    def has_permission(self, request, view) -> bool:
        provided = request.headers.get("X-Shared-Secret", "")
        expected = settings.SHARED_SECRET
        return bool(expected) and constant_time_compare(provided, expected)
