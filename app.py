import logging
import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# Configure structured logging
log_level = logging.DEBUG if os.environ.get("DEBUG", "false").lower() == "true" else logging.INFO
logging.basicConfig(
    level=log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = Flask(__name__)

# CORS — only allow configured origins (falls back to localhost for dev)
allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
).split(",")
CORS(app, origins=[o.strip() for o in allowed_origins])


@app.route("/")
def index():
    return jsonify({
        "message": "ZimLivestock Backend is running",
        "endpoints": ["/health", "/auth", "/livestock", "/bids", "/payments"],
    })


@app.route("/health")
def health():
    from db import supabase
    return jsonify({
        "status": "ok",
        "framework": "flask",
        "supabase_connected": supabase is not None,
    })


# Register blueprints
from routes.auth import auth_bp
from routes.listings import listings_bp
from routes.bids import bids_bp
from routes.payments import payments_bp

app.register_blueprint(auth_bp)
app.register_blueprint(listings_bp)
app.register_blueprint(bids_bp)
app.register_blueprint(payments_bp)

if __name__ == "__main__":
    debug = os.environ.get("DEBUG", "false").lower() == "true"
    port = int(os.environ.get("PORT", 8000))
    app.run(debug=debug, port=port)
