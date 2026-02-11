#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Proper Place Backend - Server Management         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to start server
start_server() {
  echo -e "${YELLOW}→ Starting backend server with PM2...${NC}"
  cd "$BACKEND_DIR"
  
  # Check if PM2 is installed
  if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}✗ PM2 not found. Installing...${NC}"
    npm install -g pm2
  fi
  
  # Start with ecosystem config
  pm2 startOrRestart ecosystem.config.js
  pm2 save
  
  echo -e "${GREEN}✓ Backend server started successfully${NC}"
  sleep 2
  status_server
}

# Function to stop server
stop_server() {
  echo -e "${YELLOW}→ Stopping backend server...${NC}"
  cd "$BACKEND_DIR"
  pm2 stop all
  echo -e "${GREEN}✓ Backend server stopped${NC}"
}

# Function to restart server
restart_server() {
  echo -e "${YELLOW}→ Restarting backend server...${NC}"
  cd "$BACKEND_DIR"
  pm2 restart all
  echo -e "${GREEN}✓ Backend server restarted${NC}"
  sleep 2
  status_server
}

# Function to check server status
status_server() {
  echo -e "\n${BLUE}Server Status:${NC}"
  cd "$BACKEND_DIR"
  pm2 status
  
  echo -e "\n${BLUE}Health Check:${NC}"
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    HEALTH=$(curl -s http://localhost:3001/health)
    echo -e "${GREEN}✓ Server is healthy${NC}"
    echo -e "  Response: $HEALTH"
  else
    echo -e "${RED}✗ Server is not responding${NC}"
  fi
}

# Function to view logs
view_logs() {
  echo -e "${YELLOW}→ Displaying server logs (press Ctrl+C to exit)...${NC}"
  cd "$BACKEND_DIR"
  pm2 logs proper-place-backend --lines 50
}

# Function to setup PM2 startup
setup_startup() {
  echo -e "${YELLOW}→ Setting up PM2 to start on system boot...${NC}"
  pm2 startup
  pm2 save
  echo -e "${GREEN}✓ PM2 startup configured${NC}"
  echo -e "${YELLOW}⚠ Note: You may need to run 'sudo pm2 startup' for system-level startup${NC}"
}

# Function to delete all PM2 processes
delete_all() {
  echo -e "${RED}⚠ Warning: This will stop and delete all PM2 processes${NC}"
  read -p "Continue? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 delete all
    echo -e "${GREEN}✓ All PM2 processes deleted${NC}"
  fi
}

# Function to install dependencies
install_deps() {
  echo -e "${YELLOW}→ Installing dependencies...${NC}"
  cd "$BACKEND_DIR"
  npm install
  echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# Main menu
if [ $# -eq 0 ]; then
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  start          Start the backend server"
  echo "  stop           Stop the backend server"
  echo "  restart        Restart the backend server"
  echo "  status         Check server status and health"
  echo "  logs           View server logs"
  echo "  setup          Setup PM2 for system startup"
  echo "  delete         Delete all PM2 processes"
  echo "  install        Install dependencies"
  echo ""
  echo "Examples:"
  echo "  $0 start"
  echo "  $0 restart"
  echo "  $0 logs"
  exit 0
fi

case "$1" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    restart_server
    ;;
  status)
    status_server
    ;;
  logs)
    view_logs
    ;;
  setup)
    setup_startup
    ;;
  delete)
    delete_all
    ;;
  install)
    install_deps
    ;;
  *)
    echo -e "${RED}✗ Unknown command: $1${NC}"
    echo "Use '$0' with no arguments to see available commands"
    exit 1
    ;;
esac
