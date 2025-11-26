# Vercel Environment Variables Setup

## Frontend (automation-web-psi)

Set these environment variables in the Vercel dashboard:

1. **NEXT_PUBLIC_API_URL**
   - Value: `https://automation-api-tau.vercel.app`
   - Environment: Production, Preview, Development

2. **NEXT_PUBLIC_MOCK_API** 
   - Value: `0` (or delete this variable completely)
   - Environment: Production

## How to Set Environment Variables

### Option 1: Via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project: `automation-web-psi`
3. Go to Settings → Environment Variables
4. Add each variable with the values above
5. Click "Save"
6. Redeploy from Deployments tab

### Option 2: Via Vercel CLI (Faster)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Navigate to web directory
cd /workspaces/AUTOMATION/apps/web

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: https://automation-api-tau.vercel.app

vercel env add NEXT_PUBLIC_MOCK_API production
# When prompted, enter: 0

# Redeploy
vercel --prod
```

## After Setting Variables

The signup and login pages have been fixed to use the `apiClient` which respects the `NEXT_PUBLIC_API_URL` environment variable.

### Test the Flow

1. Go to https://automation-web-psi.vercel.app/signup
2. Create a new account with:
   - Email: any valid email
   - Password: Must contain uppercase, lowercase, and digit (min 8 chars)
3. Click Sign Up
4. Should redirect to /dashboard
5. Check Supabase to verify user was created

## What Was Fixed

**signup.tsx**:
- Changed from `axios.post("/api/auth/signup", ...)` 
- To `api.post("/auth/signup", ...)` using apiClient

**login.tsx**:
- Changed from `axios.post("/api/auth/login", ...)`
- To `api.post("/auth/login", ...)` using apiClient

The `apiClient` automatically uses `NEXT_PUBLIC_API_URL` as the base URL, so all API calls go to the correct backend server.
