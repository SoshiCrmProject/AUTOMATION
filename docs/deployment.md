# Deployment Guide / デプロイガイド

## Docker Compose (Production) / 本番用Docker Compose
- Services: postgres, redis, api, worker, web, nginx (reverse proxy + TLS).
- Build: `docker-compose build`
- Run: `docker-compose up -d`
- Env you must set: `AES_SECRET_KEY`, `JWT_SECRET`, `SUPERADMIN_EMAIL/PASSWORD`, `SHOPEE_*`, `ALERT_WEBHOOK_URL` (optional), `AMAZON_SHIPPING_LABEL`.

## Secrets Management / シークレット管理
- Store `AES_SECRET_KEY`, `JWT_SECRET`, Shopee/Amazon credentials in a secret manager (AWS SSM/Secrets Manager, GCP Secret Manager, Vault).
- Inject via env at container runtime; never bake into images.

## Domain + TLS / ドメインとTLS
- Terminate TLS at nginx or cloud LB.
- Example nginx: see `infra/nginx.conf` snippet (reverse proxy to web:3000, api:4000).

## Monitoring & Logging / 監視とログ
- All services log to stdout; forward to ELK/CloudWatch/Stackdriver.
- Health checks: API `/health` (add), worker queue stats (`/ops/queue`), Postgres liveness, Redis liveness.
- Alert on: queue backlog, Playwright failure codes (AMAZON_2FA_REQUIRED, ADDRESS_NOT_FOUND), Shopee signature errors. Use `ALERT_WEBHOOK_URL` for quick hooks.

## Playwright Selector Maintenance / セレクタ保守
- Amazon UI may change; watch error logs and screenshots (`apps/worker/tmp/*.png`).
- Update selectors in `apps/worker/src/amazonAutomation.ts` when failure rates spike. Never bypass 2FA; route to manual review.

## Scaling / スケーリング
- API horizontal scale behind load balancer (stateless JWT).
- Worker horizontal scale with shared Redis; tune `concurrency` and BullMQ backoff/attempts.
- Use managed Postgres/Redis in production.

## Backups / バックアップ
- Enable Postgres automated backups / PITR.
- Persist Redis only if needed; otherwise ephemeral.
- Store error CSV/XLSX exports in object storage if required.
