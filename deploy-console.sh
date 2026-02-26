#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Deploying Proper Place Website${NC}"

# Update system
echo -e "${GREEN}[1/6] Updating system...${NC}"
apt-get update && apt-get upgrade -y

# Install Docker
echo -e "${GREEN}[2/6] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && rm get-docker.sh
fi

# Install Docker Compose
echo -e "${GREEN}[3/6] Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
  curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

# Create deployment directory
echo -e "${GREEN}[4/6] Setting up...${NC}"
mkdir -p /var/www/proper-place && cd /var/www/proper-place

# Clone/pull repository
echo -e "${GREEN}[5/6] Downloading code...${NC}"
if [ -d ".git" ]; then
  git pull origin main
else
  git clone https://github.com/pierceshaptonproperplace/Proper-Place-V2.git .
fi

# Create environment file
cat > .env.production << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://proper-place.co.uk/api
DATABASE_URL=postgresql://doadmin:AVNS_h5gAks_XqiZhRqSOX1T@db-postgresql-lon1-38562-properplace-do-user-33237375-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require
NODE_ENV=production
ENVEOF

# Start containers
echo -e "${GREEN}[6/6] Starting services...${NC}"
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Configure Nginx
cp nginx.conf /etc/nginx/sites-available/proper-place.conf
ln -sf /etc/nginx/sites-available/proper-place.conf /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx && systemctl enable nginx

# Install Certbot and get SSL
apt-get install -y certbot python3-certbot-nginx
certbot certonly --standalone -d proper-place.co.uk -d www.proper-place.co.uk --non-interactive --agree-tos -m admin@proper-place.co.uk --no-eff-email || true

# Final restart
systemctl restart nginx

echo -e "${GREEN}✅ Done!${NC}"
echo ""
echo "Website: https://proper-place.co.uk"
echo "Check status: docker ps"
