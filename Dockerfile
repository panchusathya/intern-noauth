###############################################################################
# 1. Build stage – create a self‑contained virtual‑env with your Python deps  #
###############################################################################
FROM python:3.10.14 AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

# Create an isolated venv and install Python requirements
RUN python -m venv .venv
COPY requirements.txt .
RUN .venv/bin/pip install --upgrade pip && \
    .venv/bin/pip install -r requirements.txt


###############################################################################
# 2. Runtime stage – slim image + system packages we actually need            #
###############################################################################
FROM python:3.10.14-slim

WORKDIR /app

# ---------------------------------------------------------------------------
# System packages:
#   • Chromium / Playwright runtime libs
#   • LibreOffice headless stack (core + Impress filters + UNO bridge + unoconv)
#   • Roboto fonts (metapackage already contains the Condensed faces)
# ---------------------------------------------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        # ── Playwright / Chromium dependencies ───────────────────────────────
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
        libdrm2 libdbus-1-3 libxkbcommon0 libatspi2.0-0 libx11-6 \
        libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 \
        libgbm1 libpango-1.0-0 libcairo2 libasound2 \
        # ── LibreOffice headless converter stack ────────────────────────────
        libreoffice-core libreoffice-impress libreoffice-draw \
        python3-uno unoconv \
        # ── Fonts (Roboto + fallbacks) ──────────────────────────────────────
        fonts-roboto fonts-dejavu-core \
        # ── Supercronic for scheduled tasks ─────────────────────────────────
        curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install supercronic for scheduled tasks
RUN curl -fsSLO "https://github.com/aptible/supercronic/releases/download/v0.2.29/supercronic-linux-amd64" \
    && echo "cd48d45c4b10f3f0bfdd3a57d054cd05ac96812b  supercronic-linux-amd64" | sha1sum -c - \
    && chmod +x supercronic-linux-amd64 \
    && mv supercronic-linux-amd64 /usr/local/bin/supercronic

# LibreOffice needs a writable HOME even in headless mode
ENV HOME=/tmp

# ---------------------------------------------------------------------------
# Bring in the virtual‑env and application code from the builder stage
# ---------------------------------------------------------------------------
COPY --from=builder /app/.venv /app/.venv
COPY . .

# Make sure crontab file has correct permissions
RUN chmod 0644 crontab

ENV PATH="/app/.venv/bin:${PATH}"

# Install the Chromium browser that Playwright drives
RUN python -m playwright install chromium

EXPOSE 8080

CMD ["/app/.venv/bin/gunicorn", "-k", "gevent", "-w", "1", "--threads", "4", "--timeout", "500", "-b", "0.0.0.0:8080", "app:app"]
