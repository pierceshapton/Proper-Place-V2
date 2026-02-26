# Quick Deployment Checklist for proper-place.co.uk

## Before Deployment

- [ ] Code committed and pushed to Git
- [ ] Environment variables configured for production
- [ ] SSL certificate ready (Let's Encrypt will be set up)
- [ ] Database backups configured
- [ ] DigitalOcean droplet IP noted

## Deployment Steps (Quick Reference)

### 1. SSH to Droplet
```bash
ssh root@YOUR_DROPLET_IP
```

### 2. Setup Infrastructure (First Time Only)
```bash
# All in one (from droplet)
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
apt install -y nginx certbot python3-certbot-nginx nodejs npm
npm install -g pm2
```

### 3. Deploy Application
```bash
cd /var/www
git clone <your-repo> proper-place
cd proper-place

# Create .env for backend
cat > .env.production << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://doadmin:AVNS_h5gAks_XqiZhRqSOX1T@db-postgresql-lon1-38562-properplace-do-user-33237375-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require
EOF

# Start with Docker Compose
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4. Setup Nginx & SSL
```bash
sudo cp nginx.conf /etc/nginx/sites-available/proper-place
sudo ln -s /etc/nginx/sites-available/proper-place /etc/nginx/sites-enabled/proper-place
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Get SSL Certificate
sudo certbot certonly --nginx -d proper-place.co.uk -d www.proper-place.co.uk
```

### 5. Point Domain
In your domain registrar (GoDaddy, Namecheap, etc.):
- Update A record: @ → YOUR_DROPLET_IP

## After Deployment

- Wait 24-48 hours for DNS propagation
- Visit https://proper-place.co.uk
- Test the contact form
- Check backend API at https://proper-place.co.uk/api/auth/ping
- Monitor logs: `docker-compose -f docker-compose.prod.yml logs -f`

## Key URLs

- Website: https://proper-place.co.uk
- API: https://proper-place.co.uk/api
- Admin: https://proper-place.co.uk/admin (add later)

## Common Commands

```bash
# View status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f website
docker-compose -f docker-compose.prod.yml logs -f backend

# Restart services
docker-compose -f docker-compose.prod.yml restart website

# Update code
git pull
docker-compose -f docker-compose.prod.yml up -d --build

# Check SSL certificate expiry
sudo certbot certificates
```

## Emergency Commands

```bash
# Stop everything
docker-compose -f docker-compose.prod.yml down

# Start everything
docker-compose -f docker-compose.prod.yml up -d

# Full restart
docker-compose -f docker-compose.prod.yml restart

# Clean up old images
docker image prune -a
```

---

**For detailed guide, see:** [DIGITALOCEAN_DEPLOY_WEBSITE.md](./DIGITALOCEAN_DEPLOY_WEBSITE.md)
