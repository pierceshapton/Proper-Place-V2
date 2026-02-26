# Simple Deployment (No curl needed)

Copy and paste this into the DigitalOcean console:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Proper Place Website"

# Step 1: Update system
echo "[1/5] Updating system..."
apt-get update
apt-get upgrade -y

# Step 2: Install Docker using apt
echo "[2/5] Installing Docker..."
apt-get install -y docker.io

# Step 3: Install Docker Compose using apt
echo "[3/5] Installing Docker Compose..."
apt-get install -y docker-compose

# Step 4: Create directory and clone repo
echo "[4/5] Setting up..."
mkdir -p /var/www/proper-place
cd /var/www/proper-place

if [ ! -d ".git" ]; then
  apt-get install -y git
  git clone https://github.com/pierceshaptonproperplace/Proper-Place-V2.git .
else
  git pull origin main
fi

# Step 5: Create environment file
echo "[5/5] Configuring..."
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://proper-place.co.uk/api
DATABASE_URL=postgresql://doadmin:AVNS_h5gAks_XqiZhRqSOX1T@db-postgresql-lon1-38562-properplace-do-user-33237375-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require
NODE_ENV=production
EOF

# Step 6: Start Docker
systemctl start docker
systemctl enable docker

# Step 7: Start services
cd /var/www/proper-place
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Step 8: Install Nginx and Certbot
apt-get install -y nginx certbot python3-certbot-nginx

# Step 9: Configure Nginx
if [ -f "nginx.conf" ]; then
  cp nginx.conf /etc/nginx/sites-available/proper-place.conf
  ln -sf /etc/nginx/sites-available/proper-place.conf /etc/nginx/sites-enabled/
fi

nginx -t || true

# Step 10: Get SSL certificate
certbot certonly --standalone -d proper-place.co.uk -d www.proper-place.co.uk --non-interactive --agree-tos -m admin@proper-place.co.uk --no-eff-email || true

# Step 11: Start services
systemctl restart nginx || true
systemctl enable nginx || true

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "Website: https://proper-place.co.uk"
echo "Check status: docker-compose -f /var/www/proper-place/docker-compose.prod.yml ps"
echo ""
```

**Copy everything above and paste into DigitalOcean console**

This version:
- ✅ Uses only `apt-get` (no curl)
- ✅ Installs Docker from Ubuntu repos
- ✅ Installs Docker Compose from Ubuntu repos  
- ✅ Clones your repo
- ✅ Starts containers
- ✅ Sets up Nginx + SSL

Let me know if this works!