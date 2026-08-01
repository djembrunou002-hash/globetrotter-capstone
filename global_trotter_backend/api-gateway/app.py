import requests
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

from config import Config
from routing import SERVICE_URLS, resolve

HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-encoding",
    "content-length",
    "host",
}

METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]


def _public_base_url():
    if Config.PUBLIC_BASE_URL:
        return Config.PUBLIC_BASE_URL.rstrip("/")
    return request.host_url.rstrip("/")


def _forward_headers():
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP}
    headers["X-Forwarded-Host"] = request.host
    headers["X-Forwarded-Proto"] = request.scheme
    headers["X-Gateway-Public-Url"] = _public_base_url()
    return headers


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/*": {"origins": Config.ALLOWED_ORIGINS}}, supports_credentials=True)

    @app.route("/health", methods=["GET"])
    def health():
        downstream = {}
        for name, base_url in SERVICE_URLS.items():
            try:
                response = requests.get(f"{base_url}/health", timeout=3)
                downstream[name] = "ok" if response.status_code == 200 else f"http {response.status_code}"
            except requests.RequestException:
                downstream[name] = "unreachable"

        healthy = all(status == "ok" for status in downstream.values())
        return jsonify({
            "service": Config.SERVICE_NAME,
            "status": "ok" if healthy else "degraded",
            "services": downstream,
        }), 200 if healthy else 503

    @app.route("/", defaults={"path": ""}, methods=METHODS)
    @app.route("/<path:path>", methods=METHODS)
    def gateway(path):
        if request.method == "OPTIONS":
            return Response(status=204)

        service, base_url = resolve(path)
        if not service:
            return jsonify({"error": f"no route for /{path}"}), 404

        url = f"{base_url.rstrip('/')}/{path}"

        try:
            upstream = requests.request(
                method=request.method,
                url=url,
                headers=_forward_headers(),
                params=request.args,
                data=request.get_data(),
                timeout=Config.PROXY_TIMEOUT,
                stream=True,
                allow_redirects=False,
            )
        except requests.Timeout:
            app.logger.error("timeout calling %s", url)
            return jsonify({"error": f"{service} timed out"}), 504
        except requests.RequestException as err:
            app.logger.error("failed calling %s: %s", url, err)
            return jsonify({"error": f"{service} is unavailable"}), 503

        response_headers = [
            (key, value)
            for key, value in upstream.raw.headers.items()
            if key.lower() not in HOP_BY_HOP
        ]

        return Response(
            upstream.iter_content(chunk_size=8192),
            status=upstream.status_code,
            headers=response_headers,
        )

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=Config.PORT)