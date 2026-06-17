"""Local development settings."""

from .base import *  # noqa: F401,F403

DEBUG = True

# Respect DJANGO_ALLOWED_HOSTS when set (e.g. compose adds "web" for the Vite
# proxy); fall back to the usual local hosts for bare `runserver`.
ALLOWED_HOSTS = env.list(  # noqa: F405
    "DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "0.0.0.0"]
)
