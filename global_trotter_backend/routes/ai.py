from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from services.ai_assistant import get_ai_destination_suggestions

ai_bp = Blueprint("ai", __name__)


@ai_bp.route("/ai/recommend", methods=["POST"])
@jwt_required()
def ai_recommend():
    body = request.get_json(silent=True) or {}
    query = (body.get("query") or "").strip()

    if not query:
        return jsonify({"error": "query is required"}), 400

    try:
        result = get_ai_destination_suggestions(query)
    except RuntimeError as err:
        return jsonify({"error": str(err)}), 503
    except Exception:
        return jsonify({"error": "AI request failed, please try again"}), 502

    return jsonify(result), 200