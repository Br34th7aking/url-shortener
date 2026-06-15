# syntax=docker/dockerfile:1

# ---------- builder: install deps into an isolated venv ----------
FROM python:3.14-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# ---------- final: slim runtime, non-root ----------
FROM python:3.14-slim AS final

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Run as an unprivileged user, never root.
RUN addgroup --system app && adduser --system --ingroup app app

# Copy the prebuilt venv from the builder, then the app code.
COPY --from=builder /opt/venv /opt/venv
COPY . .

USER app

EXPOSE 8000

# Production default. docker-compose overrides this for local dev (runserver).
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
