import logging

from django.core.cache import cache
from django.db import Error as DatabaseError
from django.db import connection
from rest_framework.decorators import api_view
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def _db_ok() -> bool:
    try:
        connection.ensure_connection()
        return True
    except DatabaseError:
        logger.exception("health: database check failed")
        return False


def _redis_ok() -> bool:
    # Cache-backend exceptions are driver-specific (redis-py vs locmem vs
    # memcached), so we catch broadly here — but always log, so a real outage
    # is never swallowed silently.
    try:
        cache.set("healthcheck", "ok", timeout=1)
        return cache.get("healthcheck") == "ok"
    except Exception:
        logger.exception("health: cache check failed")
        return False


@api_view(["GET"])
def health(request):
    """Liveness/readiness probe: reports the service + its DB and cache."""
    db_ok = _db_ok()
    redis_ok = _redis_ok()
    healthy = db_ok and redis_ok

    body = {
        "status": "ok" if healthy else "error",
        "db": "ok" if db_ok else "error",
        "redis": "ok" if redis_ok else "error",
    }
    # 503 when unhealthy so load balancers / k8s probes act on the status code.
    return Response(body, status=200 if healthy else 503)
