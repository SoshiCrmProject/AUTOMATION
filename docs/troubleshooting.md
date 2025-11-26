# Troubleshooting / トラブルシューティング

## Amazon 2FA / 2段階認証
- Symptom: AutomationError `AMAZON_2FA`.
- Action: Manually complete 2FA in browser; consider switching to trusted device. System will keep failing until resolved.
  - Worker will move orders to MANUAL_REVIEW; retry after 2FA is cleared.

## Address Not Found / 配送先が選択できない
- Symptom: AutomationError `ADDRESS_NOT_FOUND`.
- Action: Ensure Amazon account has address label matching configured `shippingAddressLabel` (default “Shopee Warehouse”).

## Shopee HMAC Signature Error / HMAC署名エラー
- Symptom: Shopee API returns auth/signature error.
- Action: Verify `SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY`, `SHOPEE_ACCESS_TOKEN`, and shop_id; ensure timestamp is correct (server clock drift).
  - Confirm `ShopeeCredential` stored for the shop and worker has `AES_SECRET_KEY`.

## Redis Queue Stuck / キューが詰まる
- Symptom: Repeatable jobs not running or backlog grows.
- Action: Check Redis connectivity; restart worker. Inspect repeatable jobs via `queue.getRepeatableJobs()`. Clear stuck jobs if necessary.
  - Ensure `toggle-auto-shipping` job created repeatable `poll-shop:<shopId>` entries when enabling shops.

## Playwright Timeouts / Playwrightのタイムアウト
- Symptom: Frequent `AMAZON_PURCHASE_FAILED`.
- Action: Increase timeouts, validate selectors, watch screenshots under `apps/worker/tmp/`.
  - Check for captchas/2FA; Amazon may throttle. Reduce concurrency or switch IP.

## Profit Miscalculation / 利益計算の差異
- Symptom: Eligible items unexpectedly rejected.
- Action: Verify domestic shipping and Amazon Points toggles in settings; use `/profit/preview` to validate numbers.
  - Confirm `reviewBandPercent` not holding orders in MANUAL_REVIEW when near threshold.
