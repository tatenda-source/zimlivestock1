"""Tests for payment endpoints."""
from unittest.mock import MagicMock, patch


def test_initiate_web_payment(client, mock_supabase, auth_headers):
    # Mock livestock lookup
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={"id": 1, "title": "Bull", "currentBid": 1000, "startingPrice": 500}
    )
    # Mock payment insert
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}])

    with patch("routes.payments.initiate_web_payment") as mock_pay:
        mock_pay.return_value = {
            "redirect_url": "https://paynow.co.zw/pay/123",
            "poll_url": "https://paynow.co.zw/poll/123",
        }

        res = client.post("/payments/initiate", json={
            "livestock_id": 1,
            "payment_method": "web",
        }, headers=auth_headers)

        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "pending"
        assert "redirect_url" in data
        assert data["redirect_url"] == "https://paynow.co.zw/pay/123"


def test_initiate_mobile_payment(client, mock_supabase, auth_headers):
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={"id": 1, "title": "Goat", "currentBid": None, "startingPrice": 200}
    )
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}])

    with patch("routes.payments.initiate_mobile_payment") as mock_pay:
        mock_pay.return_value = {
            "poll_url": "https://paynow.co.zw/poll/456",
            "instructions": "Dial *151#",
        }

        res = client.post("/payments/initiate", json={
            "livestock_id": 1,
            "payment_method": "ecocash",
            "phone": "0771234567",
        }, headers=auth_headers)

        assert res.status_code == 200
        data = res.get_json()
        assert data["instructions"] == "Dial *151#"


def test_initiate_mobile_no_phone(client, mock_supabase, auth_headers):
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={"id": 1, "title": "Goat", "currentBid": None, "startingPrice": 200}
    )

    res = client.post("/payments/initiate", json={
        "livestock_id": 1,
        "payment_method": "ecocash",
    }, headers=auth_headers)

    assert res.status_code == 400
    assert "Phone" in res.get_json()["detail"]


def test_initiate_payment_no_auth(client, mock_supabase):
    res = client.post("/payments/initiate", json={
        "livestock_id": 1,
        "payment_method": "web",
    })
    assert res.status_code == 401


def test_initiate_payment_missing_fields(client, mock_supabase, auth_headers):
    res = client.post("/payments/initiate", json={
        "livestock_id": 1,
    }, headers=auth_headers)
    assert res.status_code == 400


def test_webhook_valid(client, mock_supabase):
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"id": 1, "status": "pending", "livestock_id": 5}]
    )
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    with patch("routes.payments.verify_paynow_webhook", return_value=True):
        res = client.post("/payments/webhook", data={
            "reference": "ZL-1-ABC123",
            "paynowreference": "PAY-123",
            "status": "Paid",
        })

    assert res.status_code == 200
    assert res.get_json()["received"] is True


def test_webhook_invalid_hash(client, mock_supabase):
    with patch("routes.payments.verify_paynow_webhook", return_value=False):
        res = client.post("/payments/webhook", data={
            "reference": "ZL-1-ABC123",
            "status": "Paid",
        })

    assert res.status_code == 400
    assert "Invalid" in res.get_json()["detail"]


def test_get_payment_status(client, mock_supabase, auth_headers):
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{
            "id": 1,
            "status": "paid",
            "payer_id": "user-uuid-123",
            "paynow_poll_url": None,
            "paynow_redirect_url": None,
            "paynow_instructions": None,
        }]
    )

    res = client.get("/payments/status/ZL-1-ABC123", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["paid"] is True
    assert data["status"] == "paid"


def test_get_payment_status_forbidden(client, mock_supabase, auth_headers):
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"id": 1, "status": "paid", "payer_id": "other-user-id"}]
    )

    res = client.get("/payments/status/ZL-1-ABC123", headers=auth_headers)
    assert res.status_code == 403


def test_get_payment_status_not_found(client, mock_supabase, auth_headers):
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[]
    )

    res = client.get("/payments/status/ZL-999-NOTFOUND", headers=auth_headers)
    assert res.status_code == 404


def test_payment_history(client, mock_supabase, auth_headers):
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
        data=[
            {"id": 1, "amount": 1000, "status": "paid"},
            {"id": 2, "amount": 200, "status": "pending"},
        ]
    )

    res = client.get("/payments/history", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert len(data) == 2


def test_payment_history_no_auth(client, mock_supabase):
    res = client.get("/payments/history")
    assert res.status_code == 401
