#!/bin/bash

################################################################################
# Quick Deployment - Proper Place Website
# Minimal script for one-step deployment
################################################################################

DROPLET_IP="162.159.140.98"
DOMAIN="proper-place.co.uk"

echo "🚀 Starting Proper Place deployment to $DOMAIN ($DROPLET_IP)"
echo ""

# Make deploy.sh executable and run it
chmod +x deploy.sh
./deploy.sh $DROPLET_IP

echo ""
echo "📝 IMPORTANT: Update your domain registrar"
echo "   Set A record '@' → $DROPLET_IP"
echo ""
echo "⏳ DNS may take 24-48 hours to propagate"
echo "✅ After that, visit: https://$DOMAIN"
