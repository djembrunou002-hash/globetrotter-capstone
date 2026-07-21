from flask import Flask
from flask_jwt_extended import JWTManager

from config import Config
from routes.auth import auth_bp
from routes.destinations import destinations_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    JWTManager(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(destinations_bp)



    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=5000)