FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
COPY packages ./packages
COPY apps ./apps
RUN npm install --legacy-peer-deps
RUN npm run --workspace @shopee-amazon/api build
EXPOSE 4000
CMD ["npm", "run", "--workspace", "@shopee-amazon/api", "start"]
