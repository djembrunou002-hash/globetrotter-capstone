from flask import Blueprint, current_app, jsonify, request

from services.geoapify import get_route, nearby_places, search_places

places_bp = Blueprint("places", __name__)


@places_bp.route("/places/search", methods=["GET"])
def search():
    text = request.args.get("text", "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    limit = request.args.get("limit", default=5, type=int)

    try:
        results = search_places(text, lat=lat, lon=lon, limit=limit)
    except RuntimeError as err:
        return jsonify({"error": str(err)}), 503
    except Exception:
        return jsonify({"error": "search failed"}), 502

    return jsonify({"results": results}), 200


@places_bp.route("/places/nearby", methods=["GET"])
def nearby():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng are required"}), 400

    radius = request.args.get("radius", default=1200, type=int)
    limit = request.args.get("limit", default=20, type=int)
    categories_param = request.args.get("categories")
    categories = categories_param.split(",") if categories_param else None

    try:
        results = nearby_places(lat, lng, radius=radius, categories=categories, limit=limit)
    except RuntimeError as err:
        return jsonify({"error": str(err)}), 503
    except Exception:
        return jsonify({"error": "nearby search failed"}), 502

    return jsonify({"results": results}), 200


@places_bp.route("/places/route", methods=["GET"])
def route():
    points_param = request.args.get("points", "")
    mode = request.args.get("mode", default="drive")

    waypoints = []
    for pair in points_param.split("|"):
        if not pair:
            continue
        parts = pair.split(",")
        if len(parts) != 2:
            return jsonify({"error": "invalid points format"}), 400
        try:
            waypoints.append((float(parts[0]), float(parts[1])))
        except ValueError:
            return jsonify({"error": "invalid points format"}), 400

    if len(waypoints) < 2:
        return jsonify({"error": "at least 2 points are required"}), 400

    try:
        geojson = get_route(waypoints, mode=mode)
    except RuntimeError as err:
        current_app.logger.warning("routing unavailable: %s", err)
        return jsonify({"error": str(err)}), 503
    except Exception as err:
        current_app.logger.error("routing failed: %s", err)
        return jsonify({"error": "routing failed"}), 502

    return jsonify(geojson), 200