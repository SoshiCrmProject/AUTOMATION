# 🚀 Shopee-Amazon Automation Platform

A comprehensive enterprise-grade automation platform for seamless product synchronization between Shopee and Amazon marketplaces. Built with Next.js, TypeScript, and modern web technologies.

## ✨ Features

### 🌐 Multi-language Support
- **Japanese (Default)** - 日本語がデフォルト言語
- **English** - Full internationalization support
- In-app language switcher on all pages
- 1,180+ translation keys for complete localization

### 📦 Core Functionality
- **Product Calculator** - ROI and profit margin calculations
- **Web Scraper** - Automated product data extraction
- **Order Management** - Comprehensive order tracking and processing
- **Inventory Management** - Real-time stock synchronization
- **CRM System** - Customer relationship management
- **Analytics Dashboard** - Business intelligence and insights
- **Notifications** - Real-time alerts and updates

### 🛡️ Enterprise Features
- **Role-based Access Control** - Admin, Manager, Staff roles
- **Multi-shop Support** - Manage multiple Shopee/Amazon accounts
- **Automated Workflows** - Background task processing
- **API Integration** - RESTful API with authentication
- **Database Migrations** - Version-controlled schema management
- **Redis Caching** - High-performance data caching

### 🎨 Modern UI/UX
- **Responsive Design** - Mobile, tablet, and desktop optimized
- **Dark/Light Mode** - Theme switching support
- **Progressive Web App** - Offline-capable PWA
- **Accessibility** - WCAG 2.1 compliant
- **Guided Onboarding** - Interactive product tours

## 🏗️ Tech Stack

### Frontend
- **Next.js 14.1** - React framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **next-i18next** - Internationalization

### Backend
- **Express.js** - Node.js API server
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Primary database (Supabase)
- **Redis** - Caching (Upstash)

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd AUTOMATION
```

### 2. Environment Setup
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup
```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
```

### 5. Start Development
```bash
# Option A: Docker Compose
docker-compose up -d

# Option B: Manual
cd apps/web && npm run dev  # Frontend: http://localhost:3000
cd apps/api && npm run dev  # API: http://localhost:4000
```

## 📦 Project Structure
```
AUTOMATION/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # Express.js API
│   └── worker/       # Background jobs
├── packages/shared/  # Shared utilities
└── docs/            # Documentation
```

## 🔧 Configuration

See `.env.example` for all environment variables. Required:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - Generate with `openssl rand -hex 32`
- `AES_SECRET_KEY` - Generate with `openssl rand -hex 32`

## 📚 Documentation
- [Deployment Guide](VERCEL_DEPLOYMENT_GUIDE.md)
- [Shopee Setup](SHOPEE_CREDENTIALS_GUIDE.md)
- [Translation Guide](TRANSLATION_QUICK_START.md)
- [Troubleshooting](docs/troubleshooting.md)

## 🔒 Security
- JWT Authentication
- AES-256 Encryption
- Rate Limiting
- Security Headers
- HTTPS Only

## 📄 License
MIT License - see LICENSE file

---
**Built with ❤️ using Next.js, TypeScript, and modern web technologies**
