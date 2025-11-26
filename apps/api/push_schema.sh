#!/bin/bash
# Temporarily use direct connection for schema push
export DATABASE_URL="postgresql://postgres.bxwfrmbrwkvxptevvebb:Jia.kaleem69@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"

cd /workspaces/AUTOMATION/apps/api
npx prisma db push --accept-data-loss
npx prisma generate
