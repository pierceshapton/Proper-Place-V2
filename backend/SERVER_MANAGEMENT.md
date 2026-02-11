# Backend Server Management Guide

## Overview

This guide explains how to reliably run and manage your Proper Place backend server. We use **PM2** (a Node.js process manager) to ensure your server stays running even if it crashes.

## Quick Start

### 1. Start the Server (Development)

**Option A: Using npm script**
```bash
cd backend
npm run start:pm2
```

**Option B: Using the management script**
```bash
cd backend/scripts
./server.sh start
```

### 2. Check Server Status
```bash
npm run status
# or
./scripts/server.sh status
```

### 3. View Logs
```bash
npm run logs
# or
./scripts/server.sh logs
```

### 4. Restart Server
```bash
npm run restart
# or
./scripts/server.sh restart
```

## What PM2 Does

✅ **Auto-Restart on Crash** - If the server crashes, PM2 automatically restarts it  
✅ **Memory Protection** - Restarts if server uses more than 500MB RAM  
✅ **System Startup** - Can be configured to start automatically on system boot  
✅ **Log Management** - Automatically logs errors and output  
✅ **Health Monitoring** - Track server uptime and status  
✅ **Graceful Shutdown** - Properly closes connections when restarting

## Configuration

### PM2 Ecosystem Config (`ecosystem.config.js`)

Key settings:
- **autorestart**: true - Automatically restart on crash
- **max_memory_restart**: 500M - Restart if memory exceeds 500MB
- **max_restarts**: 10 - Max 10 restarts per hour (prevents restart loops)
- **min_uptime**: 10s - Must run for 10 seconds to count as successful start
- **cron_restart**: 0 0 * * * - Daily restart at midnight for memory cleanup

## Available npm Commands

```bash
npm run start:pm2              # Start server with PM2
npm run start:pm2:prod        # Start server in production mode
npm run stop                  # Stop the server
npm run restart              # Restart the server
npm run status               # Check status
npm run logs                 # View logs
npm run logs:error           # View error logs
npm run pm2:setup            # Setup PM2 for system startup
npm run pm2:delete           # Delete all PM2 processes
npm run health               # Check server health endpoint
```

## Management Script (`scripts/server.sh`)

Comprehensive server management script with color-coded output:

```bash
./scripts/server.sh start      # Start server
./scripts/server.sh stop       # Stop server
./scripts/server.sh restart    # Restart server
./scripts/server.sh status     # Check status and health
./scripts/server.sh logs       # View logs
./scripts/server.sh setup      # Setup system startup
./scripts/server.sh install    # Install dependencies
```

## Setup for System Startup (macOS/Linux)

To make your server start automatically when your Mac boots up:

```bash
npm run pm2:setup
# or
./scripts/server.sh setup
```

Then save the configuration:
```bash
pm2 save
```

## Docker Deployment (Production)

For production or consistent development environments:

```bash
# Build the Docker image
docker build -f Dockerfile -t proper-place-backend:latest .

# Run with Docker
docker run -p 3001:3001 \
  --env NODE_ENV=production \
  --env-file .env \
  --name proper-place-backend \
  proper-place-backend:latest
```

Or use Docker Compose:
```bash
docker-compose up -d
```

## Health Check

Your server has a built-in health check endpoint:

```bash
# Check health
curl http://localhost:3001/health

# Pretty printed (requires jq)
npm run health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-02-11T09:27:08.148Z"}
```

## Troubleshooting

### Server won't start
1. Check if port 3001 is already in use:
   ```bash
   lsof -i :3001
   ```

2. View error logs:
   ```bash
   npm run logs:error
   # or
   tail -f ./logs/error.log
   ```

3. Check dependencies:
   ```bash
   npm install
   ```

### Server crashes frequently
1. Check memory usage:
   ```bash
   pm2 monit
   ```

2. Check logs for errors:
   ```bash
   npm run logs
   ```

3. Increase max_memory_restart in ecosystem.config.js if needed

### PM2 not found
```bash
npm install -g pm2
```

## Production Recommendations

1. **Use Docker** for consistent environments
2. **Enable PM2 startup** for system-level recovery
3. **Monitor logs** regularly
4. **Set up alerts** for server failures
5. **Use a reverse proxy** (Nginx) in front of Node.js
6. **Configure backup/snapshots** for the database
7. **Use environment variables** for sensitive data

## Monitoring

View real-time monitoring:
```bash
pm2 monit
```

Save PM2 process list:
```bash
pm2 save
```

View PM2 status:
```bash
pm2 status
```

## Next Steps

✅ Your server is now protected from crashes  
✅ Logs are automatically managed  
✅ Restart times are optimized  

For your Flutter app to never be affected:
1. Keep this PM2 process running in the background
2. The server will automatically recovery from any crashes
3. Your app will reconnect seamlessly

## Getting Help

- Check PM2 docs: https://pm2.keymetrics.io/
- Check server logs: `npm run logs`
- Check health: `npm run health`
