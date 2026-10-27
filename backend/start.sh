#!/bin/sh
# Container entry point: bring the schema up to date, then start the API.
set -e
alembic upgrade head
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips="*"
