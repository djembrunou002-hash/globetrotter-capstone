from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from config import Config
from routes.auth import auth_bp
from routes.destinations import destinations_bp
from routes.recommendations import recommendations_bp
from routes.itineraries import itineraries_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/*": {"origins": Config.ALLOWED_ORIGINS}})
    JWTManager(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(destinations_bp)
    app.register_blueprint(recommendations_bp)
    app.register_blueprint(itineraries_bp)



    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=5000)