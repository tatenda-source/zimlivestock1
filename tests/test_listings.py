"""Tests for livestock listing endpoints."""
from unittest.mock import MagicMock


def test_get_listings(client, mock_supabase):
    mock_supabase.table.return_value.select.return_value.execute.return_value = MagicMock(
        data=[
            {"id": 1, "title": "Bull", "category": "cattle", "startingPrice": 500},
            {"id": 2, "title": "Goat", "category": "goats", "startingPrice": 100},
        ]
    )

    res = client.get("/livestock")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data) == 2
    assert data[0]["title"] == "Bull"


def test_get_listings_by_category(client, mock_supabase):
    query = MagicMock()
    mock_supabase.table.return_value.select.return_value = query
    query.eq.return_value.execute.return_value = MagicMock(
        data=[{"id": 2, "title": "Goat", "category": "goats"}]
    )

    res = client.get("/livestock?category=goats")
    assert res.status_code == 200
    query.eq.assert_called_once_with("category", "goats")


def test_get_single_listing(client, mock_supabase):
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={"id": 1, "title": "Bull", "bids": []}
    )

    res = client.get("/livestock/1")
    assert res.status_code == 200
    assert res.get_json()["title"] == "Bull"


def test_create_listing_success(client, mock_supabase, auth_headers):
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": 10, "title": "New Bull", "category": "cattle"}]
    )

    res = client.post("/livestock", json={
        "title": "New Bull",
        "description": "A fine bull",
        "category": "cattle",
        "startingPrice": 500,
        "breed": "Brahman",
        "location": "Harare",
    }, headers=auth_headers)

    assert res.status_code == 201
    assert res.get_json()["title"] == "New Bull"


def test_create_listing_no_auth(client, mock_supabase):
    res = client.post("/livestock", json={
        "title": "Bull",
        "category": "cattle",
        "startingPrice": 500,
    })
    assert res.status_code == 401


def test_create_listing_missing_title(client, mock_supabase, auth_headers):
    res = client.post("/livestock", json={
        "category": "cattle",
        "startingPrice": 500,
    }, headers=auth_headers)
    assert res.status_code == 400
    assert "Title" in res.get_json()["detail"]


def test_create_listing_invalid_price(client, mock_supabase, auth_headers):
    res = client.post("/livestock", json={
        "title": "Bull",
        "category": "cattle",
        "startingPrice": -100,
    }, headers=auth_headers)
    assert res.status_code == 400
    assert "positive number" in res.get_json()["detail"]


def test_create_listing_invalid_category(client, mock_supabase, auth_headers):
    res = client.post("/livestock", json={
        "title": "Bull",
        "category": "elephants",
        "startingPrice": 500,
    }, headers=auth_headers)
    assert res.status_code == 400
    assert "Category" in res.get_json()["detail"]


def test_create_listing_title_too_long(client, mock_supabase, auth_headers):
    res = client.post("/livestock", json={
        "title": "A" * 201,
        "category": "cattle",
        "startingPrice": 500,
    }, headers=auth_headers)
    assert res.status_code == 400
