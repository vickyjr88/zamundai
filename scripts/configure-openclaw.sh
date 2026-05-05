#!/bin/sh
set -eu

OPENCLAW_URL="${OPENCLAW_URL:-http://127.0.0.1:18789}"
OPENCLAW_DEFAULT_MODEL="${OPENCLAW_DEFAULT_MODEL:-openrouter/auto}"
OPENCLAW_ALLOWED_ORIGINS_JSON="${OPENCLAW_ALLOWED_ORIGINS_JSON:-[\"http://localhost:18789\",\"http://127.0.0.1:18789\"]}"

# Configure the gateway to use OpenRouter-backed models and allow the expected browser origins.
openclaw config set agents.defaults.model.primary "\"${OPENCLAW_DEFAULT_MODEL}\"" --strict-json --url "$OPENCLAW_URL"
openclaw config set gateway.controlUi.allowedOrigins "$OPENCLAW_ALLOWED_ORIGINS_JSON" --strict-json --url "$OPENCLAW_URL"

printf 'Configured OpenClaw at %s\n' "$OPENCLAW_URL"
printf '  model: %s\n' "$OPENCLAW_DEFAULT_MODEL"
printf '  allowedOrigins: %s\n' "$OPENCLAW_ALLOWED_ORIGINS_JSON"
