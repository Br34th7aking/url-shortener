"""Production settings. Hardened further in Phase 5."""

from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False

# Re-read with no default: a missing secret key MUST fail loudly in prod.
SECRET_KEY = env("DJANGO_SECRET_KEY")

# Required in prod — never wildcard.
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS")

# Baseline TLS hardening (expanded in Phase 5).
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
# Refresh-token cookie carries the long-lived credential — never over plain HTTP.
AUTH_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("DJANGO_HSTS_SECONDS", default=2592000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
