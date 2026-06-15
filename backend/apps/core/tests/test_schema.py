from rest_framework.test import APIClient


def test_openapi_schema_available():
    resp = APIClient().get("/api/schema")
    assert resp.status_code == 200


def test_swagger_ui_available():
    resp = APIClient().get("/api/docs")
    assert resp.status_code == 200
