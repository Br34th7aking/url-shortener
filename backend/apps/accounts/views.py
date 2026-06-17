from django.conf import settings
from rest_framework import status
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

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


def clear_refresh_cookie(response: Response) -> None:
    """Delete the refresh cookie. Path/samesite must match set_cookie or the
    browser keeps the original."""
    response.delete_cookie(
        key=settings.AUTH_COOKIE,
        path=settings.AUTH_COOKIE_PATH,
        samesite=settings.AUTH_COOKIE_SAMESITE,
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
            # Defensive: a custom obtain-pair serializer could reshape the body;
            # only move the cookie if refresh is present.
            refresh = response.data.pop("refresh", None)
            if refresh is not None:
                set_refresh_cookie(response, refresh)
        return response


class RefreshView(TokenRefreshView):
    """Refresh using the httpOnly cookie instead of the request body. Rotation
    is on, so the response carries a new refresh token — re-cookie it and keep
    it out of the JSON body. The consumed token is blacklisted by simplejwt.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get(settings.AUTH_COOKIE)
        if not refresh:
            raise InvalidToken("No refresh token cookie.")

        serializer = self.get_serializer(data={"refresh": refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc

        data = dict(serializer.validated_data)
        new_refresh = data.pop("refresh", None)
        response = Response(data, status=status.HTTP_200_OK)
        if new_refresh is not None:
            set_refresh_cookie(response, new_refresh)
        return response


class LogoutView(APIView):
    """Blacklist the current refresh token and clear the cookie. Idempotent:
    a missing or already-invalid token still clears the cookie and returns 205.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get(settings.AUTH_COOKIE)
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass  # already expired/invalid — nothing to revoke

        response = Response(status=status.HTTP_205_RESET_CONTENT)
        clear_refresh_cookie(response)
        return response
