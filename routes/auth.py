import logging
from flask import Blueprint, request, jsonify
from db import supabase
from middleware import require_auth, require_supabase

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.route("/register", methods=["POST"])
@require_supabase
def register():
    data = request.json
    if not data:
        return jsonify({"detail": "Request body required"}), 400

    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"detail": "Email and password are required"}), 400

    try:
        res = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "firstName": data.get("firstName"),
                    "lastName": data.get("lastName"),
                    "phone": data.get("phone"),
                }
            },
        })
        return jsonify(res.user), 201
    except Exception as e:
        logger.exception("Registration failed for email=%s", email)
        return jsonify({"detail": "Registration failed. Please try again."}), 400


@auth_bp.route("/login", methods=["POST"])
@require_supabase
def login():
    data = request.json
    if not data:
        return jsonify({"detail": "Request body required"}), 400

    try:
        res = supabase.auth.sign_in_with_password({
            "email": data.get("contact"),
            "password": data.get("password"),
        })
        return jsonify({
            "access_token": res.session.access_token,
            "token_type": "bearer",
            "user": res.user,
        }), 200
    except Exception as e:
        logger.exception("Login failed for contact=%s", data.get("contact"))
        return jsonify({"detail": "Invalid email or password"}), 401


@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_me(current_user=None):
    return jsonify({
        "id": current_user.id,
        "email": current_user.email,
        "firstName": current_user.user_metadata.get("firstName"),
        "lastName": current_user.user_metadata.get("lastName"),
        "phone": current_user.user_metadata.get("phone"),
    }), 200
