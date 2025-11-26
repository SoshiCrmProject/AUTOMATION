# Shopee → Amazon Auto-Purchase & Shipping (EN/JA)

## Overview / 概要

This project delivers a production-ready, bilingual (English/Japanese) system that monitors Shopee orders and automatically purchases the corresponding items on Amazon using headless browser automation (Playwright). It applies profit and shipping-day rules, records errors, and exposes an admin UI to configure conditions and download non-shipped/error items.

本プロジェクトは、Shopeeの注文を監視し、Playwrightによるヘッドレスブラウザ自動化で対応するAmazon商品を自動購入するシステムです。利益・配送日数などの条件を適用し、エラーを記録、設定用の管理UIと未出荷／エラー商品のダウンロード機能を提供します。

## Architecture / アーキテクチャ

- **Frontend (Next.js + next-i18next)**: Bilingual admin UI for settings, shop selection, error file download.
- **Backend API (Express + Prisma)**: Auth, settings, shops, error export, profit preview. JWT-based auth.
- **Worker (BullMQ + Playwright)**: Poll Shopee orders, scrape Amazon, apply rules, place orders, log errors.
- **Database (PostgreSQL + Prisma schema)**: Users, Shops, AutoShippingSetting, ShopSelections, ShopeeOrders, AmazonOrders, ErrorItems, AmazonCredential.
- **Queue (Redis + BullMQ)**: `poll-shopee`, `process-order`, `toggle-auto-shipping`.
- **Automation (Playwright)**: Amazon login, price/stock/shipping scraping, add-to-cart, checkout, capture order id.
- **Security**: AES-256-GCM for Amazon password at rest (`AES_SECRET_KEY`), JWT auth, CSV export for diagnostics.
- **Admin/Ops**: role-based access (user/admin/superadmin via `SUPERADMIN_EMAIL/PASSWORD`), audit logs, queue health, manual poll, Amazon test-scrape, processed/error CSV downloads.

## Key Documentation References / 主要ドキュメント

- Shopee OpenAPI v2: `get_order_list`, `get_order_detail` (https://open.shopee.com/) – used for polling new orders and fetching details.
- Amazon web flows (no API): standard sign-in, add-to-cart, checkout via Playwright selectors.
- Playwright docs: headless browser automation best practices (https://playwright.dev/).
- Next.js i18n & next-i18next: bilingual routing and translation JSONs (https://nextjs.org/docs/pages/building-your-application/routing/internationalization, https://github.com/i18next/next-i18next).
- BullMQ: queue and repeatable jobs (https://docs.bullmq.io/).
- Prisma: schema and DB migrations (https://www.prisma.io/docs/).

## Prerequisites / 前提条件

- Node.js 20+
- Docker & Docker Compose (for Postgres, Redis)
- Environment variables configured (see `.env.example`)

## Setup (Dev) / セットアップ（開発）

1. Install deps / 依存関係インストール:
   ```bash
   npm install
   ```
2. Copy env / 環境変数設定:
   ```bash
   cp .env.example .env
   ```
   Fill `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `SHOPEE_*`, `AMAZON_*`.
3. Start DB & Redis / DBとRedis起動:
   ```bash
   docker-compose up -d postgres redis
   ```
4. Generate Prisma client & migrate / Prisma生成とマイグレーション:
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
   Frontend: http://localhost:3000, API: http://localhost:4000.

## Deployment / デプロイ

- Build Docker images: `docker-compose build`
- Run all services: `docker-compose up -d`
- Set env: `AES_SECRET_KEY`, `JWT_SECRET`, `SUPERADMIN_EMAIL/PASSWORD`, `SHOPEE_*`, `ALERT_WEBHOOK_URL` (optional), `AMAZON_SHIPPING_LABEL`.
- Use secrets management (e.g., AWS SSM/Secrets Manager) for credentials.
- Configure HTTPS termination (e.g., behind Nginx/ALB).

## Security Notes / セキュリティ注意

- Store Shopee and Amazon credentials in env/secret manager; encrypt at rest.
- Amazon UI may change; monitor errors and rate-limit scraping. Headless automation can trigger account reviews.
- Implement 2FA handling out-of-band (manual token entry) if required by Amazon.

## Bilingual UI Copy (Requirement 8) / UI文言（要件8）

- Global prerequisite / 全体の前提:
  - EN: Before activating this feature, make sure to update the “Sales/Order Export” function after enabling “Product Management.” This is required for the feature to work correctly.
  - JA: 本機能を有効化する前に、「商品管理」機能を有効にした後で「売上・注文エクスポート」機能を更新してください。これが正しく動作する前提条件です。
- ① Auto-ordering & shipping / 自動注文と出荷:
  - EN: When an order is placed in your Shopee shop, this feature will add the corresponding Amazon product to the cart and ship it to your configured address. Only products meeting your Expected Profit Amount and Shipping Duration will be auto-shipped. Due to Amazon specification changes, unexpected issues may occur. Use at your own responsibility.
  - JA: Shopeeショップで注文が入ると、対応するAmazon商品をカートに入れ、設定済みの住所へ出荷します。「想定利益額」と「配送日数」の条件を満たす商品のみ自動出荷します。Amazon仕様変更により予期しない不具合が発生する可能性があります。自己責任でご利用ください。
- ② Error / non-shipped file / エラー・未出荷ファイル:
  - EN: Click “Open” to view a file listing items that were not automatically shipped and their details. Items filtered out by conditions are included as error items. Out-of-stock or unpurchasable items are also treated as errors.
  - JA: 「開く」をクリックすると、自動出荷されなかった商品の一覧と詳細を確認できます。条件で除外された商品もエラー項目として含まれます。Amazonで在庫切れや購入不可（中古のみ等）の場合もエラー扱いとなります。
- ③ Profit incl. Amazon Points / 利益計算（ポイント含む）:
  - EN: During profit calculation, you can choose whether to include Amazon Points earned from the transaction.
  - JA: 利益計算時に、その取引で獲得するAmazonポイントを含めるか選択できます。
- ④ Profit incl. domestic shipping / 利益計算（国内送料含む）:
  - EN: You can choose whether to include domestic shipping costs (from the domestic carrier to the Shopee warehouse).
  - JA: 国内配送会社からShopee倉庫までの送料を含めるかを選択できます。
- ⑤ Max shipping days / 最大配送日数:
  - EN: Enter the maximum number of days within which the Amazon product must ship to be eligible.
  - JA: Amazon商品の出荷がこの日数以内であることを条件として入力してください。
- ⑥ Minimum expected profit / 最低想定利益:
  - EN: Enter the minimum expected profit required. If negative profit is acceptable, prefix with a minus sign “-” (e.g., -2000).
  - JA: 必要な最低想定利益額を入力してください。赤字を許容する場合は半角の「-」を先頭に付けて入力します（例: -2000）。
- ⑦ Shop selection / ショップ選択:
  - EN: Orders from the shops you check are treated as eligible.
  - JA: チェックしたショップの注文が対象となります。
- ⑧ Activation / 有効化:
  - EN: After setting the conditions at the top of the auto-shipping page, click here to activate auto-shipping. The system shows whether it is ON/OFF and starts/stops the worker accordingly.
  - JA: 自動出荷ページ上部で条件設定を完了後、ここをクリックして自動出荷を有効化します。ON/OFFが明示され、ワーカーが開始/停止します。

## API Endpoints / API一覧

- `POST /auth/signup` – create admin user.
- `POST /auth/login` – JWT login.
- `GET /shops` – list shops for user.
- `GET /settings` / `POST /settings` – read/update auto-shipping config, shop selections, activation.
- `POST /profit/preview` – compute expected profit.
- `GET /orders/errors` – list recent error items.
- `GET /orders/errors/export` – download CSV of error/non-shipped items.
- `GET /orders/processed/export` – download CSV of processed Amazon orders.
- `POST /orders/retry/:id` – enqueue manual re-processing.
- `POST /orders/poll-now` – manual Shopee poll.
- `GET /orders/recent` – recent Shopee orders with decisions.
- `GET /ops/queue` – queue health (admin/superadmin).
- `GET /ops/status` – connector/status summary.
- `POST /ops/amazon-test` – enqueue Amazon test scrape (dry-run check).
- `GET /ops/metrics` – basic Prometheus-style metrics (admin/superadmin).
- `GET /admin/users` – user list (admin/superadmin).
- `POST /admin/users/:id/toggle` – activate/deactivate user.
- `POST /admin/users/:id/reset-password` – reset password with strength validation.
- `GET /admin/audit` – audit log list.
- `GET/POST /credentials/amazon` – manage encrypted Amazon credentials.

## Background Jobs / バックグラウンドジョブ

- `poll-shopee` (repeatable): fetch new Shopee orders, persist, enqueue processing.
- `process-order`: scrape Amazon, apply profit/shipping rules, purchase via Playwright, log errors.
- `toggle-auto-shipping`: start/stop repeatable polling job when user toggles ON/OFF.

## Testing Targets / テスト方針

- Unit: `calculateProfit`, `calculateShippingDays`, `shippingDaysWithinLimit` (run `npm test`).
- Integration (mocked): Shopee order ingestion, queue pipeline, Amazon scraping module mocked to avoid live traffic.

## Risk & Limitations / リスクと制限

- Amazon UI changes can break selectors; monitor error logs and adjust.
- Headless automation may trigger account verification or 2FA; handle 2FA manually.
- Respect Shopee API rate limits; add backoff/retry (BullMQ + p-retry).
