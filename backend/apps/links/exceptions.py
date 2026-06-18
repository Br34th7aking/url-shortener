from rest_framework import status
from rest_framework.exceptions import APIException


class AliasConflict(APIException):
    """A requested custom alias is already taken.

    409 (not 400): the input is well-formed, it just collides with an existing
    code — a state conflict the client can resolve by choosing another alias.
    """

    status_code = status.HTTP_409_CONFLICT
    default_detail = "That alias is already taken."
    default_code = "alias_conflict"
