# ==============================================================================
# SecureChainFlow Frontend Dockerfile (Multi-stage Production Build)
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js index.html ./

# Install dependencies
RUN npm ci

# Copy source code and public assets
COPY src ./src

# Set build argument for backend API URL (can be overridden at build time)
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build static bundle to dist/
RUN npm run build

# ==============================================================================
# Production Web Server Stage (Nginx Alpine)
# ==============================================================================
FROM nginx:alpine AS runner

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built bundle from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom SPA Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
