"""Custom manager for Link.

The short `code` is allocated with Strategy B: a random base62 draw whose
uniqueness is owned by the DB unique constraint, not by a pre-check. The only
correct place to learn a code already exists is the failed INSERT, so the
allocation loop lives here at the persistence layer rather than in the
serializer.
"""

from django.db import IntegrityError, models, transaction

from apps.links.codec import generate_code

# A 7-char base62 code has a ~3.5e12 keyspace; at our scale a collision is rare,
# so a handful of retries makes exhausting them effectively impossible.
_MAX_ATTEMPTS = 5


class LinkManager(models.Manager):
    def create_with_unique_code(
        self, *, long_url, owner=None, expires_at=None, length=7
    ):
        """Create a Link with a freshly generated, unique short code.

        Retries on the unique-constraint collision (the authoritative check).
        Each attempt runs in its own atomic block so a failed INSERT doesn't
        poison an enclosing transaction. Raises after _MAX_ATTEMPTS.
        """
        for _ in range(_MAX_ATTEMPTS):
            code = generate_code(length)
            try:
                with transaction.atomic():
                    return self.create(
                        code=code,
                        long_url=long_url,
                        owner=owner,
                        expires_at=expires_at,
                    )
            except IntegrityError:
                continue
        raise RuntimeError(
            f"could not allocate a unique code after {_MAX_ATTEMPTS} attempts"
        )

    def create_with_code(self, *, code, long_url, owner=None, expires_at=None):
        """Create a Link with a caller-supplied code (custom alias).

        Single insert in its own atomic block: a unique-constraint collision
        surfaces as IntegrityError for the caller to translate into a 409.
        """
        with transaction.atomic():
            return self.create(
                code=code, long_url=long_url, owner=owner, expires_at=expires_at
            )
