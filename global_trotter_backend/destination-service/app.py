from flask import Flask, jsonify
from flask_jwt_extended import JWTManager

from config import Config
from routes.admin import admin_bp
from routes.ai import ai_bp
from routes.comments import comments_bp
from routes.destinations import destinations_bp
from routes.internal import internal_bp
from routes.my_destinations import my_destinations_bp
from routes.notifications import notifications_bp
from routes.places import places_bp
from routes.recommendations import recommendations_bp
from routes.uploads import uploads_bp
from services.service_client import ServiceUnavailable


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    JWTManager(app)

    app.register_blueprint(admin_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(comments_bp)
    app.register_blueprint(destinations_bp)
    app.register_blueprint(my_destinations_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(places_bp)
    app.register_blueprint(recommendations_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(internal_bp)

    @app.errorhandler(ServiceUnavailable)
    def handle_service_unavailable(err):
        app.logger.error("dependency unavailable: %s", err)
        return jsonify({"error": "a dependent service is unavailable, please try again"}), 503

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"service": Config.SERVICE_NAME, "status": "ok"}), 200

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=Config.PORT)