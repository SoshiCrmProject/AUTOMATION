# Quick Start Guide

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (recommended)
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)

## Quick Setup (Development)

### 1. Clone and Install

```bash
git clone <your-repo>
cd AUTOMATION
chmod +x setup.sh
./setup.sh
```

### 2. Configure Environment

Edit `.env` file and add your credentials:

```bash
# Generate secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For AES_SECRET_KEY

# Add to .env:
# - DATABASE_URL and DIRECT_URL
# - REDIS_URL
# - JWT_SECRET and AES_SECRET_KEY
# - Shopee API credentials
# - Amazon credentials
# - Superadmin credentials
```

### 3. Start Services

**Option A: Separate terminals (recommended for development)**

```bash
# Terminal 1 - API
npm run dev:api

# Terminal 2 - Worker
npm run dev:worker

# Terminal 3 - Frontend
npm run dev:web
```

**Option B: Docker Compose (production-like)**

```bash
docker-compose up -d
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health

### 5. Initial Login

Default superadmin credentials (change in `.env`):
- Email: admin@example.com
- Password: (set in SUPERADMIN_PASSWORD)

## Project Structure

```
AUTOMATION/
├── apps/
│   ├── api/          # Express backend (port 4000)
│   ├── worker/       # BullMQ worker (background jobs)
│   └── web/          # Next.js frontend (port 3000)
├── packages/
│   └── shared/       # Shared utilities
├── docs/             # Documentation
├── infra/            # Infrastructure configs
└── docker-compose.yml
```

## Common Tasks

### Run Database Migrations

```bash
cd apps/api
npx prisma migrate dev --name your_migration_name
```

### Reset Database

```bash
cd apps/api
npx prisma migrate reset
```

### View Database

```bash
cd apps/api
npx prisma studio
```

### Build for Production

```bash
npm run build --workspace @shopee-amazon/api
npm run build --workspace @shopee-amazon/worker
npm run build --workspace @shopee-amazon/web
```

### Run Tests (if implemented)

```bash
npm test
```

## Troubleshooting

### Port Already in Use

If ports 3000, 4000, 5434, or 6380 are in use:

```bash
# Find and kill process using the port
lsof -ti:4000 | xargs kill -9
```

Or change ports in:
- `docker-compose.yml` (for databases)
- `.env` (for services)

### Database Connection Errors

1. Ensure PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check connection string in `.env`:
   ```bash
   echo $DATABASE_URL
   ```

3. Test connection:
   ```bash
   cd apps/api
   npx prisma db pull
   ```

### Redis Connection Errors

1. Ensure Redis is running:
   ```bash
   docker-compose ps redis
   ```

2. Test Redis:
   ```bash
   redis-cli -h localhost -p 6380 ping
   ```

### Worker Not Processing Jobs

1. Check Redis connection in worker logs
2. Verify queue is created:
   ```bash
   redis-cli -h localhost -p 6380
   KEYS *
   ```

### Playwright Errors

If Playwright browser installation fails:

```bash
cd apps/worker
npx playwright install chromium
```

For Docker:
- Already included in `apps/worker/Dockerfile`
- Ensure system dependencies are installed

## Environment Variables Reference

See `.env.example` for complete list.

**Required**:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - JWT signing key
- `AES_SECRET_KEY` - Credential encryption key
- `SUPERADMIN_EMAIL` - Initial admin email
- `SUPERADMIN_PASSWORD` - Initial admin password

**Optional**:
- `SHOPEE_*` - Shopee API credentials (for production)
- `AMAZON_*` - Amazon credentials (for production)
- `ALERT_WEBHOOK_URL` - Webhook for alerts
- `NEXT_PUBLIC_MOCK_API` - Use mock API (development)

## Development Workflow

1. **Backend changes** → Restart `dev:api`
2. **Worker changes** → Restart `dev:worker`
3. **Frontend changes** → Auto-reloads with Next.js
4. **Database schema changes** → Run migration:
   ```bash
   cd apps/api
   npx prisma migrate dev --name description
   ```
5. **Shared package changes** → Rebuild:
   ```bash
   npm run build --workspace @shopee-amazon/shared
   ```

## Production Deployment

See `docs/deployment.md` for detailed production deployment guide.

Quick production start:

```bash
# 1. Set production environment variables
cp .env.example .env
# Edit .env with production values

# 2. Build and start all services
docker-compose up -d

# 3. View logs
docker-compose logs -f

# 4. Check health
curl http://localhost/api/health
```

## Additional Resources

- **Installation Guide**: `docs/installation.md`
- **Deployment Guide**: `docs/deployment.md`
- **Security Notes**: `docs/security.md`
- **Troubleshooting**: `docs/troubleshooting.md`
- **API Documentation**: See backend endpoints in `apps/api/src/index.ts`
- **Database Schema**: `apps/api/prisma/schema.prisma`

## Support

For issues:
1. Check `docs/troubleshooting.md`
2. Review logs: `docker-compose logs [service]`
3. Check GitHub issues
4. Contact support team

## License

[Your License Here]
