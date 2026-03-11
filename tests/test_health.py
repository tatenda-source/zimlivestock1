"""Tests for root and health endpoints."""


def test_index(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.get_json()
    assert "ZimLivestock" in data["message"]
    assert "/health" in data["endpoints"]


def test_health(client, mock_supabase):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"
    assert data["framework"] == "flask"
    assert data["supabase_connected"] is True
