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

## 9. Rollback Strategy

- Roll back container image tags
- Restore previous persisted OpenClaw config/state volume snapshot
- Re-run `scripts/configure-openclaw.sh` for known-good model/origin settings

## 10. Monorepo Recommendation

Yes, keep this as one repo. The API, UI, OpenClaw configuration script, Docker orchestration, and workspace skills are tightly coupled and should version together for reproducible deployments.
