**Production Readiness & Runbook**

- **Purpose**: Steps to deploy, migrate, and operate the Shopee→Amazon automation platform in production.

Prerequisites
- PostgreSQL (managed or self-hosted) reachable via `DATABASE_URL`.
- Redis reachable via `REDIS_URL`.
- Secrets: `JWT_SECRET`, `AES_SECRET_KEY`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `HEALTH_TOKEN`, optional `ALERT_WEBHOOK_URL`.
- Node.js >= 18.
- Docker (optional) for containerized deployment.

Important environment variables
- `DATABASE_URL` — Postgres connection string.
- `REDIS_URL` — Redis connection string.
- `JWT_SECRET` — JWT signing secret.
- `AES_SECRET_KEY` — AES-256-GCM key used to encrypt Amazon passwords.
- `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` — initial bootstrap admin credentials.
- `AMAZON_SHIPPING_LABEL` — optional global fallback shipping label.
- `ALERT_WEBHOOK_URL` — optional webhook for notifications.

Deployment & migration (recommended)
1. Ensure the database is backed up.
2. Apply Prisma migrations (or run the SQL migration file included):

   # apply the SQL migration directly (example)
   psql "$DATABASE_URL" -f apps/api/prisma/migrations/20240214100000_shipping_profiles/migration.sql

   # or use Prisma migrate (preferred if you manage migrations via Prisma):
   cd apps/api
   npx prisma migrate deploy --preview-feature
   npx prisma generate

3. Install dependencies & build
   ```bash
   npm ci
   npm run build --workspace=apps/api
   npm run build --workspace=apps/worker
   npm run build --workspace=apps/web
   ```

4. Start services (example using systemd, Docker or process manager):
   - API: `node dist/index.js` (ensure `NODE_ENV=production`)
   - Worker: start Node worker process (or container) with production env
   - Web: serve Next.js via Vercel, or run `next start` after building

5. Verify
   - Health endpoint: `GET /health` should return `status: ok`.
   - Log in with `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` to verify admin bootstrapping.
   - Visit Settings → Credential health, run checks, and ensure Shopee/Amazon credentials validate.

Secrets & rotation
- Store `AES_SECRET_KEY`, `JWT_SECRET` in a secrets vault (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault) and avoid plaintext in repos.
- Rotate AES key: plan a re-encryption job if you must rotate the AES key; rotate JWT secret with coordinated session invalidation.

Monitoring & alerting
- Ensure the worker process logs to a central log (ELK/Datadog) and capture `AutomationError` screenshots and stack traces.
- Configure webhook notification channel in Settings to get critical failures.

Rollbacks
- Rollback DB schema changes only if you have a deterministic downgrade migration; otherwise restore DB from backup and redeploy previous application image.

Testing & CI
- This repository includes a GitHub Actions workflow at `.github/workflows/ci.yml` that runs Jest tests and lint.
- Integration tests that run against a real DB should run in an isolated environment using Docker Compose (not included). Consider adding a `docker-compose.test.yml` with Postgres + Redis for full E2E.

Operational checklist
- Ensure `AES_SECRET_KEY` is set and accessible to both API and worker.
- Save Amazon credentials via the Settings UI and verify `Credential health` checks.
- Create shipping profiles in Settings if using default address automation.
- Start worker; monitor its logs for `process-manual-order` and `process-order` jobs.

Contact
- For production incidents, collect worker logs, automation screenshots (tmp/*.png in worker), and DB audit logs (`AuditLog`) and escalate to platform maintainers.

*** End of runbook
