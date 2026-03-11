import logging
from flask import Blueprint, request, jsonify
from db import supabase
from middleware import require_auth, require_supabase

logger = logging.getLogger(__name__)

listings_bp = Blueprint("listings", __name__, url_prefix="/livestock")

MAX_TITLE_LEN = 200
MAX_DESCRIPTION_LEN = 2000


@listings_bp.route("", methods=["GET"])
@require_supabase
def get_listings():
    category = request.args.get("category")
    query = supabase.table("livestock_items").select("*")

    if category:
        query = query.eq("category", category)

    res = query.execute()
    return jsonify(res.data)


@listings_bp.route("/<int:item_id>", methods=["GET"])
@require_supabase
def get_listing(item_id):
    res = (
        supabase.table("livestock_items")
        .select("*, bids(*)")
        .eq("id", item_id)
        .single()
        .execute()
    )
    return jsonify(res.data)


@listings_bp.route("", methods=["POST"])
@require_auth
def create_listing(current_user=None):
    data = request.json
    if not data:
        return jsonify({"detail": "Request body required"}), 400

    title = (data.get("title") or "").strip()
    if not title or len(title) > MAX_TITLE_LEN:
        return jsonify({"detail": f"Title is required (max {MAX_TITLE_LEN} chars)"}), 400

    description = (data.get("description") or "").strip()
    if len(description) > MAX_DESCRIPTION_LEN:
        return jsonify({"detail": f"Description too long (max {MAX_DESCRIPTION_LEN} chars)"}), 400

    price = data.get("startingPrice")
    try:
        price = float(price)
        if price <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"detail": "Starting price must be a positive number"}), 400

    allowed_categories = {"cattle", "goats", "sheep", "pigs", "chickens", "other"}
    category = data.get("category", "").lower()
    if category not in allowed_categories:
        return jsonify({"detail": f"Category must be one of: {', '.join(sorted(allowed_categories))}"}), 400

    insert_data = {
        "title": title,
        "description": description,
        "breed": (data.get("breed") or "").strip(),
        "age": (data.get("age") or "").strip(),
        "weight": (data.get("weight") or "").strip(),
        "location": (data.get("location") or "").strip(),
        "category": category,
        "startingPrice": price,
        "imageUrl": (data.get("imageUrl") or "").strip(),
        "healthStatus": data.get("healthStatus", "pending"),
        "auctionEndDate": data.get("auctionEndDate"),
        "seller_id": current_user.id,
    }

    try:
        res = supabase.table("livestock_items").insert(insert_data).execute()
        return jsonify(res.data[0]), 201
    except Exception as e:
        logger.exception("Failed to create listing for user=%s", current_user.id)
        return jsonify({"detail": "Failed to create listing"}), 500
