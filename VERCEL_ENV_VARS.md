# 🎯 VERCEL ENVIRONMENT VARIABLES - COPY & PASTE

## ⚠️ CURRENT ISSUE
Your frontend at https://automation-web-psi.vercel.app/ is using **MOCK/DEMO DATA** because the backend API is not deployed.

---

## 🚀 SOLUTION: Deploy Backend + Update Frontend

### STEP 1: Deploy Backend API

1. **Go to**: https://vercel.com/new
2. **Import**: Your GitHub repo `SoshiCrmProject/AUTOMATION`
3. **Configure**:
   - Project Name: `automation-api`
   - Root Directory: `apps/api` ← IMPORTANT!
   - Build Command: `npm run build && npx prisma generate`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables** (copy ALL of these):

```
DATABASE_URL=postgresql://postgres.bxwfrmbrwkvxptevvebb:Jia.kaleem69@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

DIRECT_URL=postgresql://postgres:Jia.kaleem69@db.bxwfrmbrwkvxptevvebb.supabase.co:5432/postgres

REDIS_URL=redis://default:AY3JAAIncDFiZDg1ZDMyYmI5OWE0ZWUzOTI1MDZkYWE3Nzk3M2EyNXAxMzYyOTc@grand-firefly-36297.upstash.io:6379

JWT_SECRET=02a93e4b0319c91ac16e04fa7079a4c45b5227681aeb73ac12583ecb43b2f4ef

AES_SECRET_KEY=2403b4ebb6aaada14aa4c0bf49601fb349c3d877053904d14dd2a7ff8df9899f

HEALTH_TOKEN=ca6a3823edd708de627bc1ec7cf6011eb28b9ccd6e61bf3e81b67beb089e16d2

SUPERADMIN_EMAIL=admin@example.com

SUPERADMIN_PASSWORD=jia.kaleem69

NODE_ENV=production

AMAZON_SHIPPING_LABEL=Shopee Warehouse
```

**Optional (fill later when you have credentials):**
```
SHOPEE_PARTNER_ID=

SHOPEE_PARTNER_KEY=

SHOPEE_ACCESS_TOKEN=

SHOPEE_SHOP_ID=

AMAZON_LOGIN_EMAIL=

AMAZON_LOGIN_PASSWORD=

ALERT_WEBHOOK_URL=
```

5. **Deploy** - Note your API URL (e.g., `https://automation-api-xyz.vercel.app`)

---

### STEP 2: Update Frontend Environment Variables

**Go to**: https://vercel.com/dashboard → Your project `automation-web-psi` → Settings → Environment Variables

**DELETE** (if exists):
```
NEXT_PUBLIC_MOCK_API
```

**ADD** these:
```
NEXT_PUBLIC_API_URL=https://automation-api-xyz.vercel.app
```
(Replace `xyz` with your actual API domain from Step 1)

```
NEXT_PUBLIC_MOCK_API=0
```

**Then REDEPLOY**:
- Go to Deployments tab
- Click latest deployment → "..." menu → "Redeploy"

---

## ✅ VERIFICATION

After both deployments complete:

1. **Visit**: https://automation-web-psi.vercel.app/signup
2. **Create Account**: test@example.com / TestPass123
3. **Login**: Should work with real database (no mock data)
4. **Check Network Tab** (F12): API calls should go to your deployed API URL

---

## 📋 QUICK CHECKLIST

Frontend (automation-web-psi):
- [ ] Add `NEXT_PUBLIC_API_URL` = your API domain
- [ ] Set `NEXT_PUBLIC_MOCK_API=0`
- [ ] Redeploy

Backend API (automation-api - NEW PROJECT):
- [ ] Create new Vercel project
- [ ] Root directory: `apps/api`
- [ ] Add DATABASE_URL
- [ ] Add DIRECT_URL
- [ ] Add REDIS_URL
- [ ] Add JWT_SECRET
- [ ] Add AES_SECRET_KEY
- [ ] Add HEALTH_TOKEN
- [ ] Add SUPERADMIN_EMAIL
- [ ] Add SUPERADMIN_PASSWORD
- [ ] Add NODE_ENV=production
- [ ] Add AMAZON_SHIPPING_LABEL
- [ ] Deploy

---

## 🎯 Result

- ✅ Real account creation (saved to Supabase database)
- ✅ Real login (JWT authentication)
- ✅ Real data on all pages (no mock data)
- ✅ Real Shopee/Amazon integration (when you add credentials)
- ✅ 100% Production Grade

---

**Your database and Redis are already configured and running!** You just need to deploy the backend API and connect the frontend to it.
