FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5004

CMD ["gunicorn", "--bind", "0.0.0.0:5004", "--worker-class", "eventlet", "--workers", "1", "--timeout", "120", "--access-logfile", "-", "app:app"]