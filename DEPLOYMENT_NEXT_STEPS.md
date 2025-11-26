# 🚀 Deployment Next Steps

**Status**: All fixes committed ✅  
**Commit**: bf2bd62  
**Ready for**: Production deployment

---

## ✅ Completed

- [x] All 15 critical/high/medium issues fixed
- [x] API build successful
- [x] Worker build successful
- [x] Frontend build successful
- [x] All changes committed to git
- [x] Comprehensive documentation created

---

## 📋 Deployment Checklist

### 1. Database Migration (REQUIRED)

The schema changes need to be applied to production database:

```bash
cd apps/api

# Connect to production database
# Set DATABASE_URL in .env to production Supabase

# Apply migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

**Schema Changes**:
- Added `lastShopeePolledAt DateTime?` to `AutoShippingSetting`
- Added 4 composite indexes to `ShopeeOrder` table

---

### 2. Push to GitHub

```bash
git push origin main
```

This will trigger automatic Vercel deployment for:
- Frontend (automation-web-psi.vercel.app)
- Backend API (automation-api-tau.vercel.app)

---

### 3. Environment Variables (Vercel)

Ensure these are set in Vercel dashboard:

#### Frontend (automation-web-psi)
```env
NEXT_PUBLIC_API_URL=https://automation-api-tau.vercel.app
NEXT_PUBLIC_MOCK_API=0
```

#### Backend (automation-api-tau)
```env
DATABASE_URL=postgresql://...supabase.com/postgres
REDIS_URL=redis://...upstash.io
JWT_SECRET=your-secret-key
AES_KEY=your-32-byte-key
SENDGRID_API_KEY=SG.xxx (optional)
```

---

### 4. Worker Deployment

The worker needs to run as a long-lived process (not serverless).

**Option A: Docker Compose**
```bash
docker-compose up -d worker
```

**Option B: PM2**
```bash
cd apps/worker
npm run build
pm2 start dist/index.js --name automation-worker
pm2 save
```

**Option C: Kubernetes** (see `docs/deployment.md`)

---

### 5. Post-Deployment Verification

#### Test Settings Endpoint
```bash
# Get JWT token by logging in
TOKEN="your-jwt-token"

# Test settings endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://automation-api-tau.vercel.app/settings

# Expected response (single object):
{
  "includeAmazonPoints": true,
  "includeDomesticShipping": false,
  "maxShippingDays": 7,
  "minExpectedProfit": 300,
  "shopIds": [1, 2, 3],
  "isActive": true,
  "isDryRun": false,
  "reviewBandPercent": 20
}
```

#### Test Settings Page
1. Go to https://automation-web-psi.vercel.app/settings
2. Should load without "Application error" message
3. Should display settings form with values from API

#### Test Shopee Integration
1. Configure Shopee credentials in settings
2. Enable auto-shipping
3. Check worker logs:
```bash
# Docker
docker-compose logs -f worker

# PM2
pm2 logs automation-worker
```
4. Verify:
   - No "shop_id missing" errors
   - Rate limiting working (max 1 req/sec)
   - Order polling successful
   - lastShopeePolledAt updated in database

#### Test Amazon Integration
1. Configure Amazon credentials
2. Create test order in Shopee
3. Monitor worker logs for:
   - Cart clearing before purchase
   - Address exact matching
   - Order confirmation verification
   - Session reuse messages

---

### 6. Monitoring Setup

#### Worker Health Check
Add to monitoring (e.g., UptimeRobot, Better Uptime):
```
URL: http://your-worker-host:3003/health
Method: GET
Expected: 200 OK
```

#### Database Indexes Verification
```sql
-- Check if indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'ShopeeOrder';

-- Should show:
-- ShopeeOrder_shopId_shopeeOrderSn_idx
-- ShopeeOrder_shopId_processingStatus_idx
-- ShopeeOrder_shopId_shopeeStatus_idx
-- ShopeeOrder_shopId_createdAt_idx
-- ShopeeOrder_processingStatus_processingMode_idx
```

#### Error Monitoring
Monitor these log patterns:
- `Shopee get_order_list failed` - API issues
- `Shop ${shopId} missing credentials` - Config issues
- `Address not found` - Amazon automation issues
- `Order confirmation not detected` - Purchase failures

---

### 7. Rollback Plan

If issues occur after deployment:

```bash
# Revert to previous commit
git revert bf2bd62

# Or reset to specific commit
git reset --hard <previous-commit-hash>

# Push
git push origin main --force
```

**Database Rollback** (if needed):
```sql
-- Remove new field
ALTER TABLE "AutoShippingSetting" DROP COLUMN "lastShopeePolledAt";

-- Remove indexes
DROP INDEX "ShopeeOrder_shopId_processingStatus_idx";
DROP INDEX "ShopeeOrder_shopId_shopeeStatus_idx";
DROP INDEX "ShopeeOrder_shopId_createdAt_idx";
DROP INDEX "ShopeeOrder_processingStatus_processingMode_idx";
```

---

## 🔍 Testing Scenarios

### End-to-End Test Flow

1. **Signup/Login**
   - Create new account
   - Login with credentials
   - Verify JWT token works

2. **Configure Shopee**
   - Go to Settings
   - Add Shopee Partner ID, Partner Key, Shop ID
   - Test connection (should see success message)

3. **Configure Amazon**
   - Add Amazon email/password
   - Select marketplace (Japan)
   - Add shipping address

4. **Enable Auto-Shipping**
   - Toggle "Enable Auto-Shipping"
   - Set min profit (e.g., ¥300)
   - Set max shipping days (e.g., 7)
   - Save settings

5. **Create Test Order in Shopee**
   - Use Shopee Seller Center
   - Create order with known Amazon product
   - Wait for worker to poll (default: every 5 minutes)

6. **Monitor Processing**
   - Check worker logs
   - Verify order fetched from Shopee
   - Verify profit calculation
   - Verify Amazon cart clearing
   - Verify Amazon purchase
   - Verify order confirmation

7. **Check Database**
   ```sql
   SELECT * FROM "ShopeeOrder" 
   WHERE "processingStatus" = 'COMPLETED'
   ORDER BY "createdAt" DESC 
   LIMIT 1;
   ```

8. **Verify Shopee Order Updated**
   - Check Shopee Seller Center
   - Should see tracking number updated
   - Should see order marked as shipped

---

## ⚠️ Known Issues to Monitor

### 1. Amazon 2FA
**Issue**: Amazon may still require 2FA for new IPs  
**Workaround**: 
- Use static IP for worker
- Whitelist IP in Amazon settings
- Session reuse reduces frequency

### 2. Shopee Token Expiry
**Issue**: Access tokens expire after ~30 days  
**Workaround**: Manual token refresh in admin panel  
**Future**: Implement OAuth refresh flow

### 3. Rate Limiting
**Issue**: Shopee limits to 1 req/sec  
**Status**: ✅ Now handled by RateLimiter class  
**Monitor**: Check logs for "rate limit" errors

---

## 📊 Success Metrics

After deployment, monitor these KPIs:

- **Order Processing Rate**: Target >95%
- **Amazon Purchase Success**: Target >90%
- **Shopee Polling Errors**: Target <5%
- **Average Processing Time**: Target <2 minutes per order
- **Session Reuse Rate**: Target >80%

---

## 🎯 Next Phase (Future Enhancements)

**Not included in this deployment**:

1. **Shopee OAuth Refresh** - Auto-refresh access tokens
2. **Amazon 2FA Handling** - TOTP integration or webhook notifications
3. **Multi-Region Support** - Amazon US, UK, etc.
4. **Batch Processing** - Process multiple orders in parallel
5. **Advanced Matching** - ML-based product matching
6. **Price Monitoring** - Track Amazon price changes
7. **Return Automation** - Handle Shopee returns automatically

---

## 📞 Support

If you encounter issues:

1. Check logs: `pm2 logs automation-worker`
2. Check database: Query `ShopeeOrder` table for errors
3. Check Vercel logs: Dashboard → Deployments → Logs
4. Review `INTEGRATION_FIXES_COMPLETE.md` for implementation details

---

**Ready to deploy! 🚀**

All critical bugs fixed, all builds successful, all code committed.
