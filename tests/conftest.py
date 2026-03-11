"""
Shared test fixtures.
Patches Supabase and Paynow so tests run without external services.
"""
import os
import sys
import types
import pytest
from unittest.mock import MagicMock, patch

# Clear Supabase env vars so db.py sets supabase=None (skips create_client)
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_KEY"] = ""
os.environ["PAYNOW_INTEGRATION_ID"] = "test-id"
os.environ["PAYNOW_INTEGRATION_KEY"] = "test-key"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["DEBUG"] = "false"

# Stub the `paynow` package before any app code imports it
if "paynow" not in sys.modules:
    paynow_mock = types.ModuleType("paynow")
    paynow_mock.Paynow = MagicMock  # type: ignore
    sys.modules["paynow"] = paynow_mock

# Now safe to import — db.supabase will be None, paynow is stubbed
import db
from app import app as _app  # registers all blueprints


@pytest.fixture()
def mock_supabase():
    """Returns a MagicMock that replaces the global supabase client."""
    mock = MagicMock()
    with patch.object(db, "supabase", mock), \
         patch("routes.auth.supabase", mock), \
         patch("routes.listings.supabase", mock), \
         patch("routes.bids.supabase", mock), \
         patch("routes.payments.supabase", mock), \
         patch("middleware.supabase", mock):
        yield mock


@pytest.fixture()
def client(mock_supabase):
    """Flask test client with mocked Supabase."""
    _app.config["TESTING"] = True
    with _app.test_client() as c:
        yield c


@pytest.fixture()
def auth_headers(mock_supabase):
    """Returns headers with a Bearer token and configures mock to validate it."""
    fake_user = MagicMock()
    fake_user.id = "user-uuid-123"
    fake_user.email = "test@example.com"
    fake_user.user_metadata = {
        "firstName": "Test",
        "lastName": "User",
        "phone": "0771234567",
    }
    mock_supabase.auth.get_user.return_value = MagicMock(user=fake_user)
    return {"Authorization": "Bearer fake-valid-token"}
