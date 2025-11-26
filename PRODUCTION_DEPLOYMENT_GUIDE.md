# 🚀 100% Production Deployment Guide

## Current Status
- ✅ Frontend deployed: https://automation-web-psi.vercel.app/
- ❌ Backend API: Not deployed (using MOCK DATA)
- ❌ Database: Configured but not connected
- ❌ Redis: Configured but not connected

---

## 🎯 Goal: 100% Production Grade (Real Data, No Mock)

You need to deploy **TWO separate Vercel projects**:
1. **Frontend** (apps/web) - Already deployed ✅
2. **Backend API** (apps/api) - Needs deployment ❌

---

## 📦 Step 1: Deploy Backend API to Vercel

### A. Create New Vercel Project for API

1. **Go to Vercel Dashboard**: https://vercel.com/new
2. **Import Git Repository**: `SoshiCrmProject/AUTOMATION`
3. **Configure Project**:
   - **Project Name**: `automation-api` (or any name)
   - **Framework Preset**: Other
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm run build && npx prisma generate`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
   - **Node Version**: 18.x

4. **Deploy** (will fail first time - that's OK, we need to add environment variables)

### B. Add Environment Variables to API Project

In Vercel Dashboard → Your API Project → Settings → Environment Variables, add:

```env
# Database (Supabase - Already configured)
DATABASE_URL=postgresql://postgres.bxwfrmbrwkvxptevvebb:Jia.kaleem69@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:Jia.kaleem69@db.bxwfrmbrwkvxptevvebb.supabase.co:5432/postgres

# Redis (Upstash - Already configured)
REDIS_URL=redis://default:AY3JAAIncDFiZDg1ZDMyYmI5OWE0ZWUzOTI1MDZkYWE3Nzk3M2EyNXAxMzYyOTc@grand-firefly-36297.upstash.io:6379

# Security Secrets
JWT_SECRET=02a93e4b0319c91ac16e04fa7079a4c45b5227681aeb73ac12583ecb43b2f4ef
AES_SECRET_KEY=2403b4ebb6aaada14aa4c0bf49601fb349c3d877053904d14dd2a7ff8df9899f
HEALTH_TOKEN=ca6a3823edd708de627bc1ec7cf6011eb28b9ccd6e61bf3e81b67beb089e16d2

# Shopee Credentials (You need to fill these)
SHOPEE_PARTNER_ID=YOUR_PARTNER_ID
SHOPEE_PARTNER_KEY=YOUR_PARTNER_KEY
SHOPEE_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
SHOPEE_SHOP_ID=YOUR_SHOP_ID

# Amazon Credentials (You need to fill these)
AMAZON_LOGIN_EMAIL=your-amazon-email@example.com
AMAZON_LOGIN_PASSWORD=your-amazon-password
AMAZON_SHIPPING_LABEL=Shopee Warehouse

# Admin Account
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=jia.kaleem69

# Optional: Webhook for alerts
ALERT_WEBHOOK_URL=

# Node Environment
NODE_ENV=production
```

5. **Redeploy** after adding environment variables
6. **Note your API URL**: Will be something like `https://automation-api-xxx.vercel.app`

---

## 📱 Step 2: Update Frontend Environment Variables

In Vercel Dashboard → Your Frontend Project (`automation-web-psi`) → Settings → Environment Variables:

### **CRITICAL: Remove or Update These**

**Remove**:
```
NEXT_PUBLIC_MOCK_API=1  ← DELETE THIS!
```

**Add/Update**:
```env
# Your deployed backend API URL (from Step 1)
NEXT_PUBLIC_API_URL=https://automation-api-xxx.vercel.app

# Disable mock mode (use real API)
NEXT_PUBLIC_MOCK_API=0
```

**Redeploy Frontend** after changing environment variables:
- Go to Deployments tab
- Click "..." on latest deployment
- Click "Redeploy"

---

## ✅ Step 3: Verify Production Setup

### Test Account Creation Flow

1. **Visit**: https://automation-web-psi.vercel.app/signup
2. **Create Account**:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
3. **Should see**: Real database insertion (no mock data)

### Test Login Flow

1. **Visit**: https://automation-web-psi.vercel.app/login
2. **Login with**:
   - Email: `admin@example.com`
   - Password: `jia.kaleem69`
3. **Should see**: Real dashboard with database data

### Test API Connection

1. **Open Browser DevTools** (F12) → Network tab
2. **Navigate to Dashboard**
3. **Check API calls**: Should go to `https://automation-api-xxx.vercel.app/api/...`
4. **Should NOT see**: Mock data warnings

---

## 🔧 Environment Variables Summary

### Frontend (automation-web-psi.vercel.app)
```env
NEXT_PUBLIC_API_URL=https://automation-api-xxx.vercel.app
NEXT_PUBLIC_MOCK_API=0
```

### Backend (automation-api-xxx.vercel.app)
```env
# Database
DATABASE_URL=postgresql://postgres.bxwfrmbrwkvxptevvebb:Jia.kaleem69@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:Jia.kaleem69@db.bxwfrmbrwkvxptevvebb.supabase.co:5432/postgres

# Redis
REDIS_URL=redis://default:AY3JAAIncDFiZDg1ZDMyYmI5OWE0ZWUzOTI1MDZkYWE3Nzk3M2EyNXAxMzYyOTc@grand-firefly-36297.upstash.io:6379

# Security
JWT_SECRET=02a93e4b0319c91ac16e04fa7079a4c45b5227681aeb73ac12583ecb43b2f4ef
AES_SECRET_KEY=2403b4ebb6aaada14aa4c0bf49601fb349c3d877053904d14dd2a7ff8df9899f
HEALTH_TOKEN=ca6a3823edd708de627bc1ec7cf6011eb28b9ccd6e61bf3e81b67beb089e16d2

# Shopee (Fill with your real credentials)
SHOPEE_PARTNER_ID=
SHOPEE_PARTNER_KEY=
SHOPEE_ACCESS_TOKEN=
SHOPEE_SHOP_ID=

# Amazon (Fill with your real credentials)
AMAZON_LOGIN_EMAIL=
AMAZON_LOGIN_PASSWORD=
AMAZON_SHIPPING_LABEL=Shopee Warehouse

# Admin
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=jia.kaleem69

# Optional
ALERT_WEBHOOK_URL=

# Node
NODE_ENV=production
```

---

## 🚨 Important Security Notes

1. **Never commit `.env` files** to Git (already in .gitignore)
2. **Change default passwords** in production:
   - Change `SUPERADMIN_PASSWORD`
   - Generate new `JWT_SECRET` (use: `openssl rand -hex 32`)
   - Generate new `AES_SECRET_KEY`
   - Generate new `HEALTH_TOKEN`

3. **Database credentials** are already exposed in this file - consider rotating them

---

## 🐛 Troubleshooting

### Frontend shows "Failed to Load Data"
- Check: `NEXT_PUBLIC_API_URL` is set to your deployed API URL
- Check: `NEXT_PUBLIC_MOCK_API=0` (not 1)
- Check: API deployment is successful
- Check: Browser DevTools → Network tab for API errors

### API deployment fails
- Check: Build logs in Vercel
- Check: All required environment variables are set
- Check: `DATABASE_URL` and `REDIS_URL` are correct
- Check: Prisma schema is up to date

### Database connection errors
- Check: Supabase database is running
- Check: Connection string includes `?pgbouncer=true` for pooling
- Check: Database has required tables (run migrations)

### Redis connection errors
- Check: Upstash Redis instance is running
- Check: `REDIS_URL` format is correct
- Check: Redis URL includes credentials

### Authentication not working
- Check: `JWT_SECRET` is set and matches between API restarts
- Check: Cookies/localStorage in browser (clear and retry)
- Check: CORS is enabled in API (already configured)

---

## 📊 Production Checklist

- [ ] Backend API deployed to Vercel
- [ ] All environment variables added to API project
- [ ] Frontend environment variables updated (NEXT_PUBLIC_API_URL)
- [ ] Mock mode disabled (NEXT_PUBLIC_MOCK_API=0)
- [ ] Frontend redeployed after env var changes
- [ ] Account creation works (creates real database records)
- [ ] Login works (authenticates against real database)
- [ ] Dashboard loads real data (not mock data)
- [ ] API calls visible in Network tab going to production API
- [ ] Shopee credentials added (optional - for Shopee integration)
- [ ] Amazon credentials added (optional - for Amazon automation)
- [ ] Changed default admin password
- [ ] Rotated security secrets (JWT_SECRET, etc.)

---

## 🎯 Quick Start Commands

### Deploy Backend API (First Time)
```bash
# In Vercel Dashboard:
# 1. New Project → Import AUTOMATION repo
# 2. Root Directory: apps/api
# 3. Build Command: npm run build && npx prisma generate
# 4. Add all environment variables above
# 5. Deploy
```

### Update Frontend (After API Deployed)
```bash
# In Vercel Dashboard → automation-web-psi:
# 1. Settings → Environment Variables
# 2. Add: NEXT_PUBLIC_API_URL=https://your-api-url.vercel.app
# 3. Update: NEXT_PUBLIC_MOCK_API=0
# 4. Deployments → Redeploy latest
```

---

## 🌐 Expected URLs After Deployment

- **Frontend**: https://automation-web-psi.vercel.app
- **Backend API**: https://automation-api-xxx.vercel.app (your API domain)
- **Database**: aws-1-ap-southeast-2.pooler.supabase.com (already running)
- **Redis**: grand-firefly-36297.upstash.io (already running)

---

## 📞 Support

Your infrastructure is already set up:
- ✅ Supabase PostgreSQL Database
- ✅ Upstash Redis Queue
- ✅ Frontend deployed
- ❌ Backend API needs deployment

Follow the steps above to complete your 100% production deployment!
