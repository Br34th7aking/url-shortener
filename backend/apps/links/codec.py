"""Short-code generation.

Strategy B: codes are random draws from a base62 alphabet (not an encoding of
the row id), so they are non-enumerable and don't leak how many links exist.
There is deliberately no decode() — a random code has no arithmetic relation to
the id; resolution is a plain string lookup on the stored `code` column.

Uniqueness is enforced by the DB unique constraint, not here: this function only
produces a candidate. The insert layer retries on the (rare) collision.
"""

import secrets

# 0-9, A-Z, a-z — 62 URL-safe chars, no padding or symbols needing escaping.
ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def generate_code(length: int = 7) -> str:
    """Return a random base62 code.

    Uses secrets.choice (CSPRNG) so codes can't be predicted from prior output;
    62**7 ~= 3.5e12 keyspace makes collisions negligible at our scale.
    """
    return "".join(secrets.choice(ALPHABET) for _ in range(length))
