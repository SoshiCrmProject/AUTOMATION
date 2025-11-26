# Security Notes / セキュリティ注意点

- Amazon credentials are AES-256-GCM encrypted at rest. Encryption key `AES_SECRET_KEY` must be 64-hex and stored only in secret manager.
- JWT tokens expire (12h by default); rotate `JWT_SECRET` regularly.
- Apply API rate limiting (e.g., Express-rate-limit) in production to avoid abuse.
- Use HTTPS everywhere; secure cookies when embedding in browsers.
- Limit Playwright traffic to minimal concurrency to avoid Amazon fraud flags; monitor for unusual captchas/blocks.
- Do not log plaintext credentials. Scrub secrets from logs.
- Database access restricted by network policy / security groups. Enable TLS for Postgres if available.
- Never store Amazon passwords or AES keys client-side; keep encryption/decryption only in API/worker.
- Handle 2FA strictly: surface `AMAZON_2FA_REQUIRED` as manual-review; do not attempt bypass.
- Shopee HMAC secrets must be kept server-side; do not expose in frontend.
