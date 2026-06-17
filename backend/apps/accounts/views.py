from django.conf import settings
from rest_framework import status
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RegisterSerializer


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Attach the refresh token as an httpOnly cookie.

    httpOnly keeps it out of reach of page JS (XSS can't exfiltrate it); the
    path scopes it to the auth endpoints; max-age mirrors the token lifetime.
    """
    response.set_cookie(
        key=settings.AUTH_COOKIE,
        value=refresh_token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path=settings.AUTH_COOKIE_PATH,
    )


class RegisterView(CreateAPIView):
    """Sign up and log in atomically: create the user, then return an access
    token + refresh cookie so the SPA lands authenticated (no extra round-trip).
    """

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        response = Response(
            {"access": str(refresh.access_token)}, status=status.HTTP_201_CREATED
        )
        set_refresh_cookie(response, str(refresh))
        return response


class LoginView(TokenObtainPairView):
    """simplejwt obtain-pair, but the refresh token is moved out of the JSON
    body into an httpOnly cookie. Only the access token is returned in the body.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            # Defensive: a custom obtain-pair serializer (e.g. #21 rotation)
            # could reshape the body; only move the cookie if refresh is present.
            refresh = response.data.pop("refresh", None)
            if refresh is not None:
                set_refresh_cookie(response, refresh)
        return response
