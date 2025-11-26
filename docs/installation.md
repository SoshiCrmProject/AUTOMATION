# Installation Guide / インストールガイド

## Prerequisites / 前提条件
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL and Redis (provided via docker-compose)
- Environment variables (.env) with AES secret, Shopee API keys, Amazon credentials

## Environment Variables / 環境変数
- `DATABASE_URL` – PostgreSQL URL  
- `REDIS_URL` – Redis URL  
- `JWT_SECRET` – JWT signing secret  
- `AES_SECRET_KEY` – 64-hex key for AES-256-GCM (do not store in DB)  
- `SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY`, `SHOPEE_ACCESS_TOKEN`, `SHOPEE_SHOP_ID`  
- `AMAZON_LOGIN_EMAIL`, `AMAZON_LOGIN_PASSWORD` (used for bootstrapping only; stored encrypted)
- `AMAZON_SHIPPING_LABEL` – label text to match Amazon address book entry (default: Shopee Warehouse)
- `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` – bootstrap admin account
- `ALERT_WEBHOOK_URL` – optional webhook for alerts

## Steps / 手順
1. Install deps / 依存関係:
   ```bash
   npm install
   ```
2. Copy env / 環境設定:
   ```bash
   cp .env.example .env
   ```
   Fill values. Generate AES key: `openssl rand -hex 32`.
3. Start infra / インフラ起動:
   ```bash
   docker-compose up -d postgres redis
   ```
4. Migrate DB / DBマイグレーション:
   ```bash
   cd apps/api
   npx prisma migrate dev --name init
   ```
5. Run services / サービス起動:
   ```bash
   npm run dev:api
   npm run dev:worker
   npm run dev:web
   ```
   API: http://localhost:4000, Web: http://localhost:3000.
6. Bootstrap admin / 管理者作成:
   - `POST /auth/signup` or set `SUPERADMIN_*` then login at `/login`.
   - Register Amazon credentials via `POST /credentials/amazon` (password encrypted with AES key).

## System Flow Diagram / システムフロー
1. Worker polls Shopee via signed OpenAPI v2 → new orders stored in DB.  
2. Worker evaluates rules (profit, shipping days, points, domestic shipping, shop selection, review band).  
3. Eligible orders trigger Playwright Amazon purchase; results stored to AmazonOrder.  
4. Failures recorded in ErrorItem and downloadable as CSV/XLSX.  
5. Admin UI manages settings, activation toggle, mappings, error file, manual retries.
