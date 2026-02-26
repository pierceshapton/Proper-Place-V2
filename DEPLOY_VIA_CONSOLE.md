# Deploy Website via DigitalOcean Console

Since SSH isn't available, we'll deploy through DigitalOcean's web console.

## Step 1: Access DigitalOcean Console

1. Go to [DigitalOcean Dashboard](https://cloud.digitalocean.com)
2. Click on your droplet (162.159.140.98)
3. Click **"Console"** button (top right)
4. Wait for console to load - you'll see a terminal window

## Step 2: Run Deployment Script

Copy the entire script below and paste it into the console. It will:
- Download your website code
- Build Docker containers
- Configure Nginx
- Set up SSL certificates

```bash
#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Deploying Proper Place Website${NC}"

# Step 1: Update system
echo -e "${GREEN}[1/5] Updating system...${NC}"
apt-get update > /dev/null 2>&1
apt-get upgrade -y > /dev/null 2>&1

# Step 2: Install Docker if needed
echo -e "${GREEN}[2/5] Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
else
  echo "Docker already installed"
fi

# Step 3: Create deployment directory
echo -e "${GREEN}[3/5] Setting up directories...${NC}"
mkdir -p /var/www/proper-place
cd /var/www/proper-place

# Step 4: Clone repository
echo -e "${GREEN}[4/5] Downloading website code...${NC}"
if [ -d ".git" ]; then
  git pull origin main
else
  git clone https://github.com/pierceshaptonproperplace/Proper-Place-V2.git .
fi

# Step 5: Create environment file
echo -e "${GREEN}[5/5] Configuring environment...${NC}"
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://proper-place.co.uk/api
DATABASE_URL=postgresql://doadmin:AVNS_h5gAks_XqiZhRqSOX1T@db-postgresql-lon1-38562-properplace-do-user-33237375-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require
NODE_ENV=production
EOF

# Step 6: Pull backend services
echo -e "${YELLOW}Starting Docker containers...${NC}"
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Step 7: Configure Nginx & SSL
echo -e "${YELLOW}Configuring Nginx...${NC}"
cp nginx.conf /etc/nginx/sites-available/proper-place.conf
ln -sf /etc/nginx/sites-available/proper-place.conf /etc/nginx/sites-enabled/

# Test Nginx config
nginx -t

# Step 8: Get SSL certificate
echo -e "${YELLOW}Obtaining SSL certificate...${NC}"
apt-get install -y certbot python3-certbot-nginx > /dev/null 2>&1
certbot certonly --standalone -d proper-place.co.uk -d www.proper-place.co.uk --non-interactive --agree-tos -m admin@proper-place.co.uk || true

# Step 9: Reload Nginx
systemctl restart nginx
systemctl enable nginx

# Done
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Website URL: https://proper-place.co.uk"
echo "Status: docker-compose -f /var/www/proper-place/docker-compose.prod.yml ps"
echo ""
```

## Step 3: Wait for Deployment

The script will take 2-5 minutes to complete. Watch for:
- ✅ at the end means **success**
- Any error messages - take a screenshot and share

## Step 4: Verify Deployment

Once complete, run these commands in the console to check status:

```bash
# Check Docker containers
docker ps

# Check Nginx status
systemctl status nginx

# Check SSL certificate
ls -la /etc/letsencrypt/live/proper-place.co.uk/
```

## Step 5: Wait for DNS Propagation

Once running:
1. DNS needs 24-48 hours to propagate
2. You can check progress at: https://whatsmydns.net/?domain=proper-place.co.uk
3. Once DNS resolves, visit: https://proper-place.co.uk

## Troubleshooting

**If Docker fails:**
```bash
docker logs website
docker logs backend
```

**If Nginx fails:**
```bash
nginx -t
cat /var/log/nginx/error.log | tail -50
```

**If SSL fails:**
```bash
certbot renew --dry-run
```

**Restart everything:**
```bash
cd /var/www/proper-place
docker-compose -f docker-compose.prod.yml restart
systemctl restart nginx
```
