# ==============================================================================
# SecureChainFlow Backend Dockerfile (Multi-stage Production Build)
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy backend source code
COPY src ./src

# Build TypeScript to dist/
RUN npm run build

# ==============================================================================
# Production Stage
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist

# Add unprivileged user for security
USER node

EXPOSE 5000

CMD ["node", "dist/server.js"]
