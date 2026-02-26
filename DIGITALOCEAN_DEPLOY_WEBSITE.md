# Proper Place - DigitalOcean Deployment Guide

## Overview
This guide deploys the Proper Place platform (backend + website) to DigitalOcean using Docker and Nginx.

## Prerequisites
- DigitalOcean account and a droplet (Ubuntu 22.04 or later)
- Domain: `proper-place.co.uk`
- SSH access to your droplet
- Docker and Docker Compose installed on the droplet

## Step 1: Prepare Your Droplet

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Update system packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
apt install -y nginx certbot python3-certbot-nginx

# Install Node.js (for PM2)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
npm install -g pm2
```

## Step 2: Deploy the Application

```bash
# Clone or upload your repository to the droplet
cd /var/www
git clone YOUR_REPO_URL proper-place
cd proper-place

# Create environment file for backend
cat > .env.production << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://doadmin:AVNS_h5gAks_XqiZhRqSOX1T@db-postgresql-lon1-38562-properplace-do-user-33237375-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require
API_URL=https://proper-place.co.uk/api
CORS_ORIGIN=https://proper-place.co.uk
EOF

# Build and start with Docker Compose
docker-compose -f docker-compose.prod.yml up -d --build
```

## Step 3: Configure Nginx

```bash
# Copy Nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/proper-place
sudo ln -s /etc/nginx/sites-available/proper-place /etc/nginx/sites-enabled/proper-place

# Remove default config to avoid conflicts
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Step 4: Setup SSL Certificate with Let's Encrypt

```bash
# Generate SSL certificate
sudo certbot certonly --nginx -d proper-place.co.uk -d www.proper-place.co.uk

# Auto-renewal setup (should be automatic with Ubuntu)
sudo systemctl status certbot.timer
```

## Step 5: Point Your Domain to DigitalOcean

In your domain registrar (where you bought proper-place.co.uk):

1. Update the **A Record** to point to your DigitalOcean droplet IP:
   - Type: A
   - Name: @
   - Value: YOUR_DROPLET_IP
   - TTL: 3600

2. Also create a CNAME for www (optional):
   - Type: CNAME
   - Name: www
   - Value: proper-place.co.uk
   - TTL: 3600

**DNS changes may take 24-48 hours to propagate.**

## Step 6: Verify Deployment

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f website
docker-compose -f docker-compose.prod.yml logs -f backend

# Test the website
curl https://proper-place.co.uk
```

## Monitoring & Maintenance

### View Application Logs
```bash
docker-compose -f docker-compose.prod.yml logs website
docker-compose -f docker-compose.prod.yml logs backend
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart website
docker-compose -f docker-compose.prod.yml restart backend
```

### Update Application
```bash
cd /var/www/proper-place
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

### Check Disk Usage
```bash
docker system df
docker image prune -a  # Clean up unused images
```

## Troubleshooting

### Website not loading
```bash
# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check container health
docker-compose -f docker-compose.prod.yml logs website

# Verify DNS propagation
dig proper-place.co.uk
```

### Backend API not responding
```bash
# Check backend container
docker-compose -f docker-compose.prod.yml logs backend

# Verify database connection
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

### SSL Certificate Issues
```bash
# Renew certificate manually
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

### Port Already in Use
```bash
# Find process using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Kill if necessary
sudo kill -9 PID
```

## Production Checklist

- [ ] Domain pointing to DigitalOcean IP
- [ ] SSL certificate installed and working
- [ ] Backend database connection verified
- [ ] Website loading at https://proper-place.co.uk
- [ ] API endpoints accessible at /api
- [ ] Forms submitting and creating database records
- [ ] Email notifications configured (if applicable)
- [ ] Backups configured for database
- [ ] Monitoring/alerting set up
- [ ] CDN configured for static assets (optional)

## Automatic Backups

```bash
# Create a backup script
cat > /usr/local/bin/backup-proper-place.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/proper-place"
mkdir -p $BACKUP_DIR
docker-compose -f /var/www/proper-place/docker-compose.prod.yml exec -T db pg_dump | gzip > $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql.gz
# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-proper-place.sh

# Add to crontab for daily backups
0 2 * * * /usr/local/bin/backup-proper-place.sh
```

## Support

For issues with DigitalOcean, see: https://docs.digitalocean.com/
For Next.js deployment: https://nextjs.org/docs/deployment
For Node.js backend: https://nodejs.org/docs/
