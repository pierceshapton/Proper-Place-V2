# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the Next.js app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install process manager
RUN npm install -g pm2

# Copy package files from builder
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Start with PM2
CMD ["pm2-runtime", "start", "npm", "--name", "proper-place-web", "--", "start"]
