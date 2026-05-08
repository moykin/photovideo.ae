#!/bin/bash
# ============================================================
# PhotoVideo.ae — Deploy Script
# Run from /var/www/photovideo after pulling latest code
# ============================================================
set -euo pipefail

APP_DIR="/var/www/photovideo"
cd $APP_DIR

echo "→ Pulling latest code..."
git pull origin main

echo "→ Installing backend dependencies..."
cd $APP_DIR/backend
npm ci --omit=dev
npm run build

echo "→ Installing frontend dependencies..."
cd $APP_DIR/frontend
npm ci
npm run build

echo "→ Restarting services with PM2..."
pm2 reload photovideo-backend --update-env 2>/dev/null || \
    pm2 start --name photovideo-backend npm -- start

pm2 reload photovideo-frontend --update-env 2>/dev/null || \
    pm2 start --name photovideo-frontend npm -- start

pm2 save

echo "→ Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment complete!"
pm2 status
