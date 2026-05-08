<div align="center">

<img src="https://photovideo.ae/favicon.ico" width="64" height="64" alt="PhotoVideo.ae">

# PhotoVideo.ae

**UAE's Creative Marketplace + Multi-Platform Video Downloader**

[![Live Site](https://img.shields.io/badge/🌐_Live-photovideo.ae-4f8ef7?style=for-the-badge)](https://photovideo.ae)
[![YT Downloader](https://img.shields.io/badge/▶_Downloader-photovideo.ae%2Fdownload-ff4444?style=for-the-badge)](https://photovideo.ae/download)
[![Deploy](https://github.com/moykin/photovideo.ae/actions/workflows/deploy.yml/badge.svg)](https://github.com/moykin/photovideo.ae/actions)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_15-000000?logo=nextdotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![Strapi](https://img.shields.io/badge/Strapi-4945FF?logo=strapi&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

</div>

---

## 🌍 Live

| Service | URL |
|---|---|
| 📸 Main Marketplace | [photovideo.ae](https://photovideo.ae) |
| ▶ Video Downloader | [photovideo.ae/download](https://photovideo.ae/download) |
| 🔧 API (Strapi) | [api.photovideo.ae](https://api.photovideo.ae) |

---

## 📸 Screenshots

### Main Marketplace
![PhotoVideo.ae Homepage](https://photovideo.ae/og-image.jpg)

### Video Downloader
> `photovideo.ae/download` — download from YouTube, Instagram, TikTok & 1000+ sites

---

## ✨ Features

### 📸 PhotoVideo.ae — Creative Marketplace
- Browse & book **photographers and videographers** in UAE (Dubai, Abu Dhabi, etc.)
- **Portfolio showcase** with photo & video galleries
- **Review & rating** system
- **OAuth** login via Google / Facebook / Apple
- **Blog & articles** with SEO optimization
- **Feed** with masonry layout for creative work
- **Multi-currency** booking system

### ▶ Video Downloader (`/download`)
- Download from **YouTube, Instagram Reels, TikTok** and 1000+ sites
- Save directly to **Google Drive** — no local storage needed
- **HD & 4K** quality, MP4 format
- Download history per session
- **7 languages**: English, Hindi, 中文, العربية, Español, Deutsch, Français
- SEO-optimized article pages for every language
- No registration required

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, React Hook Form, Zod |
| **Backend CMS** | Strapi 5, Node.js, PostgreSQL |
| **Video Tool** | Python, FastAPI, yt-dlp, Google Drive API |
| **Infrastructure** | Docker, Docker Compose, Nginx, AWS EC2 (Mumbai) |
| **CI/CD** | GitHub Actions → SSH deploy |
| **DNS / CDN** | Cloudflare |
| **Media Storage** | AWS S3 + CloudFront CDN |

---

## 🗂 Project Structure

```
photovideo.ae/
├── frontend/          # Next.js 15 app
│   ├── app/           # Pages (App Router)
│   ├── components/    # UI components
│   └── lib/           # API, auth, types
├── backend/           # Strapi 5 CMS
├── tools/             # Video Downloader (FastAPI + yt-dlp)
│   └── app/
│       ├── main.py    # FastAPI app
│       └── static/    # Frontend HTML (7 languages)
├── infrastructure/    # Nginx config, server setup
├── docker-compose.yml            # Development
└── docker-compose.prod.yml       # Production
```

---

## 🚀 Deploy

Push to `main` → GitHub Actions automatically deploys to EC2:

```bash
git add .
git commit -m "your changes"
git push
```

### Manual local run

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose up --build
```

---

## 🌐 Languages / 多语言 / متعدد اللغات

<details>
<summary><b>🇮🇳 हिन्दी</b></summary>

### PhotoVideo.ae — UAE का क्रिएटिव मार्केटप्लेस

UAE (दुबई, अबू धाबी) में पेशेवर फोटोग्राफर और वीडियोग्राफर खोजें और बुक करें।

**मुख्य सुविधाएं:**
- पोर्टफोलियो ब्राउज़ करें और तुरंत बुकिंग करें
- Google, Facebook, Apple से OAuth लॉगिन
- समीक्षा और रेटिंग सिस्टम

**वीडियो डाउनलोडर** ([photovideo.ae/download](https://photovideo.ae/download)):
- YouTube, Instagram और TikTok से वीडियो डाउनलोड करें
- सीधे Google Drive में सेव करें — HD और 4K क्वालिटी
- बिना रजिस्ट्रेशन, बिल्कुल मुफ्त

</details>

<details>
<summary><b>🇨🇳 中文</b></summary>

### PhotoVideo.ae — 阿联酋创意市场

在阿联酋（迪拜、阿布扎比）寻找并预约专业摄影师和摄像师。

**主要功能：**
- 浏览作品集，即时预约
- 支持Google、Facebook、Apple登录
- 评价和评分系统

**视频下载器** ([photovideo.ae/download](https://photovideo.ae/download))：
- 从YouTube、Instagram、TikTok下载视频
- 直接保存到Google Drive，支持HD和4K画质
- 无需注册，完全免费

</details>

<details>
<summary><b>🇸🇦 العربية</b></summary>

### PhotoVideo.ae — سوق الإبداع في الإمارات

ابحث عن مصورين ومصوري فيديو محترفين في الإمارات (دبي، أبوظبي) واحجز معهم.

**المميزات الرئيسية:**
- تصفح أعمال المصورين واحجز فوراً
- تسجيل الدخول عبر Google وFacebook وApple
- نظام التقييمات والمراجعات

**تحميل الفيديو** ([photovideo.ae/download](https://photovideo.ae/download)):
- تحميل مقاطع من يوتيوب وإنستغرام وتيك توك
- حفظ مباشر في Google Drive — جودة HD و4K
- بدون تسجيل، مجاناً تماماً

</details>

<details>
<summary><b>🇪🇸 Español</b></summary>

### PhotoVideo.ae — Mercado creativo de los Emiratos Árabes Unidos

Encuentra y reserva fotógrafos y videógrafos profesionales en los EAU (Dubái, Abu Dabi).

**Características principales:**
- Explora portfolios y reserva al instante
- Login con Google, Facebook y Apple
- Sistema de reseñas y valoraciones

**Descargador de vídeos** ([photovideo.ae/download](https://photovideo.ae/download)):
- Descarga vídeos de YouTube, Instagram y TikTok
- Guarda directamente en Google Drive — calidad HD y 4K
- Sin registro, completamente gratis

</details>

<details>
<summary><b>🇩🇪 Deutsch</b></summary>

### PhotoVideo.ae — Kreativer Marktplatz der Vereinigten Arabischen Emirate

Finde und buche professionelle Fotografen und Videografen in den VAE (Dubai, Abu Dhabi).

**Hauptfunktionen:**
- Portfolios durchsuchen und sofort buchen
- Login mit Google, Facebook und Apple
- Bewertungs- und Rezensionssystem

**Video-Downloader** ([photovideo.ae/download](https://photovideo.ae/download)):
- Videos von YouTube, Instagram und TikTok herunterladen
- Direkt in Google Drive speichern — HD- und 4K-Qualität
- Ohne Registrierung, völlig kostenlos

</details>

<details>
<summary><b>🇫🇷 Français</b></summary>

### PhotoVideo.ae — Marché créatif des Émirats Arabes Unis

Trouvez et réservez des photographes et vidéastes professionnels aux EAU (Dubaï, Abou Dabi).

**Fonctionnalités principales :**
- Parcourez les portfolios et réservez instantanément
- Connexion via Google, Facebook et Apple
- Système d'avis et de notes

**Téléchargeur vidéo** ([photovideo.ae/download](https://photovideo.ae/download)) :
- Téléchargez des vidéos depuis YouTube, Instagram et TikTok
- Sauvegardez directement dans Google Drive — qualité HD et 4K
- Sans inscription, entièrement gratuit

</details>

---

## 📄 Legal

- [Privacy Policy](https://photovideo.ae/privacy)
- [Terms of Service](https://photovideo.ae/terms)

---

<div align="center">

Made with ❤️ for UAE's creative community

**[photovideo.ae](https://photovideo.ae)**

</div>
