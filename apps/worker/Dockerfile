FROM node:20-alpine
WORKDIR /app

# Install Playwright dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Playwright to use system chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
COPY packages ./packages
COPY apps ./apps
RUN npm install --legacy-peer-deps
RUN npm run --workspace @shopee-amazon/worker build
CMD ["npm", "run", "--workspace", "@shopee-amazon/worker", "start"]
