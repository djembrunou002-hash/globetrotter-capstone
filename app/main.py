"""
app/main.py

Flask application entry point.

Run locally:
    python app/main.py

Or via Docker / docker-compose (see project root).
"""
import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # debug=True is convenient during development; disable in production.
    app.run(host="0.0.0.0", port=port, debug=True)
