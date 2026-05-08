#!/bin/bash
# Run this ONCE on a fresh EC2 instance (Ubuntu 22.04)
set -e

echo "==> Installing Docker..."
apt-get update -q
apt-get install -y ca-certificates curl gnupg git nginx certbot python3-certbot-nginx

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -q
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
usermod -aG docker ubuntu
systemctl enable docker

echo "==> Cloning repo..."
mkdir -p /home/ubuntu
cd /home/ubuntu
git clone https://github.com/YOUR_GITHUB_USERNAME/photovideo.ae.git
cd photovideo.ae

echo "==> Creating .env files (fill in the values!)..."
cat > backend/.env << 'ENVEOF'
DATABASE_CLIENT=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=photovideo
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=CHANGE_ME_STRONG_PASSWORD
NODE_ENV=production
APP_KEYS=CHANGE_ME_1,CHANGE_ME_2,CHANGE_ME_3,CHANGE_ME_4
API_TOKEN_SALT=CHANGE_ME
ADMIN_JWT_SECRET=CHANGE_ME
JWT_SECRET=CHANGE_ME
TRANSFER_TOKEN_SALT=CHANGE_ME
ENVEOF

cat > frontend/.env.production << 'ENVEOF'
NEXT_PUBLIC_STRAPI_URL=https://api.photovideo.ae
NEXT_PUBLIC_SITE_URL=https://photovideo.ae
NEXTAUTH_URL=https://photovideo.ae
NEXTAUTH_SECRET=CHANGE_ME_MIN_32_CHARS
ENVEOF

cat > tools/.env << 'ENVEOF'
GOOGLE_CLIENT_ID=CHANGE_ME
GOOGLE_CLIENT_SECRET=CHANGE_ME
REDIRECT_URI=https://photovideo.ae/download/auth/callback
ROOT_PATH=/download
SECRET_KEY=CHANGE_ME_RANDOM_32_CHARS
ENVEOF

echo "==> Setting up nginx..."
cp infrastructure/nginx/photovideo.ae.conf /etc/nginx/sites-available/photovideo.ae
ln -sf /etc/nginx/sites-available/photovideo.ae /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "==> Getting SSL certificate..."
# Run certbot to get SSL first (nginx needs plain HTTP initially):
# certbot --nginx -d photovideo.ae -d www.photovideo.ae -d api.photovideo.ae -d tools.photovideo.ae

echo ""
echo "============================================"
echo "  NEXT STEPS:"
echo "  1. Edit backend/.env, frontend/.env.production, tools/.env"
echo "  2. Run: certbot --nginx -d photovideo.ae -d www.photovideo.ae -d api.photovideo.ae -d tools.photovideo.ae"
echo "  3. Run: docker compose -f docker-compose.prod.yml up --build -d"
echo "  4. Run: nginx -t && systemctl reload nginx"
echo "============================================"
