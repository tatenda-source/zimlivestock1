"""Tests for bidding endpoints."""
from unittest.mock import MagicMock


def test_get_bids(client, mock_supabase):
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
        data=[
            {"id": 1, "amount": 600, "bidder_id": "user-1", "livestock_id": 1},
            {"id": 2, "amount": 500, "bidder_id": "user-2", "livestock_id": 1},
        ]
    )

    res = client.get("/bids/livestock/1")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data) == 2
    assert data[0]["amount"] == 600


def test_place_bid_success(client, mock_supabase, auth_headers):
    # No existing bids
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[]
    )
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": 1, "amount": 500, "bidder_id": "user-uuid-123", "livestock_id": 1}]
    )

    res = client.post("/bids", json={
        "livestock_id": 1,
        "amount": 500,
    }, headers=auth_headers)

    assert res.status_code == 201
    assert res.get_json()["amount"] == 500


def test_place_bid_no_auth(client, mock_supabase):
    res = client.post("/bids", json={"livestock_id": 1, "amount": 500})
    assert res.status_code == 401


def test_place_bid_missing_fields(client, mock_supabase, auth_headers):
    res = client.post("/bids", json={"livestock_id": 1}, headers=auth_headers)
    assert res.status_code == 400
    assert "required" in res.get_json()["detail"]


def test_place_bid_negative_amount(client, mock_supabase, auth_headers):
    res = client.post("/bids", json={
        "livestock_id": 1,
        "amount": -100,
    }, headers=auth_headers)
    assert res.status_code == 400
    assert "positive" in res.get_json()["detail"]


def test_place_bid_too_low(client, mock_supabase, auth_headers):
    # Existing highest bid is 600
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[{"amount": 600}]
    )

    res = client.post("/bids", json={
        "livestock_id": 1,
        "amount": 500,
    }, headers=auth_headers)

    assert res.status_code == 400
    assert "higher" in res.get_json()["detail"]
