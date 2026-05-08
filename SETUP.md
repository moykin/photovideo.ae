# PhotoVideo.ae — Setup Guide

## Architecture

```
photovideo.ae/
├── backend/          # Strapi v5 (API + CMS)
├── frontend/         # Next.js 15 (UI)
├── infrastructure/
│   ├── nginx/        # Nginx config
│   ├── scripts/      # Setup & deploy scripts
│   └── pm2.ecosystem.config.js
├── docker-compose.yml  # Local development
└── Makefile
```

**Stack:**
- Backend: Strapi v5 + PostgreSQL
- Frontend: Next.js 15 + TypeScript + Tailwind CSS
- Storage: AWS S3 (ap-south-1)
- CDN: AWS CloudFront → cdn.photovideo.ae
- Server: EC2 t3.small (13.203.13.189)
- Process Manager: PM2

## Step 1: Local Development

```bash
# Clone repo
git clone <repo> /var/www/photovideo
cd /var/www/photovideo

# Setup environment files
make setup-backend-env   # creates backend/.env
make setup-frontend-env  # creates frontend/.env.local

# Edit backend/.env - fill in:
#   APP_KEYS, JWT_SECRET, ADMIN_JWT_SECRET, etc.
# Edit frontend/.env.local - fill in:
#   NEXTAUTH_SECRET

# Start everything with Docker
make dev
```

Open **http://localhost:1337/admin** → create first Strapi admin account.

## Step 2: AWS Infrastructure

```bash
# Configure AWS CLI with your credentials
aws configure

# Run setup script (creates S3 bucket + CloudFront + IAM user)
make setup-aws
```

Add generated AWS keys to `backend/.env`.

**DNS Records to add in your domain registrar:**
```
A     photovideo.ae         → 13.203.13.189
A     www.photovideo.ae     → 13.203.13.189
A     api.photovideo.ae     → 13.203.13.189
CNAME cdn.photovideo.ae     → <cloudfront-domain>.cloudfront.net
```

## Step 3: Server Setup (first time)

```bash
# SSH into EC2
ssh -i photovideo-pem/your-key.pem ubuntu@13.203.13.189

# Clone repo
git clone <repo> /var/www/photovideo

# Run server setup (installs Node, Nginx, PostgreSQL, SSL)
sudo bash /var/www/photovideo/infrastructure/scripts/setup-server.sh
```

## Step 4: Production Deploy

```bash
# On the server:
cd /var/www/photovideo
cp backend/.env.example backend/.env    # fill in production values
cp frontend/.env.example frontend/.env.local  # fill in production values
bash infrastructure/scripts/deploy.sh
```

## Strapi Content Types

| Type | Description |
|------|-------------|
| **User** (extended) | Profiles for photographers, videographers, clients |
| **Portfolio** | Photo/video portfolio items |
| **FeedPost** | Social feed posts (like Instagram) |
| **Article** | Blog and news |
| **Booking** | Booking requests and management |
| **Review** | Client reviews for completed bookings |

## Key URLs

| Service | URL |
|---------|-----|
| Frontend | https://photovideo.ae |
| Strapi API | https://api.photovideo.ae/api |
| Strapi Admin | https://api.photovideo.ae/admin |
| CDN | https://cdn.photovideo.ae |

## Strapi Permissions to Configure

In Strapi Admin → Settings → Users & Permissions → Roles → Public:
- Article: find, findOne
- Portfolio: find, findOne
- FeedPost: find, findOne
- User: find, findOne

In Authenticated role:
- All the above + create, update (own)
- Booking: create, find, findOne, updateStatus
- FeedPost: create, update, delete, like
- Portfolio: create, update, delete
- Review: create

## Environment Variables Checklist

### backend/.env
- [ ] APP_KEYS (4 random strings, comma-separated)
- [ ] JWT_SECRET
- [ ] ADMIN_JWT_SECRET
- [ ] API_TOKEN_SALT
- [ ] TRANSFER_TOKEN_SALT
- [ ] DATABASE_PASSWORD
- [ ] AWS_ACCESS_KEY_ID
- [ ] AWS_SECRET_ACCESS_KEY
- [ ] AWS_BUCKET
- [ ] CDN_URL
- [ ] SMTP_USER / SMTP_PASS (for email notifications)

### frontend/.env.local
- [ ] NEXT_PUBLIC_STRAPI_URL (https://api.photovideo.ae)
- [ ] NEXT_PUBLIC_CDN_URL (https://cdn.photovideo.ae)
- [ ] NEXTAUTH_SECRET
- [ ] NEXT_PUBLIC_SITE_URL
