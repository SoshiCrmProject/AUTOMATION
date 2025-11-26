#!/bin/bash

# Shopee → Amazon Auto-Purchase Setup Script
# This script helps you set up the entire project quickly

set -e

echo "🚀 Shopee → Amazon Auto-Purchase Setup"
echo "========================================"
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Warning: Node.js version 18+ recommended. You have: $(node -v)"
fi

echo "✅ Node.js version: $(node -v)"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found. You'll need Docker for PostgreSQL and Redis."
    echo "   You can still run the project with external databases."
else
    echo "✅ Docker found: $(docker --version)"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "⚠️  IMPORTANT: Please edit .env and fill in your credentials:"
    echo "   - Database URLs (PostgreSQL)"
    echo "   - Redis URL"
    echo "   - JWT_SECRET (run: openssl rand -hex 32)"
    echo "   - AES_SECRET_KEY (run: openssl rand -hex 32)"
    echo "   - Shopee API credentials"
    echo "   - Amazon credentials"
    echo "   - Superadmin email/password"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🐘 Database setup..."
if command -v docker &> /dev/null; then
    echo "   Starting PostgreSQL and Redis with Docker Compose..."
    docker-compose up -d postgres redis
    echo "   Waiting for databases to be ready..."
    sleep 5
    
    echo "   Running database migrations..."
    cd apps/api
    npx prisma generate
    npx prisma migrate deploy
    cd ../..
    echo "✅ Database migrated successfully"
else
    echo "⚠️  Docker not available. Please ensure PostgreSQL and Redis are running."
    echo "   Then run manually:"
    echo "   cd apps/api && npx prisma generate && npx prisma migrate deploy"
fi

echo ""
echo "🎨 Building shared package..."
npm run build --workspace @shopee-amazon/shared

echo ""
echo "✨ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Edit .env and add your credentials"
echo "   2. Generate secrets:"
echo "      JWT_SECRET:     openssl rand -hex 32"
echo "      AES_SECRET_KEY: openssl rand -hex 32"
echo "   3. Start the development servers:"
echo "      npm run dev:api     # Terminal 1 - API (port 4000)"
echo "      npm run dev:worker  # Terminal 2 - Worker"
echo "      npm run dev:web     # Terminal 3 - Web (port 3000)"
echo "   4. Visit http://localhost:3000"
echo ""
echo "📖 For production deployment, run:"
echo "   docker-compose up -d"
echo ""
echo "🔒 Security reminders:"
echo "   - Never commit .env to git"
echo "   - Use strong passwords for superadmin"
echo "   - Rotate JWT_SECRET regularly in production"
echo "   - Store AES_SECRET_KEY in a secure secret manager"
echo ""
