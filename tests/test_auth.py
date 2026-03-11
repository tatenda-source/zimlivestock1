"""Tests for authentication endpoints."""
from unittest.mock import MagicMock


class FakeUser(dict):
    """JSON-serializable fake Supabase user that also supports attribute access."""
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.__dict__.update(kwargs)


def test_register_success(client, mock_supabase):
    fake_user = FakeUser(id="new-user-uuid", email="new@example.com")
    mock_supabase.auth.sign_up.return_value = MagicMock(user=fake_user)

    res = client.post("/auth/register", json={
        "email": "new@example.com",
        "password": "securepassword123",
        "firstName": "New",
        "lastName": "User",
        "phone": "0771234567",
    })
    assert res.status_code == 201
    mock_supabase.auth.sign_up.assert_called_once()


def test_register_missing_email(client, mock_supabase):
    res = client.post("/auth/register", json={"password": "test123"})
    assert res.status_code == 400
    assert "Email and password" in res.get_json()["detail"]


def test_register_missing_password(client, mock_supabase):
    res = client.post("/auth/register", json={"email": "a@b.com"})
    assert res.status_code == 400


def test_register_no_body(client, mock_supabase):
    res = client.post("/auth/register", content_type="application/json")
    assert res.status_code == 400


def test_login_success(client, mock_supabase):
    fake_session = MagicMock()
    fake_session.access_token = "jwt-token-123"
    fake_user = FakeUser(id="user-uuid", email="test@example.com")
    mock_supabase.auth.sign_in_with_password.return_value = MagicMock(
        session=fake_session, user=fake_user
    )

    res = client.post("/auth/login", json={
        "contact": "test@example.com",
        "password": "password123",
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["access_token"] == "jwt-token-123"
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials(client, mock_supabase):
    mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid")

    res = client.post("/auth/login", json={
        "contact": "wrong@example.com",
        "password": "wrongpassword",
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.get_json()["detail"]


def test_me_authenticated(client, auth_headers):
    res = client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["id"] == "user-uuid-123"
    assert data["email"] == "test@example.com"
    assert data["firstName"] == "Test"


def test_me_no_token(client, mock_supabase):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_me_bad_token(client, mock_supabase):
    mock_supabase.auth.get_user.side_effect = Exception("Invalid token")
    res = client.get("/auth/me", headers={"Authorization": "Bearer bad-token"})
    assert res.status_code == 401
