#!/bin/bash

# Health Check Monitor
# This script continuously monitors the backend server health and alerts if it goes down

LOG_FILE="./logs/health-check.log"
HEALTH_URL="http://localhost:3001/health"
CHECK_INTERVAL=30 # seconds
FAILURE_THRESHOLD=3 # restart after 3 consecutive failures

# Ensure logs directory exists
mkdir -p ./logs

echo "$(date): Starting health check monitor..." >> "$LOG_FILE"

failure_count=0

while true; do
  if curl -s "$HEALTH_URL" > /dev/null 2>&1; then
    if [ $failure_count -gt 0 ]; then
      echo "$(date): ✓ Server recovered" >> "$LOG_FILE"
      failure_count=0
    fi
  else
    failure_count=$((failure_count + 1))
    echo "$(date): ✗ Health check failed (attempt $failure_count/$FAILURE_THRESHOLD)" >> "$LOG_FILE"
    
    if [ $failure_count -ge $FAILURE_THRESHOLD ]; then
      echo "$(date): ⚠ Server down! Attempting restart..." >> "$LOG_FILE"
      pm2 restart proper-place-backend
      failure_count=0
      sleep 5
    fi
  fi
  
  sleep $CHECK_INTERVAL
done
