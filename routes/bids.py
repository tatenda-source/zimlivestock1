import logging
from flask import Blueprint, request, jsonify
from db import supabase
from middleware import require_auth, require_supabase

logger = logging.getLogger(__name__)

bids_bp = Blueprint("bids", __name__, url_prefix="/bids")


@bids_bp.route("/livestock/<int:livestock_id>", methods=["GET"])
@require_supabase
def get_bids(livestock_id):
    res = (
        supabase.table("bids")
        .select("*")
        .eq("livestock_id", livestock_id)
        .order("amount", desc=True)
        .execute()
    )
    return jsonify(res.data)


@bids_bp.route("", methods=["POST"])
@require_auth
def place_bid(current_user=None):
    data = request.json
    if not data:
        return jsonify({"detail": "Request body required"}), 400

    livestock_id = data.get("livestock_id")
    amount = data.get("amount")

    if not livestock_id or not amount:
        return jsonify({"detail": "livestock_id and amount are required"}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"detail": "Amount must be a positive number"}), 400

    try:
        current_bids = (
            supabase.table("bids")
            .select("amount")
            .eq("livestock_id", livestock_id)
            .order("amount", desc=True)
            .limit(1)
            .execute()
        )
        if current_bids.data and amount <= current_bids.data[0]["amount"]:
            return jsonify({"detail": "Bid must be higher than the current highest bid"}), 400

        res = (
            supabase.table("bids")
            .insert({"livestock_id": livestock_id, "amount": amount, "bidder_id": current_user.id})
            .execute()
        )
        return jsonify(res.data[0]), 201
    except Exception as e:
        logger.exception("Failed to place bid for user=%s on livestock=%s", current_user.id, livestock_id)
        return jsonify({"detail": "Failed to place bid"}), 500
