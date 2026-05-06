# AI Agency Deployment Guide

This repository is a single monorepo containing:

- `agency-api` (NestJS backend)
- `agency-ui` (Next.js frontend)
- OpenClaw runtime/config scripts and workspace skills

## 1. Prerequisites

- Docker + Docker Compose
- OpenClaw CLI available where you run post-deploy config (`openclaw`)
- DNS/hostnames and TLS termination for production UI/API endpoints

## 2. Required Secrets

Set these in your deployment secret store (not in git):

- `OPENCLAW_GATEWAY_TOKEN`
- `OPENROUTER_API_KEY`
- `JWT_SECRET`
- `TELEGRAM_BOT_TOKEN` (if Telegram enabled)
- `PAYSTACK_SECRET_KEY`
- `BREVO_API_KEY`

Recommended runtime setting for API-to-gateway waits:

- `OPENCLAW_GATEWAY_TIMEOUT_MS=90000` (or higher for long-running model/tool calls)

Use [agency-api/.env.example](agency-api/.env.example) as the variable contract.

## 3. Runtime Persistence (Critical)

Persist these paths in production:

- OpenClaw gateway state: `/home/node/.openclaw`
- API OpenClaw device identity: `/app/.openclaw`
- Postgres data

Without persistence, pairing and gateway runtime config will be lost on restart.

## 4. Build and Start

```bash
cd /path/to/ai-agency

docker compose up -d --build
```

Optional host port override for OpenClaw dashboard:

```bash
OPENCLAW_HOST_PORT=18790 docker compose up -d --build
```

## 5. Apply OpenClaw Runtime Configuration

After OpenClaw is running, apply runtime config (model + dashboard allowed origins):

```bash
OPENCLAW_URL=http://127.0.0.1:18789 \
OPENCLAW_DEFAULT_MODEL=openrouter/auto \
OPENCLAW_ALLOWED_ORIGINS_JSON='["https://openclaw.your-domain.com"]' \
./scripts/configure-openclaw.sh
```

Then restart OpenClaw:

```bash
docker compose restart agency-openclaw
```

## 6. Verify Skills and Model

```bash
docker compose exec -T agency-openclaw sh -lc "openclaw skills list --eligible"
docker compose logs --tail=80 agency-openclaw
```

Expected:

- Tender skills appear as `ready`
- Agent model resolves to OpenRouter-backed model

## 7. Pairing and Dashboard Access

If dashboard is token-protected, open with encoded token fragment:

```text
http://127.0.0.1:18790/#token=<URL_ENCODED_GATEWAY_TOKEN>
```

If device pairing is required:

```bash
docker compose exec -T agency-openclaw sh -lc "openclaw devices list --json"
docker compose exec -T agency-openclaw sh -lc "openclaw devices approve <requestId> --json"
```

## 8. Post-Deploy Smoke Checks

- API health responds
- UI can call API without CORS failures
- `/jobs/execute` returns OpenClaw output
- OpenClaw logs show no auth/provider errors

## 8.1 Fix Provider Auth Fallback (OpenAI Key Missing)

If OpenClaw logs show this error:

```text
FailoverError: No API key found for provider "openai"
Auth store: /home/node/.openclaw/agents/main/agent/auth-profiles.json
```

the gateway is using a persisted agent/auth profile that is not aligned with OpenRouter.

1. Confirm your runtime secrets are present in `agency-api/.env`:
	- `OPENROUTER_API_KEY=<real key>`
	- `OPENCLAW_DEFAULT_MODEL=openrouter/auto`
2. Re-apply runtime config:

```bash
OPENCLAW_URL=http://127.0.0.1:18789 \
OPENCLAW_DEFAULT_MODEL=openrouter/auto \
OPENCLAW_ALLOWED_ORIGINS_JSON='["https://openclaw.your-domain.com"]' \
./scripts/configure-openclaw.sh
```

3. Restart OpenClaw:

```bash
docker compose restart agency-openclaw
```

4. If the error persists, remove stale per-agent auth profile so the agent can use current OpenRouter settings:

```bash
docker compose exec -u root -T agency-openclaw sh -lc "rm -f /home/node/.openclaw/agents/main/agent/auth-profiles.json && chown -R node:node /home/node/.openclaw"
docker compose restart agency-openclaw
```

5. Re-test and verify logs:

```bash
docker compose logs --tail=120 agency-openclaw
```

## 8.2 Fix Host vs Container Config Drift

If `openclaw config get --json` shows paths like `/root/.openclaw` with `lastRunMode: local`, you are editing host-local OpenClaw state, not the Docker gateway runtime used by the API.

For this stack, the live gateway state must be under `/home/node/.openclaw` inside `agency-openclaw`.

Use container-scoped commands for all runtime fixes:

```bash
docker compose exec -T agency-openclaw sh -lc 'openclaw config get --json | head -n 80'
docker compose exec -T agency-openclaw sh -lc 'openclaw config set agents.defaults.model.primary "\"openrouter/auto\"" --strict-json'
docker compose exec -T agency-openclaw sh -lc 'openclaw config set gateway.controlUi.allowedOrigins "[\"https://openclaw.your-domain.com\"]" --strict-json'
docker compose restart agency-openclaw
```

Then verify the running gateway (not host-local config):

```bash
docker compose exec -T agency-openclaw sh -lc 'printenv | grep OPENROUTER_API_KEY'
docker compose logs --tail=120 agency-openclaw
```

## 8.3 If OpenAI Failover Persists After Reconfig

If logs still show `No API key found for provider "openai"`, the running agent/session state is still pinned to an OpenAI model.

Use this hard reset sequence against the container runtime state:

1. Remove stale per-agent auth and session state:

docker compose exec -u root -T agency-openclaw sh -lc 'rm -f /home/node/.openclaw/agents/main/agent/auth-profiles.json'
docker compose exec -u root -T agency-openclaw sh -lc 'rm -rf /home/node/.openclaw/sessions'
docker compose exec -u root -T agency-openclaw sh -lc 'chown -R node:node /home/node/.openclaw'

2. Re-apply OpenRouter model defaults on the container runtime:

docker compose exec -T agency-openclaw sh -lc 'openclaw config set agents.defaults.model.primary "\"openrouter/auto\"" --strict-json'

3. Restart services:

docker compose restart agency-openclaw agency-api

4. Verify in logs that requested model is no longer openai:

docker compose logs --tail=150 agency-openclaw

## 9. Rollback Strategy

- Roll back container image tags
- Restore previous persisted OpenClaw config/state volume snapshot
- Re-run `scripts/configure-openclaw.sh` for known-good model/origin settings

## 10. Monorepo Recommendation

Yes, keep this as one repo. The API, UI, OpenClaw configuration script, Docker orchestration, and workspace skills are tightly coupled and should version together for reproducible deployments.

## 11. Verified Recovery Playbook (Production)

This is the exact sequence that resolved recurring deployment failures in production.

### 11.1 Ensure API and Gateway Use the Same Runtime Env

1. Confirm `agency-api/.env` exists (do not rely on `.env.example`).
2. Ensure these values are set in `agency-api/.env`:
	- `OPENCLAW_API_URL=http://agency-openclaw:18789`
	- `OPENCLAW_GATEWAY_TOKEN=<real shared token>`
	- `OPENROUTER_API_KEY=<real key>`
	- `OPENCLAW_DEFAULT_MODEL=openrouter/auto`
	- `OPENCLAW_GATEWAY_TIMEOUT_MS=90000` (or higher for long runs)
3. Recreate services after env updates:

```bash
docker compose up -d --build --force-recreate
```

### 11.2 Approve Device Pairing (If Required)

If API returns pairing-required errors, approve pending device requests:

```bash
docker compose exec -T agency-openclaw sh -lc "openclaw devices list --json"
docker compose exec -T agency-openclaw sh -lc "openclaw devices approve <requestId> --json"
```

### 11.3 Fix OpenClaw Workspace Ownership

If OpenClaw logs show `EACCES` under `/home/node/.openclaw`:

```bash
docker compose exec -u root -T agency-openclaw sh -lc 'mkdir -p /home/node/.openclaw/workspace && touch /home/node/.openclaw/workspace/AGENTS.md && chown -R node:node /home/node/.openclaw && chmod -R u+rwX,g+rX /home/node/.openclaw'
docker compose restart agency-openclaw agency-api
```

### 11.4 Apply OpenRouter Model to the Container Runtime (Not Host-Local)

Always run config commands inside `agency-openclaw` container. If config output shows `/root/.openclaw`, you are editing host-local state, not the live gateway runtime.

Use quote-safe commands:

```bash
docker compose exec -T agency-openclaw sh -lc "openclaw config set agents.defaults.model.primary '\"openrouter/auto\"' --strict-json"
docker compose exec -T agency-openclaw sh -lc 'openclaw config set gateway.controlUi.allowedOrigins "[\"https://openclaw.your-domain.com\"]" --strict-json'
docker compose restart agency-openclaw
```

### 11.5 If OpenAI Failover Persists

If logs still show `No API key found for provider "openai"`, clear stale persisted auth/session state:

```bash
docker compose exec -u root -T agency-openclaw sh -lc 'rm -f /home/node/.openclaw/agents/main/agent/auth-profiles.json'
docker compose exec -u root -T agency-openclaw sh -lc 'rm -rf /home/node/.openclaw/sessions'
docker compose exec -u root -T agency-openclaw sh -lc 'chown -R node:node /home/node/.openclaw'
docker compose restart agency-openclaw agency-api
```

### 11.6 Verify Final Healthy State

```bash
docker compose exec -T agency-api sh -lc 'printenv | grep OPENCLAW_'
docker compose exec -T agency-openclaw sh -lc 'printenv | grep OPENCLAW_'
docker compose logs --tail=150 agency-api
docker compose logs --tail=150 agency-openclaw
```

Expected:

1. API startup log includes gateway URL, token source, and timeout.
2. No pairing/auth/provider errors in OpenClaw logs.
3. Jobs transition to `COMPLETED` with output (instead of `FAILED` with provider auth errors).

### 11.7 Security Cleanup

If tokens were ever pasted in terminal history, logs, or chat, rotate all exposed values immediately:

1. `OPENCLAW_GATEWAY_TOKEN`
2. `OPENROUTER_API_KEY`
3. Any other exposed access token/key
