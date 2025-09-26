# =========================
# Multi-stage build for NLQ Backend
# =========================

# ---------- Builder Stage ----------
FROM node:20-alpine AS builder

  # Set working directory
  WORKDIR /app
  
  # Copy package files
  COPY package*.json ./
  
  # Install all dependencies (including dev for build)
  RUN npm ci && npm cache clean --force
  
  # Copy source code
  COPY . .
  
  # Create non-root user
  RUN addgroup -g 1001 -S nodejs \
    && adduser -S nlq -u 1001
  
  # Change ownership
  RUN chown -R nlq:nodejs /app
  
# ---------- Production Stage ----------
FROM node:20-alpine AS production
  
  # Install dumb-init (works on arm64 & amd64)
  RUN apk add --no-cache dumb-init
  
  # Set working directory
  WORKDIR /app
  
  # Create non-root user
  RUN addgroup -g 1001 -S nodejs \
    && adduser -S nlq -u 1001
  
  # Copy only necessary files
  COPY --from=builder --chown=nlq:nodejs /app/package*.json ./
  RUN npm ci --omit=dev && npm cache clean --force
  
  # Copy built source code (no dev files)
  COPY --from=builder --chown=nlq:nodejs /app/src ./src
  COPY --from=builder --chown=nlq:nodejs /app/scripts ./scripts
  
  # Create logs directory
  RUN mkdir -p /app/logs && chown -R nlq:nodejs /app/logs
  
  # Switch to non-root user
  USER nlq
  
  # Expose application port
  EXPOSE 3001
  
  # Health check
  HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
  
  # Use dumb-init to handle signals properly
  ENTRYPOINT ["dumb-init", "--"]
  
  # Start application
  CMD ["node", "src/server.js"]
  