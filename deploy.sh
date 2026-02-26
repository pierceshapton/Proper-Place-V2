#!/bin/bash

################################################################################
# Proper Place - Complete Deployment Script
# Deploys backend + website to DigitalOcean droplet
# Usage: bash deploy.sh <droplet_ip> <github_repo_url>
################################################################################

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DROPLET_IP="${1:-162.159.140.98}"
GITHUB_REPO="${2}"
DOMAIN="proper-place.co.uk"
DEPLOYMENT_USER="root"
DEPLOYMENT_PATH="/var/www/proper-place"

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}Proper Place - Deployment Script${NC}"
echo -e "${YELLOW}================================${NC}"
echo ""
echo -e "Target Droplet: ${GREEN}${DROPLET_IP}${NC}"
echo -e "Domain: ${GREEN}${DOMAIN}${NC}"
echo ""

# Step 1: Connect and setup infrastructure
echo -e "${YELLOW}[1/6] Setting up droplet infrastructure...${NC}"
ssh ${DEPLOYMENT_USER}@${DROPLET_IP} << 'SETUP_SCRIPT'
set -e

echo "Updating system packages..."
apt-get update > /dev/null 2>&1
apt-get upgrade -y > /dev/null 2>&1

echo "Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh > /dev/null 2>&1
  sh get-docker.sh > /dev/null 2>&1
  rm get-docker.sh
else
  echo "Docker already installed"
fi

echo "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
  curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose > /dev/null 2>&1
  chmod +x /usr/local/bin/docker-compose
else
  echo "Docker Compose already installed"
fi

echo "Installing Nginx..."
apt-get install -y nginx certbot python3-certbot-nginx > /dev/null 2>&1

echo "Installing Node.js and PM2..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
  apt-get install -y nodejs > /dev/null 2>&1
fi

npm install -g pm2 > /dev/null 2>&1

echo "✓ Infrastructure setup complete"
SETUP_SCRIPT

echo -e "${GREEN}✓ Infrastructure ready${NC}"
echo ""

# Step 2: Clone/update repository
echo -e "${YELLOW}[2/6] Preparing application code...${NC}"

if [ -z "$GITHUB_REPO" ]; then
  echo -e "${YELLOW}Note: No GitHub repo provided. Using local copy.${NC}"
  echo "Uploading local code to droplet..."
  ssh ${DEPLOYMENT_USER}@${DROPLET_IP} "mkdir -p ${DEPLOYMENT_PATH}"
  rsync -avz --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude 'build' \
    --exclude '.env' \
    . ${DEPLOYMENT_USER}@${DROPLET_IP}:${DEPLOYMENT_PATH}/
else
  ssh ${DEPLOYMENT_USER}@${DROPLET_IP} << CLONE_SCRIPT
set -e
if [ -d "${DEPLOYMENT_PATH}" ]; then
  cd ${DEPLOYMENT_PATH}
  git pull origin main
else
  git clone ${GITHUB_REPO} ${DEPLOYMENT_PATH}
fi
CLONE_SCRIPT
fi

echo -e "${GREEN}✓ Code ready${NC}"
echo ""

# Step 3: Configure environment
echo -e "${YELLOW}[3/6] Configuring environment variables...${NC}"
ssh ${DEPLOYMENT_USER}@${DROPLET_IP} << ENV_SCRIPT
cat > ${DEPLOYMENT_PATH}/.env.production << 'EOF'
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://doadmin:AVNS_h5gAks_XqiZhRqSOX1T@db-postgresql-lon1-38562-properplace-do-user-33237375-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require
API_URL=https://${DOMAIN}/api
CORS_ORIGIN=https://${DOMAIN}
EOF

cat > ${DEPLOYMENT_PATH}/web/.env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
NODE_ENV=production
EOF
ENV_SCRIPT

echo -e "${GREEN}✓ Environment configured${NC}"
echo ""

# Step 4: Build and start Docker containers
echo -e "${YELLOW}[4/6] Building and starting Docker containers...${NC}"
ssh ${DEPLOYMENT_USER}@${DROPLET_IP} << DOCKER_SCRIPT
set -e
cd ${DEPLOYMENT_PATH}

echo "Building containers (this may take 2-3 minutes)..."
docker-compose -f docker-compose.prod.yml build 2>&1 | tail -20

echo "Starting services..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up -d

sleep 5
echo "Verifying services..."
docker-compose -f docker-compose.prod.yml ps
DOCKER_SCRIPT

echo -e "${GREEN}✓ Docker containers running${NC}"
echo ""

# Step 5: Configure Nginx and SSL
echo -e "${YELLOW}[5/6] Configuring Nginx & SSL Certificate...${NC}"
ssh ${DEPLOYMENT_USER}@${DROPLET_IP} << NGINX_SCRIPT
set -e

# Copy Nginx config
cp ${DEPLOYMENT_PATH}/nginx.conf /etc/nginx/sites-available/proper-place
ln -sf /etc/nginx/sites-available/proper-place /etc/nginx/sites-enabled/proper-place
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t > /dev/null 2>&1

# Get SSL certificate
certbot certonly --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m admin@${DOMAIN} 2>&1 | grep -E "Successfully|already" || true

# Reload Nginx
systemctl reload nginx

echo "✓ Nginx configured"
NGINX_SCRIPT

echo -e "${GREEN}✓ Nginx & SSL configured${NC}"
echo ""

# Step 6: Final verification
echo -e "${YELLOW}[6/6] Verifying deployment...${NC}"
ssh ${DEPLOYMENT_USER}@${DROPLET_IP} << VERIFY_SCRIPT
echo "=== Service Status ==="
docker-compose -f ${DEPLOYMENT_PATH}/docker-compose.prod.yml ps

echo ""
echo "=== Port Status ==="
netstat -tuln | grep -E ':(80|443|3000|3001)' || echo "Ports ready"

echo ""
echo "=== Recent Logs (Website) ==="
docker-compose -f ${DEPLOYMENT_PATH}/docker-compose.prod.yml logs website 2>/dev/null | tail -5 || echo "Logs not available yet"

echo ""
echo "=== Recent Logs (Backend) ==="
docker-compose -f ${DEPLOYMENT_PATH}/docker-compose.prod.yml logs backend 2>/dev/null | tail -5 || echo "Logs not available yet"
VERIFY_SCRIPT

echo -e "${GREEN}✓ Deployment verified${NC}"
echo ""

# Success summary
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. ${YELLOW}Update your domain DNS:${NC}"
echo "   Point A record '@' to: ${GREEN}${DROPLET_IP}${NC}"
echo ""
echo "2. ${YELLOW}Wait for DNS propagation (24-48 hours)${NC}"
echo ""
echo "3. ${YELLOW}Access your website:${NC}"
echo "   https://${GREEN}${DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo ""
echo "SSH into droplet:"
echo "  ssh ${DEPLOYMENT_USER}@${DROPLET_IP}"
echo ""
echo "View logs:"
echo "  docker-compose -f ${DEPLOYMENT_PATH}/docker-compose.prod.yml logs -f website"
echo "  docker-compose -f ${DEPLOYMENT_PATH}/docker-compose.prod.yml logs -f backend"
echo ""
echo "Restart services:"
echo "  docker-compose -f ${DEPLOYMENT_PATH}/docker-compose.prod.yml restart"
echo ""
echo "Update code:"
echo "  cd ${DEPLOYMENT_PATH} && git pull && docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
echo -e "Support: Check ${DEPLOYMENT_PATH}/DIGITALOCEAN_DEPLOY_WEBSITE.md${NC}"
echo ""
