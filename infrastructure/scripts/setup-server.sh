#!/bin/bash
# ============================================================
# PhotoVideo.ae — Initial EC2 Server Setup
# Run as: sudo bash setup-server.sh
# EC2: t3.small, Ubuntu 24.04, ap-south-1 (Mumbai)
# ============================================================
set -euo pipefail

DOMAIN="photovideo.ae"
APP_USER="ubuntu"
APP_DIR="/var/www/photovideo"
NODE_VERSION="20"

echo "╔══════════════════════════════════════╗"
echo "║   PhotoVideo.ae Server Setup         ║"
echo "╚══════════════════════════════════════╝"

# ── System update ────────────────────────────────────────────
echo "→ Updating system..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git build-essential python3 gcc g++ make unzip \
    nginx certbot python3-certbot-nginx ufw htop ncdu

# ── Swap (important for t3.small with 2GB RAM) ──────────────
if [ ! -f /swapfile ]; then
    echo "→ Creating 2GB swap..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# ── Node.js ──────────────────────────────────────────────────
echo "→ Installing Node.js $NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs
npm install -g pm2 npm@latest

# ── PostgreSQL ───────────────────────────────────────────────
echo "→ Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

DB_NAME="photovideo"
DB_USER="strapi"
DB_PASS=$(openssl rand -hex 24)

sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
EOF

echo "→ PostgreSQL: DB=$DB_NAME USER=$DB_USER PASS=$DB_PASS"
echo "⚠️  Save this password! It will be needed for .env setup."

# ── Nginx setup ──────────────────────────────────────────────
echo "→ Configuring Nginx..."
mkdir -p /var/cache/nginx/strapi /var/cache/nginx/next
chown -R www-data:www-data /var/cache/nginx

cp "$APP_DIR/infrastructure/nginx/photovideo.ae.conf" /etc/nginx/conf.d/${DOMAIN}.conf
nginx -t && systemctl reload nginx

# ── Firewall ─────────────────────────────────────────────────
echo "→ Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── Certbot SSL ──────────────────────────────────────────────
echo "→ Setting up SSL certificates..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN \
    --non-interactive --agree-tos \
    -m "admin@$DOMAIN" \
    --redirect

# Auto-renew cron
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# ── App directory ────────────────────────────────────────────
echo "→ Setting up app directory..."
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

# ── PM2 startup ──────────────────────────────────────────────
echo "→ Configuring PM2 auto-start..."
env PATH=$PATH:/usr/bin pm2 startup systemd -u $APP_USER --hp /home/$APP_USER
systemctl enable pm2-$APP_USER

# ── Nginx perf tuning ────────────────────────────────────────
cat > /etc/nginx/conf.d/performance.conf <<'NGINX'
# Worker connections
events { worker_connections 1024; }

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_comp_level 6;
}
NGINX

echo ""
echo "════════════════════════════════════════"
echo "✅ Server setup complete!"
echo ""
echo "PostgreSQL credentials saved above ↑"
echo "Next steps:"
echo "  1. Clone your repo to $APP_DIR"
echo "  2. Copy .env.example → .env in backend/ and frontend/"
echo "  3. Fill in DB_PASSWORD=$DB_PASS"
echo "  4. Run: bash infrastructure/scripts/deploy.sh"
echo "════════════════════════════════════════"
