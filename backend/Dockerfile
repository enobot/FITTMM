# FITTMM API. Runs database migrations, then serves on $PORT (default 8000).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN useradd --create-home --uid 10001 fittmm && chown -R fittmm /app
USER fittmm

EXPOSE 8000
CMD ["sh", "start.sh"]
