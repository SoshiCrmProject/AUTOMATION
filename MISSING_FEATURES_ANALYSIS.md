# Missing Features & Issues Analysis

## 🔴 CRITICAL MISSING FEATURES

### 1. Review Page - 404 Error
**Issue**: `/api/orders/errors` returns 404  
**Root Cause**: URL needs `/api` prefix stripped  
**Fix**: Update apiClient.ts interceptor to handle `/api/orders/errors/export` but not `/api/orders/errors`

### 2. Profit Calculator - MISSING ENTIRELY
**Issue**: No profit calculator page or component exists  
**Expected**: Should have calculator UI for:
- Input: Shopee order price, shipping cost
- Input: Amazon product price, Amazon shipping
- Output: Profit margin, profit percentage
- Uses `/profit/preview` endpoint

### 3. Product Scraper - MISSING
**Issue**: No Amazon product scraper UI
**Expected**: Form to scrape Amazon product by URL
- Input: Amazon product URL
- Output: Price, title, availability, shipping

### 4. Order Details Page - INCOMPLETE
**Issue**: `/orders/[id]` exists but may not have full data
**Check**: Verify order detail view shows all fields

## 🟡 HIGH PRIORITY MISSING

### 5. Shop Selector Component - NOT INTEGRATED
**Issue**: Settings page doesn't show which shop is active
**Fix**: Add shop dropdown to settings page

### 6. Manual Review Integration - INCOMPLETE
**Issue**: Review page gets data from `/api/orders/errors` (404)
**Fix**: Should get from `/orders/errors` (without /api prefix)

### 7. Batch Operations - MISSING
**Issue**: No UI for bulk order retries or approvals
**Expected**: Checkboxes + batch action buttons

### 8. Real-time Updates - MISSING
**Issue**: No websocket or polling for live order updates
**Expected**: Auto-refresh dashboard every 30s

## 🟢 MEDIUM PRIORITY MISSING

### 9. Export Functionality - PARTIAL
**Issue**: Export buttons exist but may not work correctly
**Check**: Verify CSV export for orders and errors

### 10. Notification Settings - NOT WIRED
**Issue**: Notification page UI exists but not saving
**Check**: Verify `/api/notifications/*` endpoints work

### 11. CRM Features - NOT FULLY INTEGRATED
**Issue**: CRM page may not load customer data
**Check**: Verify `/api/crm/*` endpoints work

### 12. Analytics Charts - MAY BE BROKEN
**Issue**: Analytics page getting 500 errors
**Root Cause**: Likely database query issues or missing data

## 📊 FEATURE STATUS MATRIX

| Feature | Frontend Exists | Backend Exists | Integrated | Status |
|---------|----------------|----------------|------------|--------|
| **Profit Calculator** | ❌ NO | ✅ YES | ❌ NO | **MISSING** |
| **Product Scraper** | ❌ NO | ✅ YES (in worker) | ❌ NO | **MISSING** |
| **Review Page** | ✅ YES | ✅ YES | ⚠️ PARTIAL | **404 ERROR** |
| **Shop Selector** | ⚠️ EXISTS | ✅ YES | ❌ NO | **NOT WIRED** |
| **Batch Operations** | ❌ NO | ✅ YES | ❌ NO | **MISSING** |
| **Real-time Updates** | ❌ NO | N/A | ❌ NO | **MISSING** |
| **Export CSV** | ✅ YES | ✅ YES | ⚠️ PARTIAL | **VERIFY** |
| **Notifications** | ✅ YES | ✅ YES | ⚠️ PARTIAL | **VERIFY** |
| **CRM** | ✅ YES | ✅ YES | ⚠️ PARTIAL | **VERIFY** |
| **Analytics** | ✅ YES | ✅ YES | ❌ NO | **500 ERROR** |
| **Inventory** | ✅ YES | ✅ YES | ⚠️ PARTIAL | **VERIFY** |
| **Returns** | ✅ YES | ✅ YES | ⚠️ PARTIAL | **VERIFY** |
| **Pricing Rules** | ✅ YES | ✅ YES | ⚠️ PARTIAL | **VERIFY** |

## 🚨 IMMEDIATE ACTIONS NEEDED

1. **Fix Review Page 404** - Update interceptor
2. **Create Profit Calculator Page** - New component
3. **Fix Analytics 500 Errors** - Check backend queries
4. **Add Shop Selector** - Integrate existing component
5. **Test All /api/* Routes** - Verify interceptor works
