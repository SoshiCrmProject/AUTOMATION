# 🔐 Shopee Credentials Integration Guide

## 📋 Official Shopee Open Platform Documentation

### Required Credentials
Based on **Shopee Open Platform API v2** documentation (https://open.shopee.com/):

1. **Partner ID** - Unique identifier for your app
2. **Partner Key** - Secret key for signing requests  
3. **Access Token** - OAuth token for shop authorization (optional for some endpoints)
4. **Shop ID** - Numeric ID of the shop

### How to Obtain Credentials

#### Step 1: Register on Shopee Open Platform
1. Go to https://open.shopee.com/
2. Click "Register" or "Partner Portal"
3. Complete registration with business details
4. Verify email and complete KYC if required

#### Step 2: Create an App
1. Log in to Partner Portal
2. Navigate to "My Apps" → "Create New App"
3. Fill in app details:
   - App Name
   - App Type (Choose "Self-built" for internal use)
   - Description
4. Submit for approval (may take 1-3 business days)

#### Step 3: Get Credentials
Once approved:
- **Partner ID**: Found in app details page
- **Partner Key**: Generate or copy from app settings
- **Shop ID**: Get from your Shopee seller center URL or API

#### Step 4: OAuth Authorization (For Access Token)
1. Implement OAuth flow using `/api/v2/auth/token/get`
2. Or use test credentials for development
3. Access tokens expire - implement refresh logic

### API Authentication Flow

```typescript
// 1. Generate signature
const timestamp = Math.floor(Date.now() / 1000);
const path = "/api/v2/order/get_order_list";
const base = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
const sign = crypto.createHmac("sha256", partnerKey).update(base).digest("hex");

// 2. Build URL
const url = `${baseUrl}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}`;

// 3. Add shop_id to body (REQUIRED for API v2)
const body = {
  shop_id: Number(shopId),
  // ... other params
};
```

### Common Errors & Solutions

#### Error: "error.invalid_sign"
**Cause**: Incorrect signature calculation  
**Solution**: Ensure signature string format matches: `{partner_id}{path}{timestamp}{access_token}{shop_id}`

#### Error: "error.auth.invalid_access_token"
**Cause**: Token expired or invalid  
**Solution**: Regenerate access token via OAuth flow

#### Error: "error.shop_id_not_match"
**Cause**: shop_id in URL doesn't match body  
**Solution**: Ensure shop_id is Number in body: `shop_id: Number(cfg.shopId)`

#### Error: "error.rate_limit_exceed"
**Cause**: Exceeded 1 request/second limit  
**Solution**: Implement rate limiter (already done in `shopeeClient.ts`)

### Testing Credentials

Use our test endpoint:
```bash
# In Ops page → Test Scrape section
POST /api/orders/poll-now
```

Or use Shopee's test API:
```bash
curl -X POST "https://partner.test-stable.shopee.com/api/v2/shop/get_shop_info?partner_id={partner_id}&timestamp={ts}&sign={sign}&shop_id={shop_id}" \
  -H "Content-Type: application/json" \
  -d '{"shop_id": 123456}'
```

### Rate Limits
- **1 request per second** per shop
- Exceeding triggers rate_limit_exceed error
- Our system includes automatic rate limiting

### Best Practices
1. ✅ Store credentials encrypted (AES-256-GCM)
2. ✅ Never commit credentials to git
3. ✅ Use environment variables for sensitive data
4. ✅ Implement token refresh before expiry
5. ✅ Log API errors with request_id for debugging
6. ✅ Test with sandbox/test environment first

### Implementation Checklist

#### Backend Integration ✅
- [x] Signature calculation with HMAC-SHA256
- [x] shop_id in both URL and body
- [x] Rate limiting (1 req/sec)
- [x] Error response parsing
- [x] AES-256-GCM encryption for storage
- [x] Timestamp-based authentication

#### Frontend Integration ✅
- [x] Settings page with credentials form
- [x] Validation before save
- [x] Masked password fields
- [x] Success/error feedback
- [x] Auto-load existing credentials
- [x] Shop selection dropdown

#### Validation Rules ✅
```typescript
// Partner ID: numeric string
partnerId: z.string().regex(/^\d+$/)

// Partner Key: hex string (64 chars)
partnerKey: z.string().min(32)

// Shop ID: numeric string  
shopId: z.string().regex(/^\d+$/)

// Access Token: alphanumeric (optional)
accessToken: z.string().optional()
```

### Support Resources
- Official Docs: https://open.shopee.com/documents
- API Reference: https://open.shopee.com/documents/v2/v2.order.get_order_list
- Partner Portal: https://partner.shopee.com/
- Developer Forum: https://developers.shopee.com/

### Current System Status
✅ **Fully Integrated** - All Shopee API requirements implemented
- Signature generation correct
- shop_id in body and URL
- Rate limiting active
- Error handling complete
- Encryption implemented
- Settings UI complete
