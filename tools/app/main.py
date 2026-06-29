import asyncio
import os
import json
import random
import re
import secrets
import threading
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request, BackgroundTasks, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
import google.oauth2.credentials
from google.auth.transport.requests import Request as GoogleRequest
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

app = FastAPI(root_path=os.environ.get("ROOT_PATH", ""))

# ── OG Image generator ────────────────────────────────────────────────────────

def _generate_og_image() -> bytes:
    from PIL import Image, ImageDraw, ImageFont
    import io

    W, H = 1200, 630
    img = Image.new("RGB", (W, H), "#0d0f18")
    draw = ImageDraw.Draw(img)

    # Gradient-like accent bar on top
    for i in range(6):
        draw.rectangle([(0, i), (W, i + 1)],
                       fill=f"#{max(0,79-i*5):02x}{max(0,142-i*5):02x}{min(255,247):02x}")

    # Left glow blob
    for r in range(200, 0, -4):
        alpha = int(18 * (1 - r / 200))
        draw.ellipse([(-r + 180, H // 2 - r), (180 + r, H // 2 + r)],
                     fill=(79, 142, 247, alpha))

    # Right glow blob
    for r in range(160, 0, -4):
        alpha = int(14 * (1 - r / 160))
        draw.ellipse([(W - 180 - r, 80 - r), (W - 180 + r, 80 + r)],
                     fill=(255, 68, 68, alpha))

    # Font setup
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    font_bold_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    try:
        font_huge  = ImageFont.truetype(font_bold_path, 72)
        font_large = ImageFont.truetype(font_bold_path, 44)
        font_med   = ImageFont.truetype(font_path, 30)
        font_small = ImageFont.truetype(font_path, 24)
        font_xs    = ImageFont.truetype(font_path, 20)
    except Exception:
        font_huge = font_large = font_med = font_small = font_xs = ImageFont.load_default()

    # ▶ icon circle
    draw.ellipse([(60, 60), (140, 140)], fill="#4f8ef7")
    draw.polygon([(92, 82), (92, 118), (128, 100)], fill="white")

    # Site name
    draw.text((160, 72), "photovideo.ae", font=font_med, fill="#7a82a0")

    # Main title
    draw.text((60, 170), "Video", font=font_huge, fill="#e2e6f3")
    draw.text((60, 255), "Downloader", font=font_huge, fill="#4f8ef7")

    # Subtitle
    draw.text((60, 365), "YouTube · Instagram · TikTok", font=font_large, fill="#c8cde0")
    draw.text((60, 420), "and 1000+ other sites", font=font_med, fill="#7a82a0")

    # Feature pills
    pills = [("✓ Free", "#1a3a1a", "#34c77b"), ("✓ HD & 4K", "#1a2a3a", "#4f8ef7"), ("✓ Google Drive", "#2a1a2a", "#a855f7")]
    px = 60
    for label, bg, fg in pills:
        bbox = draw.textbbox((0, 0), label, font=font_small)
        pw = bbox[2] - bbox[0] + 32
        draw.rounded_rectangle([(px, 490), (px + pw, 530)], radius=20, fill=bg, outline=fg, width=1)
        draw.text((px + 16, 494), label, font=font_small, fill=fg)
        px += pw + 14

    # Right side: platform cards
    cards = [
        ("▶  YouTube",  "#ff4444", "#1a0a0a"),
        ("📷  Instagram", "#e1306c", "#1a0a12"),
        ("♪  TikTok",    "#69c9d0", "#0a1a1a"),
    ]
    cx, cy = 820, 200
    for label, fg, bg in cards:
        draw.rounded_rectangle([(cx, cy), (cx + 300, cy + 72)], radius=16, fill=bg, outline=fg, width=1)
        draw.text((cx + 24, cy + 18), label, font=font_large, fill=fg)
        cy += 96

    # Bottom URL
    draw.text((60, 580), "photovideo.ae/download", font=font_xs, fill="#4a5068")

    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get("SECRET_KEY", secrets.token_hex(32)),
    max_age=86400 * 7,
)
app.mount("/static", StaticFiles(directory="static"), name="static")

CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI = os.environ.get("REDIRECT_URI", "http://localhost:8080/auth/callback")
SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]

DOWNLOADS_DIR = Path("/tmp/yt2gdrive")
DOWNLOADS_DIR.mkdir(exist_ok=True)

HISTORY_FILE = DOWNLOADS_DIR / "history.json"
_history: dict[str, list] = {}
try:
    if HISTORY_FILE.exists():
        _history = json.loads(HISTORY_FILE.read_text())
except Exception:
    pass


def _save_history(key: str, entry: dict):
    if not key:
        return
    _history.setdefault(key, [])
    _history[key] = [e for e in _history[key] if e.get("job_id") != entry["job_id"]]
    _history[key].insert(0, entry)
    _history[key] = _history[key][:50]
    try:
        HISTORY_FILE.write_text(json.dumps(_history))
    except Exception:
        pass


_sessions: dict[str, dict] = {}
jobs: dict[str, dict] = {}


def _cleanup_worker():
    while True:
        time.sleep(600)
        cutoff = time.time() - 7200
        for job_id, job in list(jobs.items()):
            if job.get("created_at", 0) < cutoff:
                filepath = job.get("filepath")
                if filepath:
                    try:
                        Path(filepath).unlink(missing_ok=True)
                        Path(filepath).parent.rmdir()
                    except Exception:
                        pass
                jobs.pop(job_id, None)


threading.Thread(target=_cleanup_worker, daemon=True).start()


def _make_flow() -> Flow:
    return Flow.from_client_config(
        {
            "web": {
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )


def _get_session(request: Request) -> Optional[dict]:
    sid = request.session.get("sid")
    return _sessions.get(sid) if sid else None


def _creds(data: dict) -> google.oauth2.credentials.Credentials:
    return google.oauth2.credentials.Credentials(
        token=data["token"],
        refresh_token=data.get("refresh_token"),
        token_uri=data["token_uri"],
        client_id=data["client_id"],
        client_secret=data["client_secret"],
    )


def _refresh_if_needed(creds, data):
    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())
        data["token"] = creds.token


# ── Article data ─────────────────────────────────────────────────────────────

ARTICLE_SLUGS = {
    'guide-download': 'how-to-download-youtube-video',
    'guide-cloud': 'save-youtube-video-to-google-drive',
    'guide-device': 'download-youtube-videos-pc-mobile',
    'guide-tiktok': 'how-to-download-tiktok-video',
    'guide-instagram': 'how-to-download-instagram-video',
    'guide-other': 'download-videos-from-any-website',
    'guide-professionals': 'safe-video-downloader-for-media-professionals',
    'guide-shorts': 'how-to-download-youtube-shorts',
    'guide-mp3': 'youtube-to-mp3-audio-download',
    'guide-android': 'download-youtube-videos-android',
}
SLUG_TO_ID = {v: k for k, v in ARTICLE_SLUGS.items()}

ARTICLES: dict = {
  'en': [
    { 'id': 'guide-download',
      'title': 'How to Download a YouTube Video',
      'description': 'Step-by-step guide to downloading any YouTube video for free in HD quality.',
      'keywords': 'how to download youtube video, youtube video downloader, youtube to mp4 free',
      'body': '<p>Downloading YouTube videos is fast and free. Follow these steps:</p><ol><li>Find the YouTube video you want to save</li><li>Copy the URL from the browser address bar</li><li>Paste it into the field on the <a href="/download">main page</a></li><li>Select <strong>Download to Computer</strong> and click <strong>Download Now</strong></li><li>When processing is complete, click the <strong>Download</strong> button to save the MP4 file</li></ol><p>You can download tutorials, music videos, documentaries and more in the best available quality — up to HD and 4K. No software installation required.</p><h2>FAQ</h2><dl><dt>Is it free?</dt><dd>Yes — completely free with no limits.</dd><dt>What quality?</dt><dd>We automatically select the best format available, up to 4K.</dd><dt>Do I need an account?</dt><dd>No account needed to download files to your device.</dd></dl>'},
    { 'id': 'guide-cloud',
      'title': 'How to Save a YouTube Video to Google Drive',
      'description': 'Upload YouTube videos directly to Google Drive, no local storage required. Free and fast.',
      'keywords': 'save youtube to google drive, youtube google drive, upload youtube video to drive',
      'body': '<p>Our <strong>Save to Cloud</strong> feature lets you upload YouTube videos straight to Google Drive — without occupying space on your device.</p><h2>Steps</h2><ol><li>Paste the YouTube URL into the field on the <a href="/download">main page</a></li><li>Click the <strong>Save to Cloud</strong> tab</li><li>Connect your Google Drive account (one-time)</li><li>Optionally choose a destination folder</li><li>Click <strong>Save to Google Drive</strong></li></ol><p>The video is processed and uploaded automatically. You receive a direct Google Drive link when the upload is complete.</p><h2>Benefits</h2><dl><dt>No device storage used</dt><dd>The file goes straight to Drive — never touches your hard disk.</dd><dt>Access anywhere</dt><dd>Watch or share from any phone, tablet, or computer.</dd><dt>Organised library</dt><dd>Create folders in Google Drive and keep everything tidy.</dd></dl>'},
    { 'id': 'guide-device',
      'title': 'How to Download YouTube Videos to PC or Mobile Phone',
      'description': 'Save YouTube videos as MP4 files to Windows, Mac, iPhone or Android. Free, no software needed.',
      'keywords': 'download youtube video to pc, download youtube video mobile, youtube mp4 iphone android',
      'body': '<p>Saving YouTube videos to your device lets you watch them offline — on a flight, commute, or anywhere without internet.</p><h2>On a Computer (Windows, Mac, Linux)</h2><ol><li>Go to YouTube and open the video you want</li><li>Copy the URL from the browser address bar</li><li>Paste it into the field on the <a href="/download">main page</a></li><li>Click <strong>Download to Computer → Download Now</strong></li><li>When ready, click the <strong>Download</strong> button — the MP4 file saves to your Downloads folder</li></ol><h2>On Mobile (iPhone or Android)</h2><ol><li>Open the YouTube app and find your video</li><li>Tap <strong>Share → Copy link</strong></li><li>Open this page in your mobile browser</li><li>Paste the link and tap <strong>Download Now</strong></li><li>Tap <strong>Download</strong> and the video saves to your device</li></ol><p>The file is saved as an MP4, compatible with all media players. A typical 10-minute video takes about 30–60 seconds to process.</p>'},
    { 'id': 'guide-tiktok',
      'title': 'How to Download TikTok Videos Free — No Watermark',
      'description': 'Download any TikTok video to your phone or PC for free. Save TikTok clips without watermark in MP4. No app needed.',
      'keywords': 'download tiktok video, tiktok video downloader, tiktok no watermark, save tiktok mp4, tiktok downloader online',
      'body': '<p>Want to save a TikTok clip you loved? With <strong>YT2GDrive</strong> you can download any TikTok video for free — on desktop or mobile — in seconds.</p><h2>How to Download a TikTok Video</h2><ol><li>Open TikTok and find the video you want</li><li>Tap the <strong>Share</strong> button → <strong>Copy link</strong></li><li>Go to <a href="/download">photovideo.ae/download</a> and paste the link</li><li>Select <strong>Download to Computer</strong> and click <strong>Download Now</strong></li><li>When processing is complete, click <strong>Download</strong> to save the MP4 file</li></ol><h2>Save TikTok Videos to Google Drive</h2><p>You can also save TikTok videos directly to your Google Drive:</p><ol><li>Paste the TikTok link into the field</li><li>Switch to the <strong>Save to Cloud</strong> tab</li><li>Connect your Google Drive account and click <strong>Save to Google Drive</strong></li></ol><h2>Tips</h2><ul><li>Works with all public TikTok videos and Reels</li><li>Supports videos from the TikTok app and tiktok.com</li><li>Works on iPhone, Android, Windows and Mac</li></ul><h2>FAQ</h2><dl><dt>Is it free?</dt><dd>Yes — completely free, no account required.</dd><dt>Can I download private TikTok videos?</dt><dd>No — only public videos can be downloaded.</dd></dl>'},
    { 'id': 'guide-instagram',
      'title': 'How to Download Instagram Videos and Reels',
      'description': 'Save Instagram Reels, videos and Stories to your phone or PC for free. Works on mobile and desktop without any app.',
      'keywords': 'download instagram video, instagram reels downloader, save instagram reels, instagram video to mp4, instagram downloader',
      'body': '<p>Want to save Instagram Reels or videos to your device? <strong>YT2GDrive</strong> lets you download any public Instagram video for free — no app, no registration.</p><h2>How to Download Instagram Reels</h2><ol><li>Open Instagram and find the Reel or video</li><li>Tap the <strong>three dots (…)</strong> menu → <strong>Copy link</strong></li><li>Go to <a href="/download">photovideo.ae/download</a> and paste the link</li><li>Select <strong>Download to Computer</strong> and click <strong>Download Now</strong></li><li>Once ready, tap <strong>Download</strong> to save the MP4 file</li></ol><h2>Download from Instagram on Desktop</h2><ol><li>Open instagram.com and find the post</li><li>Click the <strong>three dots</strong> → <strong>Copy link</strong></li><li>Paste on <a href="/download">our downloader</a> and download</li></ol><h2>Save Instagram Videos to Google Drive</h2><p>Save Instagram videos directly to Google Drive:</p><ol><li>Paste the Instagram link</li><li>Switch to the <strong>Save to Cloud</strong> tab</li><li>Connect your Google account and click <strong>Save to Google Drive</strong></li></ol><h2>Supported Content</h2><ul><li>Reels (short vertical videos)</li><li>Regular posts with video</li><li>IGTV videos</li></ul><h2>FAQ</h2><dl><dt>Is it free?</dt><dd>Yes, completely free.</dd><dt>Can I download private Instagram posts?</dt><dd>No — only public profiles and posts are supported.</dd><dt>What format?</dt><dd>MP4, compatible with all devices and players.</dd></dl>'},
    { 'id': 'guide-other',
      'title': 'Download Videos from Any Website — Twitter, Facebook, Vimeo & More',
      'description': 'Download videos from 1000+ websites including Twitter/X, Facebook, Vimeo, Dailymotion, Reddit and more. Free online tool.',
      'keywords': 'download video from any website, online video downloader, twitter video download, facebook video download, vimeo downloader, dailymotion downloader',
      'body': '<p><strong>YT2GDrive</strong> supports over 1000 video-hosting websites. If there\'s a video online, chances are you can download it here — free, no software needed.</p><h2>Supported Platforms</h2><ul><li><strong>YouTube</strong> — all videos, Shorts, live streams</li><li><strong>Instagram</strong> — Reels, videos, IGTV</li><li><strong>TikTok</strong> — all public videos</li><li><strong>Twitter / X</strong> — embedded videos</li><li><strong>Facebook</strong> — public videos and Reels</li><li><strong>Vimeo</strong> — all public videos</li><li><strong>Dailymotion</strong> — all public videos</li><li><strong>Reddit</strong> — video posts</li><li><strong>Twitch</strong> — clips and VODs</li><li>And 1000+ more sites</li></ul><h2>How to Download</h2><ol><li>Find the video page on any website</li><li>Copy the full URL from the browser address bar</li><li>Go to <a href="/download">photovideo.ae/download</a> and paste the URL</li><li>Click <strong>Download Now</strong></li><li>When ready, save the MP4 file to your device</li></ol><h2>FAQ</h2><dl><dt>Does it work with any URL?</dt><dd>It works with most major video platforms. If a site is not supported, you\'ll see an error.</dd><dt>Is it free?</dt><dd>Yes, completely free for all 1000+ sites.</dd><dt>What video quality?</dt><dd>We download the best available quality for each platform.</dd></dl>'},
    { 'id': 'guide-professionals',
      'title': 'Safe Video Downloader for Journalists & Media Professionals',
      'description': 'Why journalists, documentary filmmakers and content researchers trust YT2GDrive over other tools. Google-verified, no malware, secure cloud workflow.',
      'keywords': 'safe video downloader journalists, video download for media professionals, documentary research tool, secure video downloader, google verified downloader',
      'body': '<h2>The Hidden Danger of Popular Video Downloader Sites</h2><p>Search for "video downloader" and you will find dozens of sites promising free, instant downloads. Many of them are dangerous. Security researchers have documented that a significant number of free video downloader websites distribute <strong>malware disguised as download buttons</strong>, inject browser extensions that steal passwords, redirect users to phishing pages, and secretly harvest data from your device.</p><p>For a casual viewer, this is an annoyance. For a <strong>journalist, documentary filmmaker, or media researcher</strong>, it can be catastrophic — exposing source contacts, confidential documents, or credentials to hostile actors.</p><h2>Why YT2GDrive Is Different</h2><p>YT2GDrive is built on a fundamentally different model:</p><ul><li><strong>Google-verified OAuth 2.0</strong> — our Google Drive integration has passed Google\'s official app verification process. Your Google account credentials never touch our servers.</li><li><strong>No software to install</strong> — nothing is ever downloaded to your device except the video file you requested. No browser extensions, no executables.</li><li><strong>Open-source backend</strong> — powered by <a href="https://github.com/yt-dlp/yt-dlp" rel="noopener">yt-dlp</a>, a transparent, community-audited open-source tool used by broadcasters and academic institutions worldwide.</li><li><strong>No account required</strong> — we do not collect your email, phone number, or personal data to download a file.</li></ul><h2>Professional Workflows for Journalists & Filmmakers</h2><h3>Investigative Journalism</h3><p>When covering breaking news or building an investigative report, video evidence from social media can disappear within hours — accounts deleted, posts removed under legal pressure. YT2GDrive lets you <strong>preserve evidence instantly</strong> by saving it directly to your Google Drive, creating a timestamped cloud record outside your local machine.</p><h3>Documentary Research</h3><p>Documentarians building archive libraries need reliable, high-quality downloads without watermarks or quality degradation. YT2GDrive fetches the <strong>best available stream</strong> — up to 4K — and delivers a clean MP4 file compatible with every professional editing suite (Premiere Pro, Final Cut, DaVinci Resolve).</p><h3>Secure Cloud Archive</h3><p>With the <strong>Save to Cloud</strong> feature, your downloaded content goes directly to Google Drive — it never sits on your local hard drive, reducing risk if your device is lost, seized, or compromised. You can organise downloads into project folders and share them securely with your editorial team.</p><h2>How to Use YT2GDrive for Professional Work</h2><ol><li>Paste the URL of any video (YouTube, Twitter/X, Facebook, TikTok, Instagram, Vimeo and 1000+ more)</li><li>For local editing: choose <strong>Download to Computer</strong> → save an MP4 directly</li><li>For secure cloud archive: choose <strong>Save to Cloud</strong> → connect Google Drive → select your project folder → download</li><li>Your video is processed server-side and delivered without any third-party trackers</li></ol><h2>Trusted by Professionals Because It Is Verifiable</h2><p>Unlike black-box download services, every component of YT2GDrive is inspectable. The integration with Google services is certified. There are no hidden ads, no pop-ups, no redirect chains. What you see is what you get — a clean tool built for people whose work depends on reliability and security.</p>'},
    { 'id': 'guide-shorts',
      'title': 'How to Download YouTube Shorts Videos — Free',
      'description': 'Save any YouTube Shorts video to your phone or PC for free. No watermark, no app needed. Works on Android and iPhone.',
      'keywords': 'youtube shorts download, how to download youtube shorts, save youtube shorts, shorts video downloader, youtube shorts mp4, download shorts without watermark',
      'body': '<p>YouTube Shorts are short videos up to 60 seconds long — and they\'re among the most-watched content on YouTube. While YouTube has no built-in download button for Shorts, you can save any public Short in seconds using <strong>YT2GDrive</strong> — completely free, no app, no watermark.</p><h2>How to Download YouTube Shorts</h2><ol><li>Open YouTube and find the Short you want to save</li><li>Tap <strong>Share</strong> → <strong>Copy link</strong> on mobile, or copy the URL from your browser</li><li>Go to <a href="/download">photovideo.ae/download</a> and paste the link</li><li>Click <strong>Download Now</strong></li><li>Once processing is complete, click <strong>Download</strong> to save the MP4</li></ol><h2>Save YouTube Shorts to Google Drive</h2><ol><li>Paste the Shorts link</li><li>Switch to the <strong>Save to Cloud</strong> tab</li><li>Connect your Google Drive account</li><li>Click <strong>Save to Google Drive</strong> — the video goes straight to your YT2GDrive folder</li></ol><h2>YouTube Shorts vs Regular YouTube Videos</h2><p>Shorts use a different URL format — either <code>youtube.com/shorts/VIDEO_ID</code> or a short link from the Share menu. Both formats are fully supported. Just paste the link as-is.</p><h2>FAQ</h2><dl><dt>Is it free?</dt><dd>Yes, completely free with no download limits.</dd><dt>Does it work on iPhone and Android?</dt><dd>Yes — open the page in any mobile browser, paste the link and download.</dd><dt>What quality does the Short download in?</dt><dd>The highest available quality for that Short.</dd><dt>Can I download private Shorts?</dt><dd>No — only publicly accessible Shorts can be downloaded.</dd></dl>'},
    { 'id': 'guide-mp3',
      'title': 'How to Extract MP3 Audio from YouTube Videos — Free',
      'description': 'Download MP3 audio from any YouTube video for free. Perfect for music, Bollywood songs, podcasts, and lectures. No app required.',
      'keywords': 'youtube to mp3, youtube mp3 download, extract audio from youtube, youtube song download free, bollywood songs youtube mp3, youtube audio download',
      'body': '<p>Want to listen to a YouTube video without watching it? Whether it\'s a Bollywood song, a podcast, a lecture, or a music mix, you can extract the audio as an MP3 file using <strong>YT2GDrive</strong> — free, no app required.</p><h2>How to Download MP3 from YouTube</h2><ol><li>Find the YouTube video whose audio you want</li><li>Copy the URL from the browser address bar</li><li>Go to <a href="/download">photovideo.ae/download</a> and paste the URL</li><li>Click <strong>Download Now</strong></li><li>When the file is ready, click <strong>Download</strong> — you get an MP4 file with the best available audio</li></ol><p><strong>Tip:</strong> Most media players (VLC, Windows Media Player, iPhone Music) can play MP4 files as audio directly, ignoring the video track. For a pure MP3 file, open the downloaded MP4 in <strong>VLC → Convert/Save → Audio MP3</strong>.</p><h2>Popular Uses in India</h2><ul><li>Downloading Bollywood songs from YouTube music videos</li><li>Saving devotional bhajans and aarti for offline listening</li><li>Extracting podcast audio from YouTube recordings</li><li>Saving educational lectures from YouTube for studying offline</li><li>Downloading cricket commentary highlights</li></ul><h2>Save Audio to Google Drive</h2><ol><li>Paste the YouTube video link</li><li>Switch to <strong>Save to Cloud</strong></li><li>Connect your Google Drive and click <strong>Save to Google Drive</strong></li><li>Access your audio from any device via Google Drive</li></ol><h2>FAQ</h2><dl><dt>Is it free?</dt><dd>Yes, completely free.</dd><dt>Does it work for songs, movies and shows?</dt><dd>Yes — any public YouTube video is supported.</dd><dt>What audio quality do I get?</dt><dd>The best available audio quality for that video, typically 128–320 kbps equivalent.</dd><dt>Can I download a full YouTube playlist?</dt><dd>Currently one video at a time. Paste each video link separately.</dd></dl>'},
    { 'id': 'guide-android',
      'title': 'How to Download YouTube Videos on Android Phone — Free',
      'description': 'Step-by-step guide to saving YouTube videos to your Android phone for free. No app needed, works on all Android devices including Samsung, Redmi, Realme.',
      'keywords': 'download youtube videos android, youtube downloader for android, save youtube video to android phone, android youtube download free, youtube video save android, redmi youtube download',
      'body': '<p>India has over 500 million Android users — and downloading YouTube videos on Android is one of the most searched topics. The good news: you don\'t need any app or APK. <strong>YT2GDrive</strong> works directly in your Android browser — Chrome, Firefox, or any other.</p><h2>How to Download YouTube Videos on Android</h2><ol><li>Open the <strong>YouTube app</strong> on your Android phone</li><li>Find the video you want to save</li><li>Tap <strong>Share</strong> → <strong>Copy link</strong></li><li>Open <strong>Chrome</strong> or any browser and go to <a href="/download">photovideo.ae/download</a></li><li>Paste the copied link into the input field</li><li>Tap <strong>Download Now</strong></li><li>Wait for processing (usually 30–60 seconds)</li><li>Tap the <strong>Download</strong> button — the MP4 file saves to your Downloads folder</li></ol><h2>Works on All Android Phones</h2><p>Tested and working on: Samsung Galaxy, Redmi, Realme, POCO, Vivo, OPPO, OnePlus, Motorola, Nokia and all other Android phones running Android 6.0 or later.</p><h2>Save to Google Drive Instead</h2><p>Don\'t want to use storage space on your phone? Save directly to Google Drive:</p><ol><li>Paste the YouTube link</li><li>Tap <strong>Save to Cloud</strong></li><li>Connect your Google Drive (one-time setup)</li><li>Tap <strong>Save to Google Drive</strong></li><li>Access your video from any device at any time</li></ol><h2>FAQ</h2><dl><dt>Do I need to install anything?</dt><dd>No app or APK needed — just use your phone\'s browser.</dd><dt>Does it work without Wi-Fi?</dt><dd>Yes, it works on mobile data (4G/5G), but Wi-Fi is recommended for large files.</dd><dt>Where does the downloaded video go?</dt><dd>To your phone\'s Downloads folder. Open it from Files or Google Files app.</dd><dt>Does it work on Jio, Airtel and Vi networks?</dt><dd>Yes, it works on all Indian mobile networks.</dd><dt>What is the video quality?</dt><dd>Best available — up to 1080p HD for most videos.</dd></dl>'},
  ],
  'hi': [
    { 'id': 'guide-download',
      'title': 'YouTube वीडियो कैसे डाउनलोड करें',
      'description': 'किसी भी YouTube वीडियो को मुफ्त में HD क्वालिटी में डाउनलोड करने की चरण-दर-चरण गाइड।',
      'keywords': 'youtube video download kaise kare, youtube downloader hindi, youtube to mp4 free',
      'body': '<p>YouTube वीडियो डाउनलोड करना बहुत आसान है। इन चरणों का पालन करें:</p><ol><li>वह YouTube वीडियो खोजें जिसे आप सेव करना चाहते हैं</li><li>ब्राउज़र के एड्रेस बार से URL कॉपी करें</li><li><a href="/download">मुख्य पेज</a> पर दिए गए फील्ड में पेस्ट करें</li><li><strong>कंप्यूटर पर डाउनलोड</strong> चुनें और <strong>अभी डाउनलोड करें</strong> पर क्लिक करें</li><li>प्रोसेसिंग पूरी होने पर <strong>डाउनलोड</strong> बटन पर क्लिक करें</li></ol><p>बिना किसी सॉफ्टवेयर के HD और 4K क्वालिटी में वीडियो डाउनलोड करें।</p><h2>अक्सर पूछे जाने वाले सवाल</h2><dl><dt>क्या यह मुफ्त है?</dt><dd>हां, पूरी तरह मुफ्त और बिना किसी सीमा के।</dd><dt>वीडियो क्वालिटी?</dt><dd>हम स्वचालित रूप से सर्वश्रेष्ठ उपलब्ध फॉर्मेट चुनते हैं, 4K तक।</dd></dl>'},
    { 'id': 'guide-cloud',
      'title': 'YouTube वीडियो को Google Drive में कैसे सेव करें',
      'description': 'YouTube वीडियो को सीधे Google Drive में अपलोड करें, लोकल स्टोरेज की जरूरत नहीं।',
      'keywords': 'youtube video google drive mein save kare, youtube google drive hindi',
      'body': '<p><strong>क्लाउड में सेव</strong> फीचर से आप YouTube वीडियो को सीधे Google Drive में अपलोड कर सकते हैं।</p><ol><li>YouTube URL <a href="/download">मुख्य पेज</a> पर पेस्ट करें</li><li><strong>क्लाउड में सेव</strong> टैब पर क्लिक करें</li><li>अपना Google Drive अकाउंट कनेक्ट करें</li><li>डेस्टिनेशन फोल्डर चुनें (वैकल्पिक)</li><li><strong>Google Drive में सेव करें</strong> पर क्लिक करें</li></ol><h2>फायदे</h2><dl><dt>डिवाइस स्टोरेज नहीं लगता</dt><dd>फाइल सीधे Drive में जाती है।</dd><dt>कहीं से भी एक्सेस</dt><dd>किसी भी फोन, टैबलेट या कंप्यूटर से देखें।</dd></dl>'},
    { 'id': 'guide-device',
      'title': 'PC या मोबाइल पर YouTube वीडियो कैसे डाउनलोड करें',
      'description': 'YouTube वीडियो को Windows, Mac, iPhone या Android पर MP4 फाइल के रूप में सेव करें।',
      'keywords': 'pc par youtube video download, mobile par youtube video download, iphone android youtube',
      'body': '<p>PC या मोबाइल पर YouTube वीडियो सेव करें और बिना इंटरनेट के देखें।</p><h2>कंप्यूटर पर (Windows/Mac):</h2><ol><li>YouTube से URL कॉपी करें</li><li><a href="/download">यहाँ</a> पेस्ट करें और <strong>डाउनलोड</strong> करें</li><li>MP4 फाइल आपके Downloads फोल्डर में सेव होगी</li></ol><h2>मोबाइल पर (iPhone/Android):</h2><ol><li>YouTube ऐप में <strong>Share → Link Copy</strong> करें</li><li>मोबाइल ब्राउज़र में यह पेज खोलें</li><li>URL पेस्ट करें और डाउनलोड करें</li></ol>'},
    { 'id': 'guide-tiktok',
      'title': 'TikTok वीडियो कैसे डाउनलोड करें — मुफ्त, बिना वॉटरमार्क',
      'description': 'किसी भी TikTok वीडियो को मुफ्त में अपने फोन या PC पर सेव करें। कोई ऐप जरूरी नहीं।',
      'keywords': 'tiktok video download kaise kare, tiktok downloader hindi, tiktok mp4 download free',
      'body': '<p>TikTok का पसंदीदा वीडियो सेव करना चाहते हैं? <strong>YT2GDrive</strong> से कोई भी TikTok वीडियो मुफ्त में डाउनलोड करें।</p><h2>TikTok वीडियो डाउनलोड करने के चरण</h2><ol><li>TikTok खोलें और वीडियो ढूंढें</li><li><strong>Share</strong> → <strong>Copy link</strong> टैप करें</li><li><a href="/download">photovideo.ae/download</a> पर जाएं और लिंक पेस्ट करें</li><li><strong>कंप्यूटर पर डाउनलोड</strong> चुनें और <strong>अभी डाउनलोड करें</strong> क्लिक करें</li><li>प्रोसेसिंग पूरी होने पर <strong>डाउनलोड</strong> बटन दबाएं</li></ol><h2>Google Drive में सेव करें</h2><ol><li>TikTok लिंक पेस्ट करें</li><li><strong>क्लाउड में सेव</strong> टैब चुनें</li><li>Google Drive कनेक्ट करें और <strong>Google Drive में सेव करें</strong> क्लिक करें</li></ol><h2>FAQ</h2><dl><dt>क्या यह मुफ्त है?</dt><dd>हां, पूरी तरह मुफ्त।</dd><dt>क्या प्राइवेट वीडियो डाउनलोड होंगे?</dt><dd>नहीं, केवल पब्लिक वीडियो डाउनलोड हो सकते हैं।</dd></dl>'},
    { 'id': 'guide-instagram',
      'title': 'Instagram वीडियो और Reels कैसे डाउनलोड करें',
      'description': 'Instagram Reels, वीडियो और Stories को मुफ्त में अपने फोन या PC पर सेव करें। कोई ऐप जरूरी नहीं।',
      'keywords': 'instagram video download, instagram reels download kaise kare, instagram downloader hindi',
      'body': '<p>Instagram Reels या वीडियो सेव करना चाहते हैं? <strong>YT2GDrive</strong> से कोई भी Instagram वीडियो मुफ्त में डाउनलोड करें।</p><h2>Instagram Reels डाउनलोड करने के चरण</h2><ol><li>Instagram खोलें और Reel ढूंढें</li><li><strong>तीन डॉट्स (…)</strong> → <strong>Link Copy करें</strong></li><li><a href="/download">photovideo.ae/download</a> पर जाएं और लिंक पेस्ट करें</li><li><strong>कंप्यूटर पर डाउनलोड</strong> चुनें और <strong>अभी डाउनलोड करें</strong> दबाएं</li><li>MP4 फाइल डाउनलोड करें</li></ol><h2>Google Drive में सेव करें</h2><ol><li>Instagram लिंक पेस्ट करें</li><li><strong>क्लाउड में सेव</strong> टैब चुनें</li><li>Google Drive कनेक्ट करें और सेव करें</li></ol><h2>FAQ</h2><dl><dt>क्या यह मुफ्त है?</dt><dd>हां, पूरी तरह मुफ्त।</dd><dt>क्या प्राइवेट अकाउंट से डाउनलोड होगा?</dt><dd>नहीं, केवल पब्लिक पोस्ट ही डाउनलोड होती है।</dd></dl>'},
    { 'id': 'guide-other',
      'title': 'किसी भी वेबसाइट से वीडियो डाउनलोड करें — Twitter, Facebook, Vimeo और अधिक',
      'description': 'Twitter, Facebook, Vimeo, Dailymotion सहित 1000+ वेबसाइटों से वीडियो मुफ्त में डाउनलोड करें।',
      'keywords': 'kisi bhi website se video download, twitter video download, facebook video download, vimeo downloader hindi',
      'body': '<p><strong>YT2GDrive</strong> 1000+ वीडियो होस्टिंग वेबसाइटों को सपोर्ट करता है।</p><h2>सपोर्टेड प्लेटफॉर्म</h2><ul><li><strong>YouTube</strong> — सभी वीडियो</li><li><strong>Instagram</strong> — Reels, वीडियो</li><li><strong>TikTok</strong> — सभी पब्लिक वीडियो</li><li><strong>Twitter/X</strong> — एम्बेडेड वीडियो</li><li><strong>Facebook</strong> — पब्लिक वीडियो</li><li><strong>Vimeo</strong> — सभी पब्लिक वीडियो</li><li><strong>Dailymotion</strong></li><li><strong>Reddit</strong> — वीडियो पोस्ट</li><li>और 1000+ अन्य साइटें</li></ul><h2>किसी भी साइट से वीडियो डाउनलोड करने के चरण</h2><ol><li>वीडियो पेज का URL कॉपी करें</li><li><a href="/download">photovideo.ae/download</a> पर जाएं और URL पेस्ट करें</li><li><strong>अभी डाउनलोड करें</strong> क्लिक करें</li><li>MP4 फाइल सेव करें</li></ol><h2>FAQ</h2><dl><dt>क्या यह मुफ्त है?</dt><dd>हां, सभी 1000+ साइटों के लिए पूरी तरह मुफ्त।</dd></dl>'},
    { 'id': 'guide-professionals',
      'title': 'पत्रकारों और मीडिया प्रोफेशनल्स के लिए सुरक्षित वीडियो डाउनलोडर',
      'description': 'जानें क्यों YT2GDrive पत्रकारों, डॉक्यूमेंट्री फिल्ममेकर्स और मीडिया शोधकर्ताओं के लिए सुरक्षित है। Google-verified, कोई मालवेयर नहीं।',
      'keywords': 'journalist video downloader safe, media professional video download hindi, secure video downloader, google verified downloader',
      'body': '<h2>लोकप्रिय वीडियो डाउनलोडर साइटों का छुपा खतरा</h2><p>"वीडियो डाउनलोडर" सर्च करने पर दर्जनों साइटें मिलती हैं — लेकिन इनमें से कई <strong>खतरनाक</strong> हैं। सुरक्षा शोधकर्ताओं ने पाया है कि कई मुफ्त डाउनलोडर साइटें मालवेयर फैलाती हैं, पासवर्ड चुराती हैं, फिशिंग पेज पर रीडायरेक्ट करती हैं और आपके डिवाइस से डेटा चुराती हैं।</p><p>एक आम यूजर के लिए यह परेशानी है, लेकिन <strong>पत्रकार, डॉक्यूमेंट्री फिल्ममेकर या मीडिया रिसर्चर</strong> के लिए यह विनाशकारी हो सकता है।</p><h2>YT2GDrive क्यों अलग है</h2><ul><li><strong>Google-verified OAuth 2.0</strong> — Google Drive इंटीग्रेशन Google की आधिकारिक वेरिफिकेशन प्रक्रिया से पास है।</li><li><strong>कोई सॉफ्टवेयर इंस्टॉल नहीं</strong> — केवल वीडियो फाइल डाउनलोड होती है, कोई एक्सटेंशन या एग्जीक्यूटेबल नहीं।</li><li><strong>ओपन-सोर्स बैकएंड</strong> — <a href="https://github.com/yt-dlp/yt-dlp" rel="noopener">yt-dlp</a> पर आधारित।</li></ul><h2>पेशेवर वर्कफ्लो</h2><p><strong>Save to Cloud</strong> फीचर से वीडियो सीधे Google Drive में जाती है — आपके लोकल डिवाइस पर नहीं। यह खोजी पत्रकारिता और डॉक्यूमेंट्री रिसर्च के लिए आदर्श है।</p>'},
    { 'id': 'guide-shorts',
      'title': 'YouTube Shorts वीडियो कैसे डाउनलोड करें — मुफ्त',
      'description': 'किसी भी YouTube Short को मुफ्त में अपने फोन या PC पर सेव करें। कोई ऐप जरूरी नहीं, कोई वॉटरमार्क नहीं।',
      'keywords': 'youtube shorts download kaise kare, youtube shorts save, shorts video download free, youtube shorts mp4 download',
      'body': '<p>YouTube Shorts 60 सेकंड तक के छोटे वीडियो होते हैं। <strong>YT2GDrive</strong> से किसी भी Shorts वीडियो को मुफ्त में डाउनलोड करें — कोई ऐप नहीं, कोई वॉटरमार्क नहीं।</p><h2>YouTube Shorts डाउनलोड करने के चरण</h2><ol><li>YouTube खोलें और Shorts वीडियो ढूंढें</li><li>मोबाइल पर <strong>Share → Copy link</strong> टैप करें, या ब्राउज़र से URL कॉपी करें</li><li><a href="/download">photovideo.ae/download</a> पर जाएं और लिंक पेस्ट करें</li><li><strong>अभी डाउनलोड करें</strong> क्लिक करें</li><li>प्रोसेसिंग पूरी होने पर <strong>डाउनलोड</strong> बटन दबाएं</li></ol><h2>Google Drive में सेव करें</h2><ol><li>Shorts लिंक पेस्ट करें</li><li><strong>क्लाउड में सेव</strong> टैब चुनें</li><li>Google Drive कनेक्ट करें और <strong>Google Drive में सेव करें</strong> क्लिक करें</li></ol><h2>FAQ</h2><dl><dt>क्या यह मुफ्त है?</dt><dd>हां, पूरी तरह मुफ्त।</dd><dt>iPhone और Android पर काम करता है?</dt><dd>हां — मोबाइल ब्राउज़र में पेज खोलें, लिंक पेस्ट करें और डाउनलोड करें।</dd><dt>किस क्वालिटी में डाउनलोड होगा?</dt><dd>उस Short के लिए उपलब्ध सर्वश्रेष्ठ क्वालिटी।</dd></dl>'},
    { 'id': 'guide-mp3',
      'title': 'YouTube वीडियो से MP3 ऑडियो कैसे निकालें — मुफ्त',
      'description': 'किसी भी YouTube वीडियो से MP3 ऑडियो मुफ्त में डाउनलोड करें। Bollywood गाने, Podcasts, Lectures के लिए परफेक्ट।',
      'keywords': 'youtube to mp3, youtube se mp3 download, bollywood songs youtube mp3, youtube audio download free, youtube song download',
      'body': '<p>YouTube वीडियो का ऑडियो सुनना चाहते हैं? <strong>YT2GDrive</strong> से किसी भी YouTube वीडियो की ऑडियो मुफ्त में डाउनलोड करें — Bollywood गाने, Podcasts, Lectures, सब कुछ।</p><h2>YouTube से MP3 डाउनलोड करने के चरण</h2><ol><li>वह YouTube वीडियो ढूंढें जिसकी ऑडियो चाहिए</li><li>ब्राउज़र से URL कॉपी करें</li><li><a href="/download">photovideo.ae/download</a> पर जाएं और URL पेस्ट करें</li><li><strong>अभी डाउनलोड करें</strong> क्लिक करें</li><li>फाइल तैयार होने पर <strong>डाउनलोड</strong> करें — आपको MP4 फाइल मिलेगी जिसमें सबसे अच्छी ऑडियो होगी</li></ol><p><strong>टिप:</strong> VLC, Windows Media Player जैसे प्लेयर MP4 को ऑडियो के रूप में भी चला सकते हैं।</p><h2>भारत में लोकप्रिय उपयोग</h2><ul><li>Bollywood गाने डाउनलोड करना</li><li>भजन और आरती ऑफलाइन सुनना</li><li>Podcasts और Lectures सेव करना</li><li>क्रिकेट कमेंट्री हाइलाइट्स</li></ul><h2>FAQ</h2><dl><dt>क्या यह मुफ्त है?</dt><dd>हां, पूरी तरह मुफ्त।</dd><dt>क्या ऑडियो क्वालिटी अच्छी होगी?</dt><dd>उपलब्ध सर्वश्रेष्ठ ऑडियो क्वालिटी, आमतौर पर 128–320 kbps।</dd></dl>'},
    { 'id': 'guide-android',
      'title': 'Android फोन पर YouTube वीडियो कैसे डाउनलोड करें — मुफ्त',
      'description': 'Samsung, Redmi, Realme सहित सभी Android फोन पर YouTube वीडियो मुफ्त में डाउनलोड करें। कोई ऐप जरूरी नहीं।',
      'keywords': 'android par youtube video download, youtube downloader android hindi, samsung redmi realme youtube download, jio airtel youtube download',
      'body': '<p>भारत में 50 करोड़ से ज्यादा Android यूज़र हैं। <strong>YT2GDrive</strong> सीधे आपके Android ब्राउज़र में काम करता है — कोई ऐप या APK इंस्टॉल करने की जरूरत नहीं।</p><h2>Android पर YouTube वीडियो डाउनलोड करने के चरण</h2><ol><li>YouTube ऐप में वीडियो खोलें</li><li><strong>Share → Copy link</strong> टैप करें</li><li>Chrome या किसी भी ब्राउज़र में <a href="/download">photovideo.ae/download</a> खोलें</li><li>लिंक पेस्ट करें</li><li><strong>अभी डाउनलोड करें</strong> टैप करें</li><li>प्रोसेसिंग के बाद (30–60 सेकंड) <strong>डाउनलोड</strong> बटन टैप करें — MP4 फाइल Downloads फोल्डर में सेव होगी</li></ol><h2>सभी Android फोन पर काम करता है</h2><p>Samsung Galaxy, Redmi, Realme, POCO, Vivo, OPPO, OnePlus, Motorola, Nokia — Android 6.0 या उसके बाद के सभी फोन पर टेस्ट किया गया।</p><h2>Google Drive में सेव करें</h2><ol><li>YouTube लिंक पेस्ट करें</li><li><strong>क्लाउड में सेव</strong> टैप करें</li><li>Google Drive कनेक्ट करें (एक बार)</li><li><strong>Google Drive में सेव करें</strong> टैप करें</li></ol><h2>FAQ</h2><dl><dt>क्या कुछ इंस्टॉल करना होगा?</dt><dd>नहीं — बस ब्राउज़र से खोलें।</dd><dt>Jio, Airtel और Vi पर काम करता है?</dt><dd>हां, सभी भारतीय नेटवर्क पर काम करता है।</dd><dt>वीडियो कहां सेव होगा?</dt><dd>आपके फोन के Downloads फोल्डर में।</dd></dl>'},
  ],
  'zh': [
    { 'id': 'guide-download',
      'title': '如何下载YouTube视频',
      'description': '免费高清下载任意YouTube视频的分步指南。无需安装软件。',
      'keywords': '如何下载youtube视频, youtube视频下载, youtube转mp4免费',
      'body': '<p>使用我们的免费工具，轻松下载任何YouTube视频：</p><ol><li>在YouTube找到您想下载的视频</li><li>从地址栏复制视频URL</li><li>将URL粘贴到<a href="/download">主页</a>的输入框</li><li>选择<strong>下载到电脑</strong>选项卡</li><li>点击<strong>立即下载</strong></li><li>处理完成后点击<strong>下载</strong>保存文件</li></ol><p>无需安装任何软件，支持HD和4K画质下载，完全免费。</p><h2>常见问题</h2><dl><dt>是否免费？</dt><dd>是的，完全免费，无任何限制。</dd><dt>支持什么画质？</dt><dd>自动选择最佳格式，最高支持4K。</dd></dl>'},
    { 'id': 'guide-cloud',
      'title': '如何将YouTube视频保存到Google Drive',
      'description': '将YouTube视频直接上传到Google Drive，无需占用本地存储空间。免费快速。',
      'keywords': '保存youtube到google drive, youtube google drive上传, youtube云存储',
      'body': '<p>使用<strong>保存到云端</strong>功能，将YouTube视频直接上传到Google Drive。</p><ol><li>将YouTube URL粘贴到<a href="/download">主页</a></li><li>点击<strong>保存到云端</strong>标签</li><li>登录您的Google Drive账户</li><li>选择目标文件夹（可选）</li><li>点击<strong>保存到Google Drive</strong></li></ol><h2>优势</h2><dl><dt>不占用设备存储</dt><dd>文件直接存入Drive，不经过本地硬盘。</dd><dt>随时随地访问</dt><dd>从任何手机、平板或电脑观看或分享。</dd></dl>'},
    { 'id': 'guide-device',
      'title': '如何将YouTube视频下载到电脑或手机',
      'description': '将YouTube视频保存为MP4文件到Windows、Mac、iPhone或Android设备。',
      'keywords': '下载youtube到电脑, 下载youtube到手机, iphone android youtube下载',
      'body': '<p>将YouTube视频保存到设备，随时随地离线观看。</p><h2>电脑端（Windows/Mac/Linux）：</h2><ol><li>从YouTube复制视频URL</li><li>粘贴到<a href="/download">本页面</a>上方</li><li>点击下载并保存MP4文件到下载文件夹</li></ol><h2>手机端（iPhone/Android）：</h2><ol><li>在YouTube应用中点击<strong>分享→复制链接</strong></li><li>在手机浏览器中打开本页</li><li>粘贴链接并点击下载</li></ol>'},
    { 'id': 'guide-tiktok',
      'title': '如何下载TikTok视频 — 免费无水印',
      'description': '免费将任何TikTok视频保存到手机或电脑。在线工具，无需安装应用。',
      'keywords': '下载tiktok视频, tiktok视频下载器, tiktok无水印下载, 抖音视频下载',
      'body': '<p>想保存喜欢的TikTok视频？使用<strong>YT2GDrive</strong>免费下载任何TikTok视频。</p><h2>下载TikTok视频步骤</h2><ol><li>在TikTok中找到要下载的视频</li><li>点击<strong>分享</strong> → <strong>复制链接</strong></li><li>前往<a href="/download">photovideo.ae/download</a>并粘贴链接</li><li>选择<strong>下载到电脑</strong>并点击<strong>立即下载</strong></li><li>处理完成后点击<strong>下载</strong>保存MP4文件</li></ol><h2>保存到Google Drive</h2><ol><li>粘贴TikTok链接</li><li>切换到<strong>保存到云端</strong>选项</li><li>连接Google Drive账户并保存</li></ol><h2>常见问题</h2><dl><dt>是否免费？</dt><dd>是的，完全免费，无需账号。</dd><dt>能下载私人视频吗？</dt><dd>不能，只能下载公开视频。</dd></dl>'},
    { 'id': 'guide-instagram',
      'title': '如何下载Instagram视频和Reels',
      'description': '免费将Instagram Reels、视频和Stories保存到手机或电脑。无需安装应用。',
      'keywords': '下载instagram视频, instagram reels下载, 保存instagram视频, instagram视频下载器',
      'body': '<p>想保存Instagram Reels或视频？使用<strong>YT2GDrive</strong>免费下载任何公开Instagram内容。</p><h2>下载Instagram Reels步骤</h2><ol><li>打开Instagram，找到要下载的Reel或视频</li><li>点击<strong>三个点（…）</strong> → <strong>复制链接</strong></li><li>前往<a href="/download">photovideo.ae/download</a>并粘贴链接</li><li>选择<strong>下载到电脑</strong>并点击<strong>立即下载</strong></li><li>处理完成后下载MP4文件</li></ol><h2>保存到Google Drive</h2><ol><li>粘贴Instagram链接</li><li>切换到<strong>保存到云端</strong></li><li>连接Google Drive账户并保存</li></ol><h2>常见问题</h2><dl><dt>是否免费？</dt><dd>是的，完全免费。</dd><dt>能下载私人账号内容吗？</dt><dd>不能，只支持公开内容。</dd></dl>'},
    { 'id': 'guide-other',
      'title': '从任何网站下载视频 — Twitter、Facebook、Vimeo等',
      'description': '从Twitter/X、Facebook、Vimeo、Dailymotion等1000多个网站免费下载视频。',
      'keywords': '从任何网站下载视频, twitter视频下载, facebook视频下载, vimeo下载器, 在线视频下载',
      'body': '<p><strong>YT2GDrive</strong>支持超过1000个视频托管网站，几乎所有在线视频都可以免费下载。</p><h2>支持的平台</h2><ul><li><strong>YouTube</strong> — 所有视频</li><li><strong>Instagram</strong> — Reels、视频</li><li><strong>TikTok</strong> — 所有公开视频</li><li><strong>Twitter/X</strong> — 嵌入视频</li><li><strong>Facebook</strong> — 公开视频</li><li><strong>Vimeo</strong></li><li><strong>Dailymotion</strong></li><li><strong>Reddit</strong> — 视频帖子</li><li>及1000多个其他网站</li></ul><h2>下载步骤</h2><ol><li>复制视频页面的URL</li><li>前往<a href="/download">photovideo.ae/download</a>并粘贴</li><li>点击<strong>立即下载</strong></li><li>保存MP4文件</li></ol><h2>常见问题</h2><dl><dt>是否免费？</dt><dd>是的，所有1000多个网站均免费。</dd></dl>'},
    { 'id': 'guide-professionals',
      'title': '面向记者和媒体专业人士的安全视频下载工具',
      'description': '了解为何记者、纪录片制作者和媒体研究人员信任YT2GDrive。Google验证，无恶意软件，安全云端工作流程。',
      'keywords': '记者视频下载工具, 媒体专业人士视频下载, 安全视频下载器, Google验证下载器',
      'body': '<h2>流行视频下载网站的隐患</h2><p>搜索"视频下载器"会找到数十个网站。安全研究人员记录了许多此类网站传播<strong>伪装成下载按钮的恶意软件</strong>、注入盗取密码的浏览器扩展、将用户重定向到钓鱼页面并秘密窃取设备数据。</p><p>对于<strong>记者、纪录片制作者或媒体研究人员</strong>，这可能造成灾难性后果。</p><h2>为什么YT2GDrive与众不同</h2><ul><li><strong>Google认证的OAuth 2.0</strong> — 通过Google官方应用验证流程。</li><li><strong>无需安装任何软件</strong> — 不会下载扩展或可执行文件到您的设备。</li><li><strong>开源后端</strong> — 基于<a href="https://github.com/yt-dlp/yt-dlp" rel="noopener">yt-dlp</a>，全球广播机构和学术机构广泛使用。</li></ul><h2>专业工作流程</h2><p>使用<strong>保存到云端</strong>功能，下载内容直接进入Google Drive，永远不会存储在本地设备上，非常适合调查新闻和纪录片研究。</p>'},
    { 'id': 'guide-shorts',
      'title': '如何下载YouTube Shorts视频 — 免费',
      'description': '免费将任何YouTube Shorts视频保存到手机或电脑。无需应用，无水印。',
      'keywords': '下载youtube shorts, youtube shorts保存, shorts视频下载, youtube短视频下载',
      'body': '<p>YouTube Shorts是最长60秒的短视频，是YouTube上观看量最高的内容之一。使用<strong>YT2GDrive</strong>，几秒钟内免费下载任何公开Shorts——无需应用，无水印。</p><h2>如何下载YouTube Shorts</h2><ol><li>打开YouTube，找到想保存的Shorts</li><li>手机上点击<strong>分享→复制链接</strong>，或从浏览器复制URL</li><li>前往<a href="/download">photovideo.ae/download</a>粘贴链接</li><li>点击<strong>立即下载</strong></li><li>处理完成后点击<strong>下载</strong>保存MP4</li></ol><h2>保存到Google Drive</h2><ol><li>粘贴Shorts链接</li><li>切换到<strong>保存到云端</strong>选项</li><li>连接Google Drive并点击<strong>保存到Google Drive</strong></li></ol><h2>常见问题</h2><dl><dt>是否免费？</dt><dd>是的，完全免费。</dd><dt>支持iPhone和Android吗？</dt><dd>支持——在手机浏览器中打开页面，粘贴链接即可下载。</dd><dt>下载质量如何？</dt><dd>该Shorts可用的最高质量。</dd></dl>'},
    { 'id': 'guide-mp3',
      'title': '如何从YouTube视频提取MP3音频 — 免费',
      'description': '免费从任何YouTube视频下载MP3音频。适合音乐、播客和讲座。无需安装应用。',
      'keywords': 'youtube转mp3, youtube提取音频, youtube音频下载, youtube歌曲下载免费',
      'body': '<p>想不看视频只听音频？使用<strong>YT2GDrive</strong>免费从任何YouTube视频提取音频——音乐、播客、讲座，全部支持。</p><h2>如何从YouTube下载MP3</h2><ol><li>找到想提取音频的YouTube视频</li><li>从浏览器地址栏复制URL</li><li>前往<a href="/download">photovideo.ae/download</a>粘贴URL</li><li>点击<strong>立即下载</strong></li><li>文件就绪后点击<strong>下载</strong>——获得含最佳音频的MP4文件</li></ol><p><strong>提示：</strong>大多数播放器（VLC、Windows Media Player）可直接将MP4作为音频播放。</p><h2>保存到Google Drive</h2><ol><li>粘贴YouTube视频链接</li><li>切换到<strong>保存到云端</strong></li><li>连接Google Drive并点击<strong>保存到Google Drive</strong></li></ol><h2>常见问题</h2><dl><dt>是否免费？</dt><dd>是的，完全免费。</dd><dt>音频质量如何？</dt><dd>该视频可用的最佳音频质量，通常相当于128-320 kbps。</dd></dl>'},
    { 'id': 'guide-android',
      'title': '如何在Android手机上下载YouTube视频 — 免费',
      'description': '在Android手机上免费下载YouTube视频的步骤指南。无需安装应用，支持所有Android设备。',
      'keywords': '安卓下载youtube视频, android youtube下载器, 手机下载youtube免费, 安卓youtube离线',
      'body': '<p>无需任何应用或APK——<strong>YT2GDrive</strong>直接在Android浏览器中运行，支持Chrome、Firefox及其他浏览器。</p><h2>在Android手机上下载YouTube视频</h2><ol><li>在<strong>YouTube应用</strong>中找到想保存的视频</li><li>点击<strong>分享→复制链接</strong></li><li>打开<strong>Chrome</strong>或其他浏览器，前往<a href="/download">photovideo.ae/download</a></li><li>粘贴复制的链接</li><li>点击<strong>立即下载</strong></li><li>等待处理（通常30-60秒）</li><li>点击<strong>下载</strong>——MP4文件保存到下载文件夹</li></ol><h2>保存到Google Drive</h2><ol><li>粘贴YouTube链接</li><li>点击<strong>保存到云端</strong></li><li>连接Google Drive（一次性设置）</li><li>点击<strong>保存到Google Drive</strong></li></ol><h2>常见问题</h2><dl><dt>需要安装任何东西吗？</dt><dd>不需要——只需使用手机浏览器。</dd><dt>下载的视频存在哪里？</dt><dd>手机的下载文件夹，可通过文件管理器打开。</dd><dt>最高支持什么画质？</dt><dd>最高1080p HD。</dd></dl>'},
  ],
  'ar': [
    { 'id': 'guide-download',
      'title': 'كيفية تحميل مقطع من يوتيوب',
      'description': 'دليل خطوة بخطوة لتحميل أي فيديو يوتيوب مجاناً بجودة HD.',
      'keywords': 'كيف تحمل فيديو من يوتيوب, تحميل يوتيوب مجاني, يوتيوب mp4',
      'body': '<p>تحميل مقاطع يوتيوب بخطوات بسيطة:</p><ol><li>ابحث عن الفيديو على يوتيوب</li><li>انسخ رابط الفيديو من شريط العنوان</li><li>الصق الرابط في حقل <a href="/download">الصفحة الرئيسية</a></li><li>اختر <strong>تحميل إلى الجهاز</strong></li><li>انقر على <strong>تحميل الآن</strong></li><li>بعد المعالجة، انقر على <strong>تحميل</strong> لحفظ الملف</li></ol><p>لا يلزم تثبيت أي برنامج. يدعم جودة HD و4K مجاناً.</p><h2>الأسئلة الشائعة</h2><dl><dt>هل هو مجاني؟</dt><dd>نعم، مجاني تماماً بدون قيود.</dd><dt>ما جودة الفيديو؟</dt><dd>نختار تلقائياً أفضل صيغة متاحة حتى 4K.</dd></dl>'},
    { 'id': 'guide-cloud',
      'title': 'كيفية حفظ مقطع يوتيوب في Google Drive',
      'description': 'رفع مقاطع يوتيوب مباشرة إلى Google Drive دون الحاجة لمساحة تخزين محلية.',
      'keywords': 'حفظ يوتيوب في google drive, رفع يوتيوب للسحابة, يوتيوب google drive',
      'body': '<p>احفظ مقاطع يوتيوب مباشرة في Google Drive دون استخدام مساحة تخزين محلية.</p><ol><li>الصق رابط يوتيوب في <a href="/download">الصفحة الرئيسية</a></li><li>اختر تبويب <strong>الحفظ على السحابة</strong></li><li>سجّل الدخول بحساب Google Drive</li><li>اختر مجلداً (اختياري)</li><li>انقر <strong>حفظ في Google Drive</strong></li></ol><h2>المزايا</h2><dl><dt>لا مساحة مستهلكة على الجهاز</dt><dd>يذهب الملف مباشرة إلى Drive.</dd><dt>وصول من أي مكان</dt><dd>شاهد أو شارك من أي هاتف أو جهاز لوحي أو كمبيوتر.</dd></dl>'},
    { 'id': 'guide-device',
      'title': 'كيفية تحميل مقاطع يوتيوب على الكمبيوتر أو الهاتف',
      'description': 'حفظ مقاطع يوتيوب بصيغة MP4 على Windows أو Mac أو iPhone أو Android.',
      'keywords': 'تحميل يوتيوب على الكمبيوتر, تحميل يوتيوب على الهاتف, يوتيوب mp4 ايفون اندرويد',
      'body': '<p>حمّل مقاطع يوتيوب على جهازك للمشاهدة بدون إنترنت.</p><h2>على الكمبيوتر:</h2><ol><li>انسخ رابط الفيديو من يوتيوب</li><li>الصقه في <a href="/download">الصفحة الرئيسية</a> واضغط تحميل</li><li>سيُحفظ الملف بصيغة MP4 في مجلد التنزيلات</li></ol><h2>على الهاتف (iPhone/Android):</h2><ol><li>افتح الفيديو في تطبيق يوتيوب</li><li>اضغط مشاركة ← نسخ الرابط</li><li>افتح هذه الصفحة في المتصفح والصق الرابط</li></ol>'},
    { 'id': 'guide-tiktok',
      'title': 'كيفية تحميل مقاطع TikTok مجاناً — بدون علامة مائية',
      'description': 'حمّل أي مقطع TikTok مجاناً على هاتفك أو جهاز الكمبيوتر. لا تطبيق مطلوب.',
      'keywords': 'تحميل فيديو تيك توك, تيك توك بدون علامة مائية, تنزيل tiktok مجاني',
      'body': '<p>هل تريد حفظ مقطع TikTok مفضل؟ مع <strong>YT2GDrive</strong> يمكنك تحميل أي مقطع TikTok مجاناً.</p><h2>خطوات تحميل مقطع TikTok</h2><ol><li>افتح TikTok وابحث عن الفيديو</li><li>اضغط <strong>مشاركة</strong> ← <strong>نسخ الرابط</strong></li><li>انتقل إلى <a href="/download">photovideo.ae/download</a> والصق الرابط</li><li>اختر <strong>تحميل إلى الجهاز</strong> وانقر <strong>تحميل الآن</strong></li><li>بعد المعالجة، انقر <strong>تحميل</strong> لحفظ الملف</li></ol><h2>الحفظ في Google Drive</h2><ol><li>الصق رابط TikTok</li><li>اختر تبويب <strong>الحفظ على السحابة</strong></li><li>سجّل الدخول بـ Google Drive واحفظ الفيديو</li></ol><h2>الأسئلة الشائعة</h2><dl><dt>هل هو مجاني؟</dt><dd>نعم، مجاني تماماً.</dd><dt>هل يمكن تحميل مقاطع خاصة؟</dt><dd>لا، فقط المقاطع العامة يمكن تحميلها.</dd></dl>'},
    { 'id': 'guide-instagram',
      'title': 'كيفية تحميل مقاطع Instagram وReels',
      'description': 'احفظ مقاطع Instagram وReels مجاناً على هاتفك أو جهاز الكمبيوتر. لا تطبيق مطلوب.',
      'keywords': 'تحميل فيديو انستقرام, تنزيل reels انستقرام, انستقرام downloader مجاني',
      'body': '<p>هل تريد حفظ Reel أو فيديو من Instagram؟ مع <strong>YT2GDrive</strong> يمكنك تحميل أي محتوى عام من Instagram مجاناً.</p><h2>خطوات تحميل مقاطع Instagram</h2><ol><li>افتح Instagram وابحث عن المقطع</li><li>اضغط <strong>ثلاث نقاط (…)</strong> ← <strong>نسخ الرابط</strong></li><li>انتقل إلى <a href="/download">photovideo.ae/download</a> والصق الرابط</li><li>اختر <strong>تحميل إلى الجهاز</strong> وانقر <strong>تحميل الآن</strong></li><li>بعد المعالجة، احفظ ملف MP4</li></ol><h2>الحفظ في Google Drive</h2><ol><li>الصق رابط Instagram</li><li>اختر تبويب <strong>الحفظ على السحابة</strong></li><li>سجّل الدخول بـ Google Drive واحفظ</li></ol><h2>الأسئلة الشائعة</h2><dl><dt>هل هو مجاني؟</dt><dd>نعم، مجاني تماماً.</dd><dt>هل يعمل مع الحسابات الخاصة؟</dt><dd>لا، يعمل مع المحتوى العام فقط.</dd></dl>'},
    { 'id': 'guide-other',
      'title': 'تحميل مقاطع فيديو من أي موقع — Twitter وFacebook وVimeo والمزيد',
      'description': 'حمّل مقاطع الفيديو من أكثر من 1000 موقع بما فيها Twitter وFacebook وVimeo وDailymotion مجاناً.',
      'keywords': 'تحميل فيديو من أي موقع, تحميل تويتر فيديو, تحميل فيسبوك فيديو, vimeo تحميل, محمل فيديو اونلاين',
      'body': '<p>يدعم <strong>YT2GDrive</strong> أكثر من 1000 موقع لاستضافة الفيديو. إذا كان هناك فيديو عبر الإنترنت، يمكنك على الأرجح تحميله من هنا مجاناً.</p><h2>المنصات المدعومة</h2><ul><li><strong>YouTube</strong> — جميع المقاطع</li><li><strong>Instagram</strong> — Reels والمقاطع</li><li><strong>TikTok</strong> — جميع المقاطع العامة</li><li><strong>Twitter/X</strong> — المقاطع المضمّنة</li><li><strong>Facebook</strong> — المقاطع العامة</li><li><strong>Vimeo</strong></li><li><strong>Dailymotion</strong></li><li><strong>Reddit</strong> — منشورات الفيديو</li><li>وأكثر من 1000 موقع آخر</li></ul><h2>خطوات التحميل</h2><ol><li>انسخ URL صفحة الفيديو</li><li>انتقل إلى <a href="/download">photovideo.ae/download</a> والصق الرابط</li><li>انقر <strong>تحميل الآن</strong></li><li>احفظ ملف MP4 على جهازك</li></ol><h2>الأسئلة الشائعة</h2><dl><dt>هل هو مجاني؟</dt><dd>نعم، مجاني تماماً لجميع المواقع المدعومة.</dd></dl>'},
    { 'id': 'guide-professionals',
      'title': 'تحميل فيديو آمن للصحفيين ومحترفي الإعلام',
      'description': 'لماذا يثق الصحفيون وصانعو الأفلام الوثائقية بـ YT2GDrive؟ معتمد من Google، بدون برمجيات خبيثة، سير عمل آمن على السحابة.',
      'keywords': 'تحميل فيديو آمن للصحفيين, أداة إعلامية محترفة, محمل فيديو معتمد google',
      'body': '<h2>الخطر الخفي لمواقع تحميل الفيديو الشائعة</h2><p>ابحث عن "محمّل فيديو" وستجد عشرات المواقع. وثّق باحثو الأمن أن كثيراً منها ينشر <strong>برمجيات خبيثة مخفية داخل أزرار التحميل</strong>، ويسرق كلمات المرور، ويعيد توجيه المستخدمين إلى صفحات احتيالية، ويجمع بيانات الجهاز سراً.</p><p>بالنسبة للصحفي أو صانع الأفلام الوثائقية، قد يكون ذلك <strong>كارثياً</strong> — كشف مصادر سرية أو بيانات اعتماد حساسة.</p><h2>لماذا YT2GDrive مختلف</h2><ul><li><strong>OAuth 2.0 معتمد من Google</strong> — اجتاز تطبيقنا عملية التحقق الرسمية من Google.</li><li><strong>لا يلزم تثبيت أي برنامج</strong> — لا امتدادات، لا ملفات تنفيذية.</li><li><strong>واجهة خلفية مفتوحة المصدر</strong> — يعتمد على <a href="https://github.com/yt-dlp/yt-dlp" rel="noopener">yt-dlp</a>.</li></ul><h2>سير عمل احترافي</h2><p>مع ميزة <strong>الحفظ على السحابة</strong>، يذهب المحتوى المحمّل مباشرة إلى Google Drive دون المرور بجهازك المحلي — مثالي للصحافة الاستقصائية وأبحاث الأفلام الوثائقية.</p>'},
    { 'id': 'guide-shorts',
      'title': 'كيفية تحميل مقاطع YouTube Shorts — مجاناً',
      'description': 'احفظ أي مقطع YouTube Shorts مجاناً على هاتفك أو كمبيوترك. لا تطبيق مطلوب، بدون علامة مائية.',
      'keywords': 'تحميل يوتيوب شورتس, حفظ youtube shorts, تنزيل shorts مجاني, يوتيوب شورت mp4',
      'body': '<p>YouTube Shorts مقاطع قصيرة حتى 60 ثانية وتُعد من أكثر المحتويات مشاهدةً على يوتيوب. مع <strong>YT2GDrive</strong>، احفظ أي Shorts مجاناً في ثوانٍ — بدون تطبيق ولا علامة مائية.</p><h2>خطوات تحميل YouTube Shorts</h2><ol><li>افتح يوتيوب وابحث عن Shorts الذي تريد</li><li>على الهاتف: اضغط <strong>مشاركة → نسخ الرابط</strong></li><li>انتقل إلى <a href="/download">photovideo.ae/download</a> والصق الرابط</li><li>انقر <strong>تحميل الآن</strong></li><li>بعد المعالجة، انقر <strong>تحميل</strong> لحفظ الملف</li></ol><h2>الحفظ في Google Drive</h2><ol><li>الصق رابط Shorts</li><li>اختر تبويب <strong>الحفظ على السحابة</strong></li><li>سجّل الدخول بـ Google Drive وانقر <strong>حفظ في Google Drive</strong></li></ol><h2>الأسئلة الشائعة</h2><dl><dt>هل هو مجاني؟</dt><dd>نعم، مجاني تماماً.</dd><dt>هل يعمل على iPhone وAndroid؟</dt><dd>نعم — افتح الصفحة في أي متصفح محمول والصق الرابط.</dd><dt>ما جودة التحميل؟</dt><dd>أعلى جودة متاحة لذلك Shorts.</dd></dl>'},
    { 'id': 'guide-mp3',
      'title': 'كيفية استخراج صوت MP3 من يوتيوب — مجاناً',
      'description': 'حمّل ملف MP3 من أي مقطع يوتيوب مجاناً. مثالي للأغاني والبودكاست والمحاضرات. بدون تطبيق.',
      'keywords': 'يوتيوب إلى mp3, استخراج صوت من يوتيوب, تحميل أغنية من يوتيوب, يوتيوب mp3 مجاني',
      'body': '<p>تريد الاستماع لمقطع يوتيوب بدون مشاهدة الفيديو؟ سواء كانت أغنية أو بودكاست أو محاضرة، استخرج الصوت مجاناً باستخدام <strong>YT2GDrive</strong>.</p><h2>خطوات تحميل MP3 من يوتيوب</h2><ol><li>ابحث عن المقطع على يوتيوب</li><li>انسخ رابط الفيديو من شريط العنوان</li><li>انتقل إلى <a href="/download">photovideo.ae/download</a> والصق الرابط</li><li>انقر <strong>تحميل الآن</strong></li><li>عند الانتهاء، انقر <strong>تحميل</strong> — ستحصل على ملف MP4 بأفضل جودة صوتية</li></ol><p><strong>نصيحة:</strong> معظم مشغلات الوسائط (VLC) يمكنها تشغيل MP4 كملف صوتي مباشرة.</p><h2>الحفظ في Google Drive</h2><ol><li>الصق رابط يوتيوب</li><li>اختر <strong>الحفظ على السحابة</strong></li><li>سجّل الدخول بـ Google Drive وانقر <strong>حفظ في Google Drive</strong></li></ol><h2>الأسئلة الشائعة</h2><dl><dt>هل هو مجاني؟</dt><dd>نعم، مجاني تماماً.</dd><dt>ما جودة الصوت؟</dt><dd>أفضل جودة صوتية متاحة، عادةً 128–320 kbps.</dd></dl>'},
    { 'id': 'guide-android',
      'title': 'كيفية تحميل مقاطع يوتيوب على هاتف أندرويد — مجاناً',
      'description': 'دليل خطوة بخطوة لحفظ مقاطع يوتيوب على هاتفك الأندرويد مجاناً. لا تطبيق مطلوب، يعمل على جميع أجهزة أندرويد.',
      'keywords': 'تحميل يوتيوب على أندرويد, يوتيوب downloader أندرويد, حفظ فيديو يوتيوب للموبايل, تنزيل يوتيوب أندرويد مجاني',
      'body': '<p>لا تحتاج إلى أي تطبيق أو APK — <strong>YT2GDrive</strong> يعمل مباشرة في متصفح أندرويد، سواء Chrome أو Firefox أو غيره.</p><h2>تحميل مقاطع يوتيوب على أندرويد</h2><ol><li>افتح تطبيق <strong>يوتيوب</strong> وابحث عن الفيديو</li><li>اضغط <strong>مشاركة → نسخ الرابط</strong></li><li>افتح <strong>Chrome</strong> أو أي متصفح وانتقل إلى <a href="/download">photovideo.ae/download</a></li><li>الصق الرابط في حقل الإدخال</li><li>اضغط <strong>تحميل الآن</strong></li><li>انتظر المعالجة (30–60 ثانية عادةً)</li><li>اضغط <strong>تحميل</strong> — سيُحفظ ملف MP4 في مجلد التنزيلات</li></ol><h2>الحفظ في Google Drive</h2><ol><li>الصق رابط يوتيوب</li><li>اضغط <strong>الحفظ على السحابة</strong></li><li>سجّل الدخول بـ Google Drive (مرة واحدة)</li><li>اضغط <strong>حفظ في Google Drive</strong></li></ol><h2>الأسئلة الشائعة</h2><dl><dt>هل يلزم تثبيت أي شيء؟</dt><dd>لا — استخدم متصفح هاتفك فقط.</dd><dt>أين يُحفظ الفيديو المحمّل؟</dt><dd>في مجلد التنزيلات بهاتفك، يمكن فتحه من تطبيق الملفات.</dd><dt>ما أعلى جودة متاحة؟</dt><dd>حتى 1080p HD لمعظم المقاطع.</dd></dl>'},
  ],
  'es': [
    { 'id': 'guide-download',
      'title': 'Cómo descargar un vídeo de YouTube',
      'description': 'Guía paso a paso para descargar cualquier vídeo de YouTube gratis en HD. Sin instalación.',
      'keywords': 'como descargar video youtube, descargador youtube gratis, youtube a mp4',
      'body': '<p>Descarga vídeos de YouTube gratis siguiendo estos pasos:</p><ol><li>Encuentra el vídeo que quieres en YouTube</li><li>Copia la URL del vídeo desde la barra de direcciones</li><li>Pégala en el campo de la <a href="/download">página principal</a></li><li>Selecciona <strong>Descargar al Ordenador</strong></li><li>Haz clic en <strong>Descargar Ahora</strong></li><li>Cuando esté listo, descarga el archivo MP4</li></ol><p>Sin instalación de software. Compatible con calidad HD y 4K.</p><h2>Preguntas frecuentes</h2><dl><dt>¿Es gratuito?</dt><dd>Sí, completamente gratis sin límites.</dd><dt>¿Qué calidad?</dt><dd>Seleccionamos automáticamente el mejor formato disponible, hasta 4K.</dd></dl>'},
    { 'id': 'guide-cloud',
      'title': 'Cómo guardar un vídeo de YouTube en Google Drive',
      'description': 'Sube vídeos de YouTube directamente a Google Drive sin usar almacenamiento local.',
      'keywords': 'guardar youtube en google drive, subir youtube a drive, youtube google drive gratis',
      'body': '<p>Guarda vídeos de YouTube directamente en Google Drive sin usar almacenamiento local.</p><ol><li>Pega la URL de YouTube en la <a href="/download">página principal</a></li><li>Haz clic en <strong>Guardar en la Nube</strong></li><li>Conecta tu cuenta de Google Drive</li><li>Elige una carpeta (opcional)</li><li>Haz clic en <strong>Guardar en Google Drive</strong></li></ol><h2>Ventajas</h2><dl><dt>Sin almacenamiento local</dt><dd>El archivo va directamente a Drive sin pasar por tu disco duro.</dd><dt>Acceso desde cualquier lugar</dt><dd>Ve o comparte desde cualquier teléfono, tablet u ordenador.</dd></dl>'},
    { 'id': 'guide-device',
      'title': 'Cómo descargar vídeos de YouTube al PC o móvil',
      'description': 'Guarda vídeos de YouTube como archivos MP4 en Windows, Mac, iPhone o Android.',
      'keywords': 'descargar youtube al pc, descargar youtube al movil, youtube mp4 iphone android',
      'body': '<p>Descarga vídeos de YouTube en tu PC o móvil para verlos sin internet.</p><h2>En ordenador (Windows/Mac):</h2><ol><li>Copia la URL del vídeo de YouTube</li><li>Pégala en la <a href="/download">página principal</a> y haz clic en Descargar</li><li>El archivo MP4 se guarda en tu carpeta de Descargas</li></ol><h2>En móvil (iPhone/Android):</h2><ol><li>Abre el vídeo en YouTube y toca <strong>Compartir → Copiar enlace</strong></li><li>Abre esta página en el navegador de tu móvil</li><li>Pega el enlace y descarga el vídeo</li></ol>'},
    { 'id': 'guide-tiktok',
      'title': 'Cómo descargar vídeos de TikTok gratis — Sin marca de agua',
      'description': 'Descarga cualquier vídeo de TikTok gratis a tu móvil o PC. Sin instalar apps. Rápido y sencillo.',
      'keywords': 'descargar video tiktok, tiktok sin marca de agua, guardar tiktok mp4, descargador tiktok',
      'body': '<p>¿Quieres guardar un vídeo de TikTok? Con <strong>YT2GDrive</strong> puedes descargar cualquier vídeo de TikTok gratis.</p><h2>Pasos para descargar un vídeo de TikTok</h2><ol><li>Abre TikTok y encuentra el vídeo</li><li>Toca <strong>Compartir</strong> → <strong>Copiar enlace</strong></li><li>Ve a <a href="/download">photovideo.ae/download</a> y pega el enlace</li><li>Selecciona <strong>Descargar al Ordenador</strong> y haz clic en <strong>Descargar Ahora</strong></li><li>Una vez procesado, descarga el archivo MP4</li></ol><h2>Guardar en Google Drive</h2><ol><li>Pega el enlace de TikTok</li><li>Cambia a la pestaña <strong>Guardar en la Nube</strong></li><li>Conecta Google Drive y guarda el vídeo</li></ol><h2>Preguntas frecuentes</h2><dl><dt>¿Es gratuito?</dt><dd>Sí, completamente gratis.</dd><dt>¿Puedo descargar vídeos privados?</dt><dd>No, solo vídeos públicos.</dd></dl>'},
    { 'id': 'guide-instagram',
      'title': 'Cómo descargar vídeos de Instagram y Reels',
      'description': 'Guarda Reels de Instagram, vídeos y Stories gratis en tu móvil o PC. Sin instalar apps.',
      'keywords': 'descargar video instagram, descargar reels instagram, instagram downloader gratis, guardar instagram mp4',
      'body': '<p>¿Quieres guardar Reels o vídeos de Instagram? Con <strong>YT2GDrive</strong> descargas cualquier contenido público de Instagram gratis.</p><h2>Pasos para descargar Reels de Instagram</h2><ol><li>Abre Instagram y encuentra el Reel o vídeo</li><li>Toca los <strong>tres puntos (…)</strong> → <strong>Copiar enlace</strong></li><li>Ve a <a href="/download">photovideo.ae/download</a> y pega el enlace</li><li>Selecciona <strong>Descargar al Ordenador</strong> y haz clic en <strong>Descargar Ahora</strong></li><li>Una vez listo, descarga el archivo MP4</li></ol><h2>Guardar en Google Drive</h2><ol><li>Pega el enlace de Instagram</li><li>Cambia a <strong>Guardar en la Nube</strong></li><li>Conecta Google Drive y guarda</li></ol><h2>Preguntas frecuentes</h2><dl><dt>¿Es gratuito?</dt><dd>Sí, completamente gratis.</dd><dt>¿Funciona con cuentas privadas?</dt><dd>No, solo con contenido público.</dd></dl>'},
    { 'id': 'guide-other',
      'title': 'Descargar vídeos de cualquier web — Twitter, Facebook, Vimeo y más',
      'description': 'Descarga vídeos de más de 1000 webs, incluyendo Twitter/X, Facebook, Vimeo, Dailymotion y más. Gratis.',
      'keywords': 'descargar video de cualquier web, descargador twitter, descargar video facebook, vimeo downloader, dailymotion downloader',
      'body': '<p><strong>YT2GDrive</strong> soporta más de 1000 plataformas de vídeo. Si hay un vídeo en internet, probablemente puedas descargarlo aquí gratis.</p><h2>Plataformas soportadas</h2><ul><li><strong>YouTube</strong> — todos los vídeos</li><li><strong>Instagram</strong> — Reels y vídeos</li><li><strong>TikTok</strong> — todos los vídeos públicos</li><li><strong>Twitter/X</strong> — vídeos incrustados</li><li><strong>Facebook</strong> — vídeos públicos</li><li><strong>Vimeo</strong></li><li><strong>Dailymotion</strong></li><li><strong>Reddit</strong> — publicaciones de vídeo</li><li>Y más de 1000 sitios más</li></ul><h2>Cómo descargar</h2><ol><li>Copia la URL de la página del vídeo</li><li>Ve a <a href="/download">photovideo.ae/download</a> y pega la URL</li><li>Haz clic en <strong>Descargar Ahora</strong></li><li>Guarda el archivo MP4</li></ol><h2>Preguntas frecuentes</h2><dl><dt>¿Es gratuito?</dt><dd>Sí, completamente gratis para todos los sitios.</dd></dl>'},
    { 'id': 'guide-professionals',
      'title': 'Descargador de vídeo seguro para periodistas y profesionales de los medios',
      'description': 'Por qué periodistas, documentalistas e investigadores de medios confían en YT2GDrive. Verificado por Google, sin malware, flujo de trabajo seguro en la nube.',
      'keywords': 'descargador video seguro periodistas, herramienta profesional medios, descargador verificado google',
      'body': '<h2>El peligro oculto de los descargadores de vídeo populares</h2><p>Busca "descargador de vídeo" y encontrarás decenas de sitios. Los investigadores de seguridad han documentado que muchos distribuyen <strong>malware disfrazado de botones de descarga</strong>, roban contraseñas, redirigen a páginas de phishing y recopilan datos de tu dispositivo.</p><p>Para un <strong>periodista, documentalista o investigador de medios</strong>, esto puede ser catastrófico.</p><h2>Por qué YT2GDrive es diferente</h2><ul><li><strong>OAuth 2.0 verificado por Google</strong> — nuestra integración ha superado el proceso oficial de verificación de Google.</li><li><strong>Sin software que instalar</strong> — no hay extensiones ni ejecutables.</li><li><strong>Backend de código abierto</strong> — basado en <a href="https://github.com/yt-dlp/yt-dlp" rel="noopener">yt-dlp</a>.</li></ul><h2>Flujo de trabajo profesional</h2><p>Con <strong>Guardar en la Nube</strong>, el contenido descargado va directamente a Google Drive sin pasar por tu dispositivo local — ideal para periodismo de investigación y documentales.</p>'},
    { 'id': 'guide-shorts',
      'title': 'Cómo descargar vídeos de YouTube Shorts — Gratis',
      'description': 'Guarda cualquier YouTube Shorts en tu móvil o PC gratis. Sin app, sin marca de agua.',
      'keywords': 'descargar youtube shorts, guardar shorts youtube, youtube shorts mp4 gratis, descargar shorts sin marca de agua',
      'body': '<p>YouTube Shorts son vídeos cortos de hasta 60 segundos y están entre los más vistos de YouTube. Con <strong>YT2GDrive</strong>, descarga cualquier Shorts en segundos — gratis, sin app, sin marca de agua.</p><h2>Cómo descargar YouTube Shorts</h2><ol><li>Abre YouTube y encuentra el Shorts que quieres guardar</li><li>En el móvil: toca <strong>Compartir → Copiar enlace</strong></li><li>Ve a <a href="/download">photovideo.ae/download</a> y pega el enlace</li><li>Haz clic en <strong>Descargar Ahora</strong></li><li>Cuando esté listo, descarga el archivo MP4</li></ol><h2>Guardar en Google Drive</h2><ol><li>Pega el enlace del Shorts</li><li>Cambia a la pestaña <strong>Guardar en la Nube</strong></li><li>Conecta Google Drive y haz clic en <strong>Guardar en Google Drive</strong></li></ol><h2>Preguntas frecuentes</h2><dl><dt>¿Es gratuito?</dt><dd>Sí, completamente gratis.</dd><dt>¿Funciona en iPhone y Android?</dt><dd>Sí — abre la página en el navegador móvil, pega el enlace y descarga.</dd><dt>¿Con qué calidad se descarga?</dt><dd>La máxima calidad disponible para ese Shorts.</dd></dl>'},
    { 'id': 'guide-mp3',
      'title': 'Cómo extraer audio MP3 de vídeos de YouTube — Gratis',
      'description': 'Descarga el audio MP3 de cualquier vídeo de YouTube gratis. Perfecto para música, podcasts y clases. Sin instalar apps.',
      'keywords': 'youtube a mp3, descargar mp3 youtube, extraer audio youtube, youtube mp3 gratis, convertir youtube mp3',
      'body': '<p>¿Quieres escuchar un vídeo de YouTube sin verlo? Tanto si es música, un podcast o una clase, extrae el audio con <strong>YT2GDrive</strong> — gratis, sin app.</p><h2>Cómo descargar MP3 de YouTube</h2><ol><li>Encuentra el vídeo de YouTube cuyo audio quieres</li><li>Copia la URL de la barra de direcciones</li><li>Ve a <a href="/download">photovideo.ae/download</a> y pega la URL</li><li>Haz clic en <strong>Descargar Ahora</strong></li><li>Cuando esté listo, haz clic en <strong>Descargar</strong> — obtendrás un MP4 con el mejor audio disponible</li></ol><p><strong>Consejo:</strong> La mayoría de reproductores (VLC, Windows Media Player) pueden reproducir MP4 directamente como audio.</p><h2>Guardar en Google Drive</h2><ol><li>Pega el enlace del vídeo</li><li>Cambia a <strong>Guardar en la Nube</strong></li><li>Conecta Google Drive y guarda</li></ol><h2>Preguntas frecuentes</h2><dl><dt>¿Es gratuito?</dt><dd>Sí, completamente gratis.</dd><dt>¿Qué calidad de audio obtengo?</dt><dd>La mejor calidad disponible, normalmente equivalente a 128–320 kbps.</dd></dl>'},
    { 'id': 'guide-android',
      'title': 'Cómo descargar vídeos de YouTube en Android — Gratis',
      'description': 'Guía paso a paso para guardar vídeos de YouTube en tu móvil Android gratis. Sin instalar apps, funciona en todos los Android.',
      'keywords': 'descargar youtube android, youtube downloader android, guardar youtube movil android, youtube mp4 android gratis',
      'body': '<p>No necesitas ninguna app ni APK — <strong>YT2GDrive</strong> funciona directamente en el navegador de Android, ya sea Chrome, Firefox o cualquier otro.</p><h2>Cómo descargar YouTube en Android</h2><ol><li>Abre la app de <strong>YouTube</strong> en tu Android</li><li>Toca <strong>Compartir → Copiar enlace</strong></li><li>Abre <strong>Chrome</strong> o cualquier navegador y ve a <a href="/download">photovideo.ae/download</a></li><li>Pega el enlace copiado</li><li>Toca <strong>Descargar Ahora</strong></li><li>Espera el procesamiento (30–60 segundos)</li><li>Toca <strong>Descargar</strong> — el MP4 se guarda en tu carpeta Descargas</li></ol><h2>Guardar en Google Drive</h2><ol><li>Pega el enlace de YouTube</li><li>Toca <strong>Guardar en la Nube</strong></li><li>Conecta Google Drive (configuración única)</li><li>Toca <strong>Guardar en Google Drive</strong></li></ol><h2>Preguntas frecuentes</h2><dl><dt>¿Hay que instalar algo?</dt><dd>No — solo usa el navegador de tu móvil.</dd><dt>¿Dónde se guarda el vídeo?</dt><dd>En la carpeta Descargas de tu móvil.</dd><dt>¿Qué calidad máxima tiene?</dt><dd>Hasta 1080p HD para la mayoría de vídeos.</dd></dl>'},
  ],
  'de': [
    { 'id': 'guide-download',
      'title': 'Wie man ein YouTube-Video herunterlädt',
      'description': 'Schritt-für-Schritt-Anleitung zum kostenlosen Herunterladen beliebiger YouTube-Videos in HD.',
      'keywords': 'youtube video herunterladen, youtube downloader kostenlos, youtube zu mp4',
      'body': '<p>YouTube-Videos kostenlos herunterladen – so geht\'s:</p><ol><li>Öffne das gewünschte Video auf YouTube</li><li>Kopiere die URL aus der Adressleiste</li><li>Füge sie in das Feld auf der <a href="/download">Hauptseite</a> ein</li><li>Wähle <strong>Auf Computer herunterladen</strong></li><li>Klicke auf <strong>Jetzt herunterladen</strong></li><li>Lade die MP4-Datei nach der Verarbeitung herunter</li></ol><p>Keine Installation nötig. Unterstützt HD- und 4K-Qualität.</p><h2>Häufige Fragen</h2><dl><dt>Ist es kostenlos?</dt><dd>Ja — komplett kostenlos ohne Einschränkungen.</dd><dt>Welche Qualität?</dt><dd>Wir wählen automatisch das beste verfügbare Format, bis zu 4K.</dd></dl>'},
    { 'id': 'guide-cloud',
      'title': 'YouTube-Videos in Google Drive speichern',
      'description': 'YouTube-Videos direkt in Google Drive hochladen, ohne lokalen Speicher zu verwenden.',
      'keywords': 'youtube in google drive speichern, youtube hochladen drive, youtube cloud kostenlos',
      'body': '<p>Speichere YouTube-Videos direkt in Google Drive – ohne lokalen Speicher zu verbrauchen.</p><ol><li>Füge die YouTube-URL auf der <a href="/download">Hauptseite</a> ein</li><li>Wähle <strong>In der Cloud speichern</strong></li><li>Melde dich mit Google Drive an</li><li>Wähle optional einen Ordner</li><li>Klicke auf <strong>In Google Drive speichern</strong></li></ol><h2>Vorteile</h2><dl><dt>Kein lokaler Speicher</dt><dd>Die Datei geht direkt in Drive — ohne deine Festplatte zu berühren.</dd><dt>Zugriff überall</dt><dd>Schaue oder teile von jedem Gerät.</dd></dl>'},
    { 'id': 'guide-device',
      'title': 'YouTube-Videos auf PC oder Handy herunterladen',
      'description': 'YouTube-Videos als MP4-Dateien auf Windows, Mac, iPhone oder Android speichern.',
      'keywords': 'youtube auf pc herunterladen, youtube auf handy herunterladen, youtube mp4 iphone android',
      'body': '<p>Lade YouTube-Videos auf PC oder Handy für die Offline-Wiedergabe.</p><h2>Am Computer (Windows/Mac):</h2><ol><li>Kopiere die Video-URL von YouTube</li><li>Füge sie auf der <a href="/download">Hauptseite</a> ein und klicke auf Herunterladen</li><li>Die MP4-Datei wird in deinen Downloads gespeichert</li></ol><h2>Auf dem Handy (iPhone/Android):</h2><ol><li>Tippe in YouTube auf <strong>Teilen → Link kopieren</strong></li><li>Öffne diese Seite im mobilen Browser</li><li>Füge den Link ein und lade das Video herunter</li></ol>'},
    { 'id': 'guide-tiktok',
      'title': 'TikTok-Videos herunterladen — Kostenlos, ohne Wasserzeichen',
      'description': 'Lade TikTok-Videos kostenlos auf dein Handy oder PC herunter. Kein App-Download nötig.',
      'keywords': 'tiktok video herunterladen, tiktok ohne wasserzeichen, tiktok downloader kostenlos, tiktok mp4',
      'body': '<p>Möchtest du ein TikTok-Video speichern? Mit <strong>YT2GDrive</strong> lädst du jedes TikTok-Video kostenlos herunter.</p><h2>TikTok-Video herunterladen – So geht\'s</h2><ol><li>Öffne TikTok und finde das gewünschte Video</li><li>Tippe auf <strong>Teilen</strong> → <strong>Link kopieren</strong></li><li>Gehe zu <a href="/download">photovideo.ae/download</a> und füge den Link ein</li><li>Wähle <strong>Auf Computer herunterladen</strong> und klicke <strong>Jetzt herunterladen</strong></li><li>Nach der Verarbeitung die MP4-Datei herunterladen</li></ol><h2>In Google Drive speichern</h2><ol><li>TikTok-Link einfügen</li><li>Tab <strong>In der Cloud speichern</strong> wählen</li><li>Google Drive verbinden und speichern</li></ol><h2>Häufige Fragen</h2><dl><dt>Ist es kostenlos?</dt><dd>Ja, völlig kostenlos.</dd><dt>Kann ich private Videos herunterladen?</dt><dd>Nein, nur öffentliche Videos.</dd></dl>'},
    { 'id': 'guide-instagram',
      'title': 'Instagram-Videos und Reels herunterladen',
      'description': 'Speichere Instagram-Reels, Videos und Stories kostenlos auf dein Handy oder PC. Keine App nötig.',
      'keywords': 'instagram video herunterladen, instagram reels downloaden, instagram downloader kostenlos, instagram mp4',
      'body': '<p>Möchtest du Instagram-Reels oder Videos speichern? Mit <strong>YT2GDrive</strong> lädst du beliebige öffentliche Instagram-Inhalte kostenlos herunter.</p><h2>Instagram-Reels herunterladen – So geht\'s</h2><ol><li>Öffne Instagram und finde das Reel oder Video</li><li>Tippe auf die <strong>drei Punkte (…)</strong> → <strong>Link kopieren</strong></li><li>Gehe zu <a href="/download">photovideo.ae/download</a> und füge den Link ein</li><li>Wähle <strong>Auf Computer herunterladen</strong> und klicke <strong>Jetzt herunterladen</strong></li><li>Die MP4-Datei nach der Verarbeitung herunterladen</li></ol><h2>In Google Drive speichern</h2><ol><li>Instagram-Link einfügen</li><li>Tab <strong>In der Cloud speichern</strong> wählen</li><li>Google Drive verbinden und speichern</li></ol><h2>Häufige Fragen</h2><dl><dt>Ist es kostenlos?</dt><dd>Ja, völlig kostenlos.</dd><dt>Funktioniert es mit privaten Konten?</dt><dd>Nein, nur öffentliche Inhalte werden unterstützt.</dd></dl>'},
    { 'id': 'guide-other',
      'title': 'Videos von jeder Website herunterladen — Twitter, Facebook, Vimeo & mehr',
      'description': 'Lade Videos von über 1000 Websites herunter, darunter Twitter/X, Facebook, Vimeo und Dailymotion. Kostenlos.',
      'keywords': 'video von beliebiger website herunterladen, twitter video herunterladen, facebook video herunterladen, vimeo downloader, online video downloader',
      'body': '<p><strong>YT2GDrive</strong> unterstützt über 1000 Video-Plattformen. Fast jedes Online-Video kann kostenlos heruntergeladen werden.</p><h2>Unterstützte Plattformen</h2><ul><li><strong>YouTube</strong> — alle Videos</li><li><strong>Instagram</strong> — Reels und Videos</li><li><strong>TikTok</strong> — alle öffentlichen Videos</li><li><strong>Twitter/X</strong> — eingebettete Videos</li><li><strong>Facebook</strong> — öffentliche Videos</li><li><strong>Vimeo</strong></li><li><strong>Dailymotion</strong></li><li><strong>Reddit</strong> — Video-Posts</li><li>Und 1000+ weitere Seiten</li></ul><h2>So lädst du Videos herunter</h2><ol><li>Kopiere die URL der Video-Seite</li><li>Gehe zu <a href="/download">photovideo.ae/download</a> und füge die URL ein</li><li>Klicke auf <strong>Jetzt herunterladen</strong></li><li>Speichere die MP4-Datei</li></ol><h2>Häufige Fragen</h2><dl><dt>Ist es kostenlos?</dt><dd>Ja, kostenlos für alle unterstützten Seiten.</dd></dl>'},
    { 'id': 'guide-professionals',
      'title': 'Sicherer Video-Downloader für Journalisten und Medienprofis',
      'description': 'Warum Journalisten, Dokumentarfilmer und Medienrechercheure YT2GDrive vertrauen. Google-verifiziert, kein Malware, sicherer Cloud-Workflow.',
      'keywords': 'sicherer video downloader journalisten, medienprofi video download, google verifizierter downloader',
      'body': '<h2>Die versteckte Gefahr populärer Video-Downloader-Seiten</h2><p>Suche nach "Video-Downloader" und du findest Dutzende Seiten. Sicherheitsforscher haben dokumentiert, dass viele davon <strong>Malware als Download-Buttons tarnen</strong>, Passwörter stehlen, auf Phishing-Seiten weiterleiten und Gerätedaten heimlich sammeln.</p><p>Für <strong>Journalisten, Dokumentarfilmer oder Medienrechercheure</strong> kann dies katastrophale Folgen haben.</p><h2>Warum YT2GDrive anders ist</h2><ul><li><strong>Google-verifiziertes OAuth 2.0</strong> — unsere Integration hat Googles offizielle App-Verifizierung bestanden.</li><li><strong>Keine Software zu installieren</strong> — keine Erweiterungen, keine ausführbaren Dateien.</li><li><strong>Open-Source-Backend</strong> — basiert auf <a href="https://github.com/yt-dlp/yt-dlp" rel="noopener">yt-dlp</a>.</li></ul><h2>Professioneller Workflow</h2><p>Mit <strong>In der Cloud speichern</strong> geht heruntergeladener Inhalt direkt in Google Drive — ideal für investigativen Journalismus und Dokumentarfilm-Recherche.</p>'},
    { 'id': 'guide-shorts',
      'title': 'YouTube Shorts herunterladen — Kostenlos',
      'description': 'Speichere beliebige YouTube Shorts kostenlos auf dem Handy oder PC. Keine App, kein Wasserzeichen.',
      'keywords': 'youtube shorts herunterladen, youtube shorts speichern, shorts video download kostenlos, youtube shorts mp4',
      'body': '<p>YouTube Shorts sind bis zu 60 Sekunden lange Kurzvideos und gehören zu den meistgesehenen Inhalten auf YouTube. Mit <strong>YT2GDrive</strong> lädst du jeden Shorts kostenlos herunter — ohne App, ohne Wasserzeichen.</p><h2>YouTube Shorts herunterladen – So geht\'s</h2><ol><li>Öffne YouTube und finde den Shorts, den du speichern möchtest</li><li>Auf dem Handy: Tippe auf <strong>Teilen → Link kopieren</strong></li><li>Gehe zu <a href="/download">photovideo.ae/download</a> und füge den Link ein</li><li>Klicke auf <strong>Jetzt herunterladen</strong></li><li>Nach der Verarbeitung die MP4-Datei herunterladen</li></ol><h2>In Google Drive speichern</h2><ol><li>Shorts-Link einfügen</li><li>Tab <strong>In der Cloud speichern</strong> wählen</li><li>Google Drive verbinden und <strong>In Google Drive speichern</strong> klicken</li></ol><h2>Häufige Fragen</h2><dl><dt>Ist es kostenlos?</dt><dd>Ja, komplett kostenlos.</dd><dt>Funktioniert es auf iPhone und Android?</dt><dd>Ja — Seite im mobilen Browser öffnen, Link einfügen und herunterladen.</dd><dt>In welcher Qualität wird der Shorts heruntergeladen?</dt><dd>In der höchsten verfügbaren Qualität.</dd></dl>'},
    { 'id': 'guide-mp3',
      'title': 'MP3-Audio aus YouTube-Videos extrahieren — Kostenlos',
      'description': 'Lade MP3-Audio von beliebigen YouTube-Videos kostenlos herunter. Perfekt für Musik, Podcasts und Vorlesungen. Keine App nötig.',
      'keywords': 'youtube zu mp3, youtube mp3 download, audio von youtube extrahieren, youtube mp3 kostenlos, youtube musik herunterladen',
      'body': '<p>Möchtest du ein YouTube-Video nur hören, ohne es anzuschauen? Mit <strong>YT2GDrive</strong> extrahierst du das Audio kostenlos — Musik, Podcasts, Vorlesungen, alles kein Problem.</p><h2>MP3 von YouTube herunterladen – So geht\'s</h2><ol><li>Finde das YouTube-Video, dessen Audio du willst</li><li>Kopiere die URL aus der Adressleiste</li><li>Gehe zu <a href="/download">photovideo.ae/download</a> und füge die URL ein</li><li>Klicke auf <strong>Jetzt herunterladen</strong></li><li>Wenn fertig, klicke auf <strong>Herunterladen</strong> — du erhältst eine MP4-Datei mit dem besten verfügbaren Audio</li></ol><p><strong>Tipp:</strong> Die meisten Mediaplayer (VLC, Windows Media Player) können MP4-Dateien direkt als Audio abspielen.</p><h2>In Google Drive speichern</h2><ol><li>YouTube-Video-Link einfügen</li><li>Tab <strong>In der Cloud speichern</strong> wählen</li><li>Google Drive verbinden und speichern</li></ol><h2>Häufige Fragen</h2><dl><dt>Ist es kostenlos?</dt><dd>Ja, völlig kostenlos.</dd><dt>Welche Audioqualität bekomme ich?</dt><dd>Die beste verfügbare Qualität, typischerweise äquivalent zu 128–320 kbps.</dd></dl>'},
    { 'id': 'guide-android',
      'title': 'YouTube-Videos auf Android-Handy herunterladen — Kostenlos',
      'description': 'Schritt-für-Schritt-Anleitung zum kostenlosen Speichern von YouTube-Videos auf Android. Keine App nötig, funktioniert auf allen Android-Geräten.',
      'keywords': 'youtube auf android herunterladen, youtube downloader android, youtube video android speichern, android youtube download kostenlos',
      'body': '<p>Du brauchst keine App oder APK — <strong>YT2GDrive</strong> funktioniert direkt im Android-Browser, egal ob Chrome, Firefox oder andere.</p><h2>YouTube-Videos auf Android herunterladen</h2><ol><li>Öffne die <strong>YouTube-App</strong> auf deinem Android</li><li>Tippe auf <strong>Teilen → Link kopieren</strong></li><li>Öffne <strong>Chrome</strong> oder einen anderen Browser und gehe zu <a href="/download">photovideo.ae/download</a></li><li>Füge den kopierten Link ein</li><li>Tippe auf <strong>Jetzt herunterladen</strong></li><li>Warte auf die Verarbeitung (30–60 Sekunden)</li><li>Tippe auf <strong>Herunterladen</strong> — die MP4-Datei wird im Downloads-Ordner gespeichert</li></ol><h2>In Google Drive speichern</h2><ol><li>YouTube-Link einfügen</li><li><strong>In der Cloud speichern</strong> antippen</li><li>Google Drive verbinden (einmalige Einrichtung)</li><li><strong>In Google Drive speichern</strong> antippen</li></ol><h2>Häufige Fragen</h2><dl><dt>Muss ich etwas installieren?</dt><dd>Nein — einfach den Browser deines Handys verwenden.</dd><dt>Wo wird das Video gespeichert?</dt><dd>Im Downloads-Ordner deines Handys.</dd><dt>Welche Qualität ist maximal möglich?</dt><dd>Bis zu 1080p HD für die meisten Videos.</dd></dl>'},
  ],
  'fr': [
    { 'id': 'guide-download',
      'title': 'Comment télécharger une vidéo YouTube',
      'description': 'Guide étape par étape pour télécharger gratuitement n\'importe quelle vidéo YouTube en HD.',
      'keywords': 'comment télécharger video youtube, téléchargeur youtube gratuit, youtube mp4 gratuit',
      'body': '<p>Téléchargez des vidéos YouTube gratuitement en quelques étapes :</p><ol><li>Trouvez la vidéo sur YouTube</li><li>Copiez l\'URL depuis la barre d\'adresse</li><li>Collez-la dans le champ de la <a href="/download">page principale</a></li><li>Choisissez <strong>Télécharger sur l\'Ordinateur</strong></li><li>Cliquez sur <strong>Télécharger maintenant</strong></li><li>Une fois prêt, téléchargez le fichier MP4</li></ol><p>Aucun logiciel à installer. Qualité HD et 4K disponible.</p><h2>Questions fréquentes</h2><dl><dt>Est-ce gratuit ?</dt><dd>Oui, complètement gratuit sans limites.</dd><dt>Quelle qualité ?</dt><dd>Nous sélectionnons automatiquement le meilleur format, jusqu\'en 4K.</dd></dl>'},
    { 'id': 'guide-cloud',
      'title': 'Comment sauvegarder une vidéo YouTube dans Google Drive',
      'description': 'Envoyez des vidéos YouTube directement dans Google Drive sans stockage local.',
      'keywords': 'sauvegarder youtube dans google drive, youtube vers drive gratuit, uploader youtube drive',
      'body': '<p>Enregistrez des vidéos YouTube directement dans Google Drive sans occuper d\'espace local.</p><ol><li>Collez l\'URL YouTube sur la <a href="/download">page principale</a></li><li>Cliquez sur <strong>Sauvegarder dans le Cloud</strong></li><li>Connectez votre compte Google Drive</li><li>Choisissez un dossier (optionnel)</li><li>Cliquez sur <strong>Sauvegarder dans Google Drive</strong></li></ol><h2>Avantages</h2><dl><dt>Pas de stockage local</dt><dd>Le fichier va directement dans Drive.</dd><dt>Accès partout</dt><dd>Regardez ou partagez depuis n\'importe quel appareil.</dd></dl>'},
    { 'id': 'guide-device',
      'title': 'Comment télécharger des vidéos YouTube sur PC ou téléphone',
      'description': 'Enregistrez des vidéos YouTube en MP4 sur Windows, Mac, iPhone ou Android.',
      'keywords': 'télécharger youtube sur pc, télécharger youtube sur telephone, youtube mp4 iphone android',
      'body': '<p>Téléchargez des vidéos YouTube sur PC ou mobile pour les regarder hors connexion.</p><h2>Sur ordinateur (Windows/Mac) :</h2><ol><li>Copiez l\'URL de la vidéo YouTube</li><li>Collez-la sur la <a href="/download">page principale</a> et cliquez sur Télécharger</li><li>Le fichier MP4 est enregistré dans votre dossier Téléchargements</li></ol><h2>Sur mobile (iPhone/Android) :</h2><ol><li>Dans YouTube, appuyez sur <strong>Partager → Copier le lien</strong></li><li>Ouvrez cette page dans le navigateur mobile</li><li>Collez le lien et téléchargez la vidéo</li></ol>'},
    { 'id': 'guide-tiktok',
      'title': 'Comment télécharger des vidéos TikTok — Gratuit, sans filigrane',
      'description': "Téléchargez n'importe quelle vidéo TikTok gratuitement sur votre téléphone ou PC. Sans application.",
      'keywords': 'télécharger video tiktok, tiktok sans filigrane, enregistrer tiktok mp4, tiktok downloader gratuit',
      'body': "<p>Vous voulez sauvegarder une vidéo TikTok ? Avec <strong>YT2GDrive</strong>, téléchargez n'importe quelle vidéo TikTok gratuitement.</p><h2>Étapes pour télécharger une vidéo TikTok</h2><ol><li>Ouvrez TikTok et trouvez la vidéo</li><li>Appuyez sur <strong>Partager</strong> → <strong>Copier le lien</strong></li><li>Allez sur <a href='/download'>photovideo.ae/download</a> et collez le lien</li><li>Choisissez <strong>Télécharger sur l'Ordinateur</strong> et cliquez sur <strong>Télécharger maintenant</strong></li><li>Une fois prêt, téléchargez le fichier MP4</li></ol><h2>Sauvegarder dans Google Drive</h2><ol><li>Collez le lien TikTok</li><li>Passez à l'onglet <strong>Sauvegarder dans le Cloud</strong></li><li>Connectez Google Drive et sauvegardez</li></ol><h2>Questions fréquentes</h2><dl><dt>Est-ce gratuit ?</dt><dd>Oui, complètement gratuit.</dd><dt>Puis-je télécharger des vidéos privées ?</dt><dd>Non, uniquement les vidéos publiques.</dd></dl>"},
    { 'id': 'guide-instagram',
      'title': 'Comment télécharger des vidéos Instagram et Reels',
      'description': "Enregistrez des Reels Instagram, vidéos et Stories gratuitement sur votre téléphone ou PC. Sans application.",
      'keywords': 'télécharger video instagram, instagram reels downloader, enregistrer instagram mp4, instagram gratuit',
      'body': "<p>Vous voulez sauvegarder des Reels ou vidéos Instagram ? Avec <strong>YT2GDrive</strong>, téléchargez n'importe quel contenu public Instagram gratuitement.</p><h2>Étapes pour télécharger des Reels Instagram</h2><ol><li>Ouvrez Instagram et trouvez le Reel ou la vidéo</li><li>Appuyez sur les <strong>trois points (…)</strong> → <strong>Copier le lien</strong></li><li>Allez sur <a href='/download'>photovideo.ae/download</a> et collez le lien</li><li>Choisissez <strong>Télécharger sur l'Ordinateur</strong> et cliquez sur <strong>Télécharger maintenant</strong></li><li>Une fois prêt, téléchargez le fichier MP4</li></ol><h2>Sauvegarder dans Google Drive</h2><ol><li>Collez le lien Instagram</li><li>Passez à <strong>Sauvegarder dans le Cloud</strong></li><li>Connectez Google Drive et sauvegardez</li></ol><h2>Questions fréquentes</h2><dl><dt>Est-ce gratuit ?</dt><dd>Oui, complètement gratuit.</dd><dt>Fonctionne-t-il avec des comptes privés ?</dt><dd>Non, uniquement le contenu public.</dd></dl>"},
    { 'id': 'guide-other',
      'title': "Télécharger des vidéos de n'importe quel site — Twitter, Facebook, Vimeo et plus",
      'description': "Téléchargez des vidéos de plus de 1000 sites dont Twitter/X, Facebook, Vimeo, Dailymotion et plus. Gratuit.",
      'keywords': "télécharger vidéo de n'importe quel site, télécharger twitter vidéo, télécharger facebook vidéo, vimeo downloader, téléchargeur vidéo en ligne",
      'body': "<p><strong>YT2GDrive</strong> supporte plus de 1000 plateformes vidéo. Si une vidéo est en ligne, vous pouvez probablement la télécharger ici gratuitement.</p><h2>Plateformes supportées</h2><ul><li><strong>YouTube</strong> — toutes les vidéos</li><li><strong>Instagram</strong> — Reels et vidéos</li><li><strong>TikTok</strong> — toutes les vidéos publiques</li><li><strong>Twitter/X</strong> — vidéos intégrées</li><li><strong>Facebook</strong> — vidéos publiques</li><li><strong>Vimeo</strong></li><li><strong>Dailymotion</strong></li><li><strong>Reddit</strong> — publications vidéo</li><li>Et plus de 1000 autres sites</li></ul><h2>Comment télécharger</h2><ol><li>Copiez l'URL de la page vidéo</li><li>Allez sur <a href='/download'>photovideo.ae/download</a> et collez l'URL</li><li>Cliquez sur <strong>Télécharger maintenant</strong></li><li>Enregistrez le fichier MP4</li></ol><h2>Questions fréquentes</h2><dl><dt>Est-ce gratuit ?</dt><dd>Oui, complètement gratuit pour tous les sites supportés.</dd></dl>"},
    { 'id': 'guide-professionals',
      'title': 'Téléchargeur vidéo sécurisé pour journalistes et professionnels des médias',
      'description': "Pourquoi les journalistes, documentaristes et chercheurs médias font confiance à YT2GDrive. Vérifié par Google, sans malware, workflow cloud sécurisé.",
      'keywords': "téléchargeur vidéo sécurisé journalistes, outil professionnel médias, téléchargeur vérifié google",
      'body': "<h2>Le danger caché des sites de téléchargement populaires</h2><p>Cherchez 'téléchargeur vidéo' et vous trouverez des dizaines de sites. Des chercheurs en sécurité ont documenté que beaucoup distribuent des <strong>logiciels malveillants déguisés en boutons de téléchargement</strong>, volent des mots de passe, redirigent vers des pages de phishing et collectent des données de votre appareil.</p><p>Pour un <strong>journaliste, documentariste ou chercheur médias</strong>, cela peut être catastrophique.</p><h2>Pourquoi YT2GDrive est différent</h2><ul><li><strong>OAuth 2.0 vérifié par Google</strong> — notre intégration a passé le processus officiel de vérification d'application Google.</li><li><strong>Aucun logiciel à installer</strong> — pas d'extensions, pas d'exécutables.</li><li><strong>Backend open source</strong> — basé sur <a href='https://github.com/yt-dlp/yt-dlp' rel='noopener'>yt-dlp</a>.</li></ul><h2>Workflow professionnel</h2><p>Avec <strong>Sauvegarder dans le Cloud</strong>, le contenu téléchargé va directement dans Google Drive sans passer par votre appareil local — idéal pour le journalisme d'investigation et la recherche documentaire.</p>"},
    { 'id': 'guide-shorts',
      'title': 'Comment télécharger des vidéos YouTube Shorts — Gratuit',
      'description': "Enregistrez n'importe quel YouTube Shorts gratuitement sur votre téléphone ou PC. Sans application, sans filigrane.",
      'keywords': "télécharger youtube shorts, sauvegarder shorts youtube, youtube shorts mp4 gratuit, téléchargeur shorts",
      'body': "<p>Les YouTube Shorts sont des courtes vidéos de 60 secondes maximum et comptent parmi les contenus les plus regardés sur YouTube. Avec <strong>YT2GDrive</strong>, téléchargez n'importe quel Shorts en quelques secondes — gratuitement, sans application, sans filigrane.</p><h2>Comment télécharger des YouTube Shorts</h2><ol><li>Ouvrez YouTube et trouvez le Shorts à sauvegarder</li><li>Sur mobile : appuyez sur <strong>Partager → Copier le lien</strong></li><li>Allez sur <a href='/download'>photovideo.ae/download</a> et collez le lien</li><li>Cliquez sur <strong>Télécharger maintenant</strong></li><li>Une fois prêt, téléchargez le fichier MP4</li></ol><h2>Sauvegarder dans Google Drive</h2><ol><li>Collez le lien du Shorts</li><li>Passez à l'onglet <strong>Sauvegarder dans le Cloud</strong></li><li>Connectez Google Drive et cliquez sur <strong>Sauvegarder dans Google Drive</strong></li></ol><h2>Questions fréquentes</h2><dl><dt>Est-ce gratuit ?</dt><dd>Oui, complètement gratuit.</dd><dt>Fonctionne sur iPhone et Android ?</dt><dd>Oui — ouvrez la page dans le navigateur mobile, collez le lien et téléchargez.</dd><dt>En quelle qualité est téléchargé le Shorts ?</dt><dd>La meilleure qualité disponible pour ce Shorts.</dd></dl>"},
    { 'id': 'guide-mp3',
      'title': "Comment extraire l'audio MP3 de vidéos YouTube — Gratuit",
      'description': "Téléchargez l'audio MP3 de n'importe quelle vidéo YouTube gratuitement. Idéal pour la musique, les podcasts et les cours. Sans application.",
      'keywords': "youtube en mp3, télécharger mp3 youtube, extraire audio youtube, youtube mp3 gratuit, convertir youtube en mp3",
      'body': "<p>Vous voulez écouter une vidéo YouTube sans la regarder ? Que ce soit de la musique, un podcast ou un cours, extrayez l'audio gratuitement avec <strong>YT2GDrive</strong>.</p><h2>Comment télécharger l'audio MP3 de YouTube</h2><ol><li>Trouvez la vidéo YouTube dont vous voulez l'audio</li><li>Copiez l'URL depuis la barre d'adresse</li><li>Allez sur <a href='/download'>photovideo.ae/download</a> et collez l'URL</li><li>Cliquez sur <strong>Télécharger maintenant</strong></li><li>Une fois prêt, cliquez sur <strong>Télécharger</strong> — vous obtenez un MP4 avec le meilleur audio disponible</li></ol><p><strong>Astuce :</strong> La plupart des lecteurs multimédias (VLC, Windows Media Player) peuvent lire un MP4 directement comme fichier audio.</p><h2>Sauvegarder dans Google Drive</h2><ol><li>Collez le lien de la vidéo</li><li>Passez à <strong>Sauvegarder dans le Cloud</strong></li><li>Connectez Google Drive et sauvegardez</li></ol><h2>Questions fréquentes</h2><dl><dt>Est-ce gratuit ?</dt><dd>Oui, complètement gratuit.</dd><dt>Quelle qualité audio j'obtiens ?</dt><dd>La meilleure qualité disponible, généralement l'équivalent de 128–320 kbps.</dd></dl>"},
    { 'id': 'guide-android',
      'title': 'Comment télécharger des vidéos YouTube sur Android — Gratuit',
      'description': "Guide étape par étape pour sauvegarder des vidéos YouTube sur votre téléphone Android gratuitement. Sans application, fonctionne sur tous les Android.",
      'keywords': "télécharger youtube sur android, youtube downloader android, sauvegarder youtube sur telephone android, android youtube download gratuit",
      'body': "<p>Aucune application ni APK n'est nécessaire — <strong>YT2GDrive</strong> fonctionne directement dans le navigateur Android, que ce soit Chrome, Firefox ou autre.</p><h2>Comment télécharger YouTube sur Android</h2><ol><li>Ouvrez l'application <strong>YouTube</strong> sur votre Android</li><li>Appuyez sur <strong>Partager → Copier le lien</strong></li><li>Ouvrez <strong>Chrome</strong> ou n'importe quel navigateur et allez sur <a href='/download'>photovideo.ae/download</a></li><li>Collez le lien copié</li><li>Appuyez sur <strong>Télécharger maintenant</strong></li><li>Attendez le traitement (30-60 secondes)</li><li>Appuyez sur <strong>Télécharger</strong> — le fichier MP4 est sauvegardé dans votre dossier Téléchargements</li></ol><h2>Sauvegarder dans Google Drive</h2><ol><li>Collez le lien YouTube</li><li>Appuyez sur <strong>Sauvegarder dans le Cloud</strong></li><li>Connectez Google Drive (configuration unique)</li><li>Appuyez sur <strong>Sauvegarder dans Google Drive</strong></li></ol><h2>Questions fréquentes</h2><dl><dt>Faut-il installer quelque chose ?</dt><dd>Non — utilisez simplement le navigateur de votre téléphone.</dd><dt>Où est sauvegardée la vidéo ?</dt><dd>Dans le dossier Téléchargements de votre téléphone.</dd><dt>Quelle est la qualité maximale ?</dt><dd>Jusqu'à 1080p HD pour la plupart des vidéos.</dd></dl>"},
  ],
}

LANG_NAMES = {'en':'English','hi':'हिन्दी','zh':'中文','ar':'العربية','es':'Español','de':'Deutsch','fr':'Français'}
LANG_FLAGS = {'en':'🇬🇧','hi':'🇮🇳','zh':'🇨🇳','ar':'🇸🇦','es':'🇪🇸','de':'🇩🇪','fr':'🇫🇷'}
LANG_DIRS  = {'en':'ltr','hi':'ltr','zh':'ltr','ar':'rtl','es':'ltr','de':'ltr','fr':'ltr'}

DISCLAIMER = {
    'en': ('Copyright & Fair Use',
           'Downloading videos from YouTube and other platforms is in a legal grey area under platform terms of service. This tool is intended for creating personal backups of content you own, and for legitimate Fair Use purposes — including journalism, commentary, research, and education. Users are solely responsible for complying with applicable laws and the terms of service of the respective platforms. Do not use this service to infringe on copyright.'),
    'hi': ('कॉपीराइट और उचित उपयोग',
           'YouTube और अन्य प्लेटफ़ॉर्म से वीडियो डाउनलोड करना प्लेटफ़ॉर्म की सेवा शर्तों के अनुसार एक कानूनी धूसर क्षेत्र में है। यह टूल केवल उस सामग्री का व्यक्तिगत बैकअप बनाने के लिए है जिसके आप स्वामी हैं, और वैध उचित उपयोग उद्देश्यों के लिए — जिसमें पत्रकारिता, टिप्पणी, शोध और शिक्षा शामिल है। उपयोगकर्ता लागू कानूनों और संबंधित प्लेटफ़ॉर्म की सेवा शर्तों का पालन करने के लिए पूरी तरह ज़िम्मेदार हैं। इस सेवा का उपयोग कॉपीराइट उल्लंघन के लिए न करें।'),
    'zh': ('版权与合理使用',
           '根据平台服务条款，从YouTube和其他平台下载视频处于法律灰色地带。本工具仅供您为自己拥有的内容创建个人备份，以及用于合法的合理使用目的——包括新闻报道、评论、研究和教育。用户须自行负责遵守适用法律及相关平台的服务条款。请勿使用本服务侵犯版权。'),
    'ar': ('حقوق النشر والاستخدام العادل',
           'يقع تنزيل مقاطع الفيديو من يوتيوب والمنصات الأخرى في منطقة رمادية قانونية بموجب شروط الخدمة. صُمِّمت هذه الأداة لإنشاء نسخ احتياطية شخصية للمحتوى الذي تملكه، ولأغراض الاستخدام العادل المشروع — بما في ذلك الصحافة والتعليق والبحث والتعليم. يتحمل المستخدمون وحدهم مسؤولية الامتثال للقوانين المعمول بها وشروط خدمة المنصات المعنية. لا تستخدم هذه الخدمة لانتهاك حقوق النشر.'),
    'es': ('Derechos de autor y uso justo',
           'La descarga de vídeos de YouTube y otras plataformas se encuentra en una zona legal gris según los términos de servicio. Esta herramienta está destinada a crear copias de seguridad personales del contenido que posees y para fines legítimos de uso justo — incluyendo periodismo, comentarios, investigación y educación. Los usuarios son los únicos responsables de cumplir con las leyes aplicables y los términos de servicio de las plataformas. No utilices este servicio para infringir derechos de autor.'),
    'de': ('Urheberrecht & Fair Use',
           'Das Herunterladen von Videos von YouTube und anderen Plattformen befindet sich gemäß den Nutzungsbedingungen in einer rechtlichen Grauzone. Dieses Tool dient ausschließlich zur Erstellung persönlicher Backups von Inhalten, die Ihnen gehören, sowie für legitime Fair-Use-Zwecke — einschließlich Journalismus, Kommentar, Forschung und Bildung. Nutzer sind allein verantwortlich für die Einhaltung der geltenden Gesetze und Nutzungsbedingungen der jeweiligen Plattformen. Verwenden Sie diesen Dienst nicht zur Verletzung des Urheberrechts.'),
    'fr': ('Droits d\'auteur et usage équitable',
           'Le téléchargement de vidéos depuis YouTube et d\'autres plateformes se situe dans une zone grise juridique selon les conditions de service. Cet outil est destiné à créer des sauvegardes personnelles de contenu que vous possédez, et à des fins d\'usage équitable légitimes — notamment le journalisme, le commentaire, la recherche et l\'éducation. Les utilisateurs sont seuls responsables du respect des lois applicables et des conditions de service des plateformes. N\'utilisez pas ce service pour porter atteinte aux droits d\'auteur.'),
}

BASE_URL = "https://photovideo.ae/download"


def _article_html(lang: str, article: dict) -> str:
    slug = ARTICLE_SLUGS[article['id']]
    hreflangs = '\n'.join(
        f'<link rel="alternate" hreflang="{l}" href="{BASE_URL}/article/{l}/{slug}">'
        for l in ARTICLES
    )
    hreflangs += f'\n<link rel="alternate" hreflang="x-default" href="{BASE_URL}/article/en/{slug}">'
    other_articles = [a for a in ARTICLES[lang] if a['id'] != article['id']]
    related_html = ''.join(
        f'<a href="{BASE_URL}/article/{lang}/{ARTICLE_SLUGS[a["id"]]}" class="rel-link"><span class="rel-t">{a["title"]}</span><span class="arr">&#8594;</span></a>'
        for a in other_articles
    )
    lang_links = ''.join(
        f'<a href="{BASE_URL}/article/{l}/{slug}" class="lnk-l{" lnk-active" if l==lang else ""}"><span class="lnk-flag">{LANG_FLAGS[l]}</span>{LANG_NAMES[l]}</a>'
        for l in ARTICLES
    )
    dir_attr = LANG_DIRS.get(lang, 'ltr')
    disc_title, disc_body = DISCLAIMER.get(lang, DISCLAIMER['en'])
    pub_date = "2025-06-01"
    mod_date = "2026-05-09"
    json_ld = f'''{{"@context":"https://schema.org","@type":"Article","headline":"{article["title"]}","description":"{article["description"]}","url":"{BASE_URL}/article/{lang}/{slug}","inLanguage":"{lang}","datePublished":"{pub_date}","dateModified":"{mod_date}","author":{{"@type":"Organization","name":"PhotoVideo.ae","url":"https://photovideo.ae"}},"publisher":{{"@type":"Organization","name":"PhotoVideo.ae","url":"https://photovideo.ae","logo":{{"@type":"ImageObject","url":"{BASE_URL}/og-image.png"}}}},"image":"{BASE_URL}/og-image.png","mainEntityOfPage":"{BASE_URL}/article/{lang}/{slug}"}}'''
    return f"""<!DOCTYPE html>
<html lang="{lang}" dir="{dir_attr}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{article['title']} | PhotoVideo.ae</title>
<meta name="description" content="{article['description']}">
<meta name="keywords" content="{article['keywords']}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{BASE_URL}/article/{lang}/{slug}">
{hreflangs}
<meta property="og:type" content="article">
<meta property="og:title" content="{article['title']}">
<meta property="og:description" content="{article['description']}">
<meta property="og:url" content="{BASE_URL}/article/{lang}/{slug}">
<meta property="og:site_name" content="PhotoVideo.ae">
<meta property="og:image" content="{BASE_URL}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{article['title']}">
<meta name="twitter:description" content="{article['description']}">
<meta name="twitter:image" content="{BASE_URL}/og-image.png">
<script type="application/ld+json">{json_ld}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
:root{{--bg:#fbf8f2;--s1:#ffffff;--s2:#f7f1e6;--s3:#efe6d2;--border:#e7e0d2;--ink:#221c15;--text:#3a332a;--muted:#6e6557;--gold:#b68a3e;--gold-d:#8a6326;--gold-l:#d8b978;--r:14px;--display:'Cormorant Garamond',Georgia,serif}}
body{{font-family:'Plus Jakarta Sans',-apple-system,system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;line-height:1.6;-webkit-font-smoothing:antialiased}}
::selection{{background:var(--gold-l);color:var(--ink)}}
/* nav */
header.site{{position:sticky;top:0;z-index:50;background:rgba(251,248,242,.86);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}}
.nav{{max-width:1080px;margin:0 auto;display:flex;align-items:center;gap:22px;height:66px;padding:0 20px}}
.brand{{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-size:1.1rem}}
.brand .ico{{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--gold-l),var(--gold));display:flex;align-items:center;justify-content:center;color:#fff;font-size:.95rem}}
.brand b{{font-family:var(--display);font-weight:700;font-size:1.25rem}}
.brand b i{{color:var(--gold);font-style:normal}}
.nav-links{{display:flex;gap:24px;margin-left:6px}}
.nav-links a{{color:var(--muted);text-decoration:none;font-size:.9rem;font-weight:500}}
.nav-links a:hover{{color:var(--ink)}}
.nav-cta{{margin-left:auto}}
.btn{{display:inline-flex;align-items:center;gap:8px;border-radius:999px;font-weight:600;text-decoration:none;cursor:pointer;transition:all .16s;border:none;white-space:nowrap}}
.btn-gold{{background:var(--gold);color:#fff;padding:10px 20px;font-size:.9rem;box-shadow:0 4px 14px rgba(182,138,62,.28)}}
.btn-gold:hover{{background:var(--gold-d);transform:translateY(-1px)}}
.btn-lg{{padding:15px 30px;font-size:1.02rem}}
@media(max-width:780px){{.nav-links{{display:none}}}}
/* layout */
main{{max-width:760px;margin:0 auto;padding:40px 20px 90px}}
.crumb{{font-size:.8rem;color:var(--muted);margin-bottom:16px}}
.crumb a{{color:var(--muted);text-decoration:none}}
.crumb a:hover{{color:var(--gold-d)}}
h1{{font-family:var(--display);font-size:clamp(2.1rem,5.5vw,3rem);font-weight:600;line-height:1.1;color:var(--ink);letter-spacing:-.01em;margin-bottom:14px}}
.desc{{color:var(--muted);font-size:1.08rem;line-height:1.6;margin-bottom:26px;max-width:640px}}
/* top hero CTA */
.tophero{{display:flex;flex-wrap:wrap;align-items:center;gap:18px;background:linear-gradient(135deg,#fffdf8,var(--s2));border:1px solid var(--border);border-radius:18px;padding:22px 24px;margin-bottom:24px;box-shadow:0 12px 34px rgba(34,28,21,.05)}}
.tophero .th-txt{{flex:1;min-width:210px}}
.tophero .th-txt b{{display:block;font-family:var(--display);color:var(--ink);font-weight:600;font-size:1.45rem;line-height:1.15;margin-bottom:4px}}
.tophero .th-txt span{{color:var(--muted);font-size:.9rem}}
/* trust pills */
.trust{{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 30px}}
.trust .pill{{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;font-weight:500;color:var(--muted);background:var(--s1);border:1px solid var(--border);border-radius:999px;padding:7px 14px}}
.trust .pill b{{color:var(--gold);font-weight:700}}
/* language selector */
.lang-label{{font-size:.74rem;font-weight:700;color:var(--gold-d);text-transform:uppercase;letter-spacing:.09em;margin-bottom:11px}}
.langs{{display:flex;flex-wrap:wrap;gap:9px;margin:0 0 38px}}
.lnk-l{{display:inline-flex;align-items:center;gap:8px;padding:9px 15px;border-radius:999px;font-size:.86rem;font-weight:500;background:var(--s1);color:var(--muted);text-decoration:none;border:1px solid var(--border);transition:all .15s}}
.lnk-l:hover{{border-color:var(--gold-l);color:var(--ink);transform:translateY(-1px)}}
.lnk-l.lnk-active{{background:var(--ink);color:#f4ecda;border-color:var(--ink);font-weight:600}}
.lnk-flag{{font-size:1.05rem;line-height:1}}
/* article body */
.art-body{{font-size:1.04rem;line-height:1.78;color:var(--text)}}
.art-body h2{{font-family:var(--display);font-size:1.7rem;font-weight:600;color:var(--ink);margin:38px 0 12px;letter-spacing:-.01em}}
.art-body h3{{font-size:1.14rem;font-weight:700;color:var(--ink);margin:26px 0 8px}}
.art-body p{{margin-bottom:15px}}
.art-body ol,.art-body ul{{margin:12px 0 16px 22px}}
.art-body li{{margin-bottom:9px}}
.art-body dl{{margin:16px 0;border-top:1px solid var(--border);padding-top:6px}}
.art-body dt{{font-weight:700;color:var(--ink);margin-top:15px}}
.art-body dd{{margin-left:0;color:var(--muted);margin-bottom:9px}}
.art-body strong{{color:var(--ink);font-weight:600}}
.art-body a{{color:var(--gold-d);text-decoration:underline;text-underline-offset:2px}}
[dir="rtl"] .art-body ol,[dir="rtl"] .art-body ul{{margin:12px 22px 16px 0}}
/* disclaimer */
.disclaimer{{display:flex;gap:14px;background:var(--s2);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:12px;padding:18px 20px;margin:36px 0;font-size:.87rem;line-height:1.65;color:var(--muted)}}
.disc-icon{{font-size:1.3rem;flex-shrink:0}}
.disclaimer strong{{color:var(--ink);display:block;margin-bottom:5px;font-size:.93rem}}
/* bottom CTA card */
.cta-card{{background:radial-gradient(120% 140% at 0% 0%,#2c2519,var(--ink));border-radius:22px;padding:42px 32px;text-align:center;margin:46px 0 54px;color:#f4ecda}}
.cta-card .eyebrow{{font-size:.74rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gold-l);margin-bottom:12px}}
.cta-card h3{{font-family:var(--display);font-size:2.1rem;font-weight:600;color:#fff;margin-bottom:10px;line-height:1.12}}
.cta-card p{{color:#cabfa9;font-size:.97rem;margin:0 auto 24px;max-width:460px}}
.cta-card .btn-gold{{box-shadow:0 10px 28px rgba(182,138,62,.45)}}
.cta-card .sub{{margin-top:15px;font-size:.78rem;color:#9a917f}}
/* more guides cards */
.related{{margin-top:54px;padding-top:32px;border-top:1px solid var(--border)}}
.related .rh{{font-family:var(--display);font-size:1.55rem;font-weight:600;color:var(--ink);margin-bottom:4px}}
.related .rsub{{color:var(--muted);font-size:.9rem;margin-bottom:22px}}
.rel-grid{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}
@media(max-width:640px){{.rel-grid{{grid-template-columns:1fr}}}}
.rel-link{{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--s1);border:1px solid var(--border);border-radius:13px;padding:16px 17px;color:var(--ink);text-decoration:none;font-size:.93rem;font-weight:500;line-height:1.4;transition:all .16s}}
.rel-link:hover{{border-color:var(--gold-l);box-shadow:0 8px 22px rgba(34,28,21,.07);transform:translateY(-2px)}}
.rel-link .arr{{color:var(--gold);font-size:1.15rem;flex-shrink:0;transition:transform .16s}}
.rel-link:hover .arr{{transform:translateX(3px)}}
/* lang banner */
#lang-banner{{position:sticky;top:66px;z-index:40;display:flex;align-items:center;gap:10px;background:var(--ink);color:#f4ecda;padding:11px 16px;font-size:.85rem;flex-wrap:wrap}}
#lang-banner a{{color:var(--gold-l);font-weight:600;text-decoration:none;padding:5px 13px;background:rgba(216,185,120,.13);border-radius:999px;border:1px solid rgba(216,185,120,.32)}}
#lang-banner a:hover{{background:rgba(216,185,120,.24)}}
#lang-banner button{{margin-left:auto;background:none;border:none;color:#9a917f;cursor:pointer;font-size:1rem;padding:2px 6px}}
#lang-banner button:hover{{color:#fff}}
</style>
</head>
<body>
<header class="site">
  <nav class="nav">
    <a href="{BASE_URL}" class="brand"><span class="ico">&#9654;</span> <b>YT2G<i>Drive</i></b></a>
    <div class="nav-links">
      <a href="https://photovideo.ae/">Home</a>
      <a href="{BASE_URL}">Downloader</a>
      <a href="https://photovideo.ae/photographers">Photographers</a>
    </div>
    <div class="nav-cta"><a href="{BASE_URL}" class="btn btn-gold">&#11015; Try the downloader</a></div>
  </nav>
</header>
<main>
  <div class="crumb"><a href="{BASE_URL}">Downloader</a> &#8250; Guides</div>
  <h1>{article['title']}</h1>
  <p class="desc">{article['description']}</p>
  <div class="tophero">
    <div class="th-txt"><b>Download this video now</b><span>Paste any link &middot; save MP4 or to Google Drive &middot; free, no signup</span></div>
    <a href="{BASE_URL}" class="btn btn-gold btn-lg">&#11015; Try the downloader</a>
  </div>
  <div class="trust">
    <span class="pill"><b>&#10003;</b> Google-verified</span>
    <span class="pill"><b>&#10003;</b> No registration</span>
    <span class="pill"><b>&#10003;</b> HD &amp; 4K</span>
    <span class="pill"><b>&#10003;</b> 1000+ sites</span>
  </div>
  <div class="lang-label">&#127760; Read in your language</div>
  <div class="langs">{lang_links}</div>
  <div class="art-body">{article['body']}</div>
  <div class="disclaimer">
    <span class="disc-icon">&#9878;</span>
    <div><strong>{disc_title}</strong>{disc_body}</div>
  </div>
  <div class="cta-card">
    <div class="eyebrow">Ready when you are</div>
    <h3>Save your video in seconds</h3>
    <p>YT2GDrive downloads from YouTube, Instagram, TikTok and 1000+ sites — straight to your device or Google Drive. Free, no account, no watermark.</p>
    <a href="{BASE_URL}" class="btn btn-gold btn-lg">&#11015; Try the downloader free</a>
    <div class="sub">No signup &middot; No watermark &middot; Up to 4K</div>
  </div>
  <div class="related">
    <div class="rh">More guides</div>
    <div class="rsub">Step-by-step tutorials for every platform.</div>
    <div class="rel-grid">{related_html}</div>
  </div>
</main>
<script>
(function(){{
  var flags={{'en':'🇬🇧','hi':'🇮🇳','zh':'🇨🇳','ar':'🇸🇦','es':'🇪🇸','de':'🇩🇪','fr':'🇫🇷'}};
  var names={{'en':'English','hi':'हिन्दी','zh':'中文','ar':'العربية','es':'Español','de':'Deutsch','fr':'Français'}};
  var current=document.documentElement.lang||'en';
  var slug=location.pathname.split('/').pop();
  var nav=(navigator.language||navigator.userLanguage||'en').toLowerCase();
  var detected='en';
  var map=[['hi','hi'],['zh','zh'],['ar','ar'],['es','es'],['de','de'],['fr','fr']];
  for(var i=0;i<map.length;i++){{if(nav.indexOf(map[i][0])===0){{detected=map[i][1];break;}}}}
  var key='lx_'+slug+'_'+detected;
  if(detected!==current&&!localStorage.getItem(key)){{
    var b=document.createElement('div');
    b.id='lang-banner';
    b.innerHTML='<span>'+flags[detected]+' This article is available in '+names[detected]+'</span>'
      +'<a href="{BASE_URL}/article/'+detected+'/'+slug+'">'+flags[detected]+' Read in '+names[detected]+'</a>'
      +'<button onclick="localStorage.setItem(\''+key+'\',\'1\');document.getElementById(\'lang-banner\').remove()">✕</button>';
    document.body.insertBefore(b,document.body.firstChild);
  }}
}})();
</script>
</body>
</html>"""


# ── Routes ────────────────────────────────────────────────────────────────────

_og_image_cache: bytes | None = None

@app.get("/og-image.png")
async def og_image():
    global _og_image_cache
    if _og_image_cache is None:
        _og_image_cache = _generate_og_image()
    return Response(content=_og_image_cache, media_type="image/png",
                    headers={"Cache-Control": "public, max-age=86400"})


@app.get("/robots.txt", response_class=Response)
async def robots_txt():
    content = f"User-agent: *\nAllow: /\nSitemap: {BASE_URL}/sitemap.xml\n"
    return Response(content=content, media_type="text/plain",
                    headers={"Cache-Control": "public, max-age=86400"})


@app.get("/sitemap.xml", response_class=Response)
async def sitemap_xml():
    mod = "2026-05-09"
    urls = [f"  <url><loc>{BASE_URL}/</loc><lastmod>{mod}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>"]
    for slug in ARTICLE_SLUGS.values():
        for lang in ARTICLES:
            urls.append(
                f"  <url><loc>{BASE_URL}/article/{lang}/{slug}</loc>"
                f"<lastmod>{mod}</lastmod><changefreq>monthly</changefreq>"
                f"<priority>0.8</priority></url>"
            )
    body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    body += '\n'.join(urls)
    body += '\n</urlset>'
    return Response(content=body, media_type="application/xml",
                    headers={"Cache-Control": "public, max-age=3600"})


@app.get("/")
async def index():
    return FileResponse(
        "static/index.html",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )


@app.get("/article/{slug}")
async def article_en(slug: str, request: Request):
    accept = request.headers.get("Accept-Language", "en").lower()
    lang = "en"
    for part in accept.replace(" ", "").split(","):
        code = part.split(";")[0][:2]
        if code in ARTICLES and code != "en":
            lang = code
            break
    return RedirectResponse(url=f"{BASE_URL}/article/{lang}/{slug}", status_code=302)


@app.get("/article/{lang}/{slug}")
async def article_page(lang: str, slug: str):
    from fastapi.responses import HTMLResponse
    if lang not in ARTICLES:
        lang = "en"
    article_id = SLUG_TO_ID.get(slug)
    if not article_id:
        raise HTTPException(status_code=404, detail="Article not found")
    article = next((a for a in ARTICLES[lang] if a['id'] == article_id), None)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return HTMLResponse(
        content=_article_html(lang, article),
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.get("/auth/login")
async def login(request: Request):
    if not CLIENT_ID or not CLIENT_SECRET:
        return JSONResponse({"error": "Google credentials not configured"}, status_code=500)
    flow = _make_flow()
    auth_url, state = flow.authorization_url(prompt="consent", access_type="offline")
    request.session["oauth_state"] = state
    return RedirectResponse(auth_url)


@app.get("/auth/callback")
async def callback(request: Request, code: str, state: str):
    flow = _make_flow()
    flow.state = state
    flow.fetch_token(code=code)
    creds = flow.credentials

    email = ""
    try:
        svc = build("oauth2", "v2", credentials=creds)
        email = svc.userinfo().get().execute().get("email", "")
    except Exception:
        pass

    sid = request.session.get("sid") or secrets.token_hex(16)
    existing = _sessions.get(sid, {})
    existing.update({
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "email": email,
        "google_connected": True,
    })
    _sessions[sid] = existing
    request.session["sid"] = sid
    return RedirectResponse("/download")


@app.get("/auth/logout")
async def logout(request: Request):
    sid = request.session.pop("sid", None)
    if sid:
        _sessions.pop(sid, None)
    request.session.clear()
    return RedirectResponse("/")


@app.get("/api/me")
async def me(request: Request):
    data = _get_session(request)
    if not data or not data.get("google_connected"):
        return JSONResponse({"google": None})
    return JSONResponse({"google": {"email": data.get("email", "")}})


def _get_or_create_app_folder(svc) -> str:
    result = svc.files().list(
        q="name='YT2GDrive' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields="files(id)",
        pageSize=1,
    ).execute()
    files = result.get("files", [])
    if files:
        return files[0]["id"]
    folder = svc.files().create(
        body={"name": "YT2GDrive", "mimeType": "application/vnd.google-apps.folder"},
        fields="id",
    ).execute()
    return folder["id"]


@app.post("/api/start")
async def start(request: Request, background_tasks: BackgroundTasks):
    body = await request.json()
    url = body.get("url", "").strip()
    action = body.get("action", "download")    # "download" | "cloud"
    provider = body.get("provider", "google")  # "google" | "onedrive" | "dropbox"
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    client_ip = request.headers.get("CF-Connecting-IP") or request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or request.client.host
    if not _check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail=f"Too many requests. Max {RATE_LIMIT_MAX} downloads per hour.")

    data = _get_session(request)
    if action == "cloud" and provider == "google":
        if not data or not data.get("google_connected"):
            raise HTTPException(status_code=401, detail="Google Drive not connected")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "pending", "progress": 0, "message": "Starting...",
        "action": action, "provider": provider, "created_at": time.time(),
    }

    background_tasks.add_task(
        _process, job_id, url, action, provider,
        dict(data) if data else None, request.session.get("sid", "")
    )
    return JSONResponse({"job_id": job_id})


@app.get("/api/download/{job_id}")
async def download_file(job_id: str):
    job = jobs.get(job_id)
    if not job or job["status"] not in ("ready", "done"):
        raise HTTPException(status_code=404, detail="File not ready")
    filepath = job.get("filepath")
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath, filename=job.get("filename", "video.mp4"), media_type="video/mp4")


@app.get("/api/status/{job_id}")
async def job_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JSONResponse({k: v for k, v in job.items() if k not in ("filepath", "created_at")})


@app.get("/api/history")
async def get_history(request: Request):
    data = _get_session(request)
    email = (data or {}).get("email", "")
    sid = request.session.get("sid", "")
    key = email or sid
    if not key:
        return JSONResponse({"items": []})
    items = _history.get(key, [])
    enriched = []
    for item in items:
        e = dict(item)
        job = jobs.get(item.get("job_id", ""))
        e["downloadable"] = bool(
            job and job.get("filepath") and os.path.exists(job.get("filepath", ""))
        )
        enriched.append(e)
    return JSONResponse({"items": enriched})




# ── Rate limiting ────────────────────────────────────────────────────────────

_rate_limit: dict[str, list[float]] = {}  # ip -> [timestamps]
RATE_LIMIT_MAX = int(os.environ.get("RATE_LIMIT_MAX", "5"))
RATE_LIMIT_WINDOW = int(os.environ.get("RATE_LIMIT_WINDOW", "3600"))  # seconds

def _check_rate_limit(ip: str) -> bool:
    now = time.time()
    timestamps = [t for t in _rate_limit.get(ip, []) if now - t < RATE_LIMIT_WINDOW]
    _rate_limit[ip] = timestamps
    if len(timestamps) >= RATE_LIMIT_MAX:
        return False
    _rate_limit[ip].append(now)
    return True


# ── Proxy pool ───────────────────────────────────────────────────────────────

_proxy_blocked_until: dict[str, float] = {}  # proxy -> unblock timestamp

def _proxy_pool() -> list[str]:
    raw = os.environ.get("YTDLP_PROXIES", os.environ.get("YTDLP_PROXY", ""))
    return [p.strip() for p in raw.split(",") if p.strip()]

def _get_proxy(exclude=()) -> str | None:
    pool = _proxy_pool()
    if not pool:
        return None
    now = time.time()
    available = [p for p in pool if _proxy_blocked_until.get(p, 0) < now and p not in exclude]
    if available:
        return random.choice(available)
    fallback = [p for p in pool if p not in exclude]
    return random.choice(fallback) if fallback else None

def _block_proxy(proxy: str, seconds: int = 3600):
    if proxy:
        _proxy_blocked_until[proxy] = time.time() + seconds


# ── Background worker ─────────────────────────────────────────────────────────

async def _read_progress(stream, job_id: str):
    stderr_lines: list[str] = []
    async for raw in stream:
        line = raw.decode(errors="replace").strip()
        stderr_lines.append(line)
        jobs[job_id].setdefault("_stderr", []).append(line)

        # [download]  45.2% of 245.32MiB at 3.20MiB/s ETA 01:10
        dl = re.search(
            r"\[download\]\s+(\d+\.?\d*)%\s+of\s+([\d.]+\S+)\s+at\s+([\d.]+\S+)\s+ETA\s+(\S+)",
            line,
        )
        if dl:
            pct, size, speed, eta = float(dl.group(1)), dl.group(2), dl.group(3), dl.group(4)
            jobs[job_id].update({
                "step": "downloading",
                "step_progress": int(pct),
                "progress": max(5, int(pct * 0.46)),
                "message": f"Downloading... {int(pct)}%",
                "detail": f"{size} · {speed} · ETA {eta}",
            })
            continue

        # [download]  45.2% of 245.32MiB at ... (no speed yet)
        m = re.search(r"(\d+(?:\.\d+)?)%", line)
        if m and "[download]" in line:
            pct = float(m.group(1))
            jobs[job_id].update({
                "step": "downloading",
                "step_progress": int(pct),
                "progress": max(5, int(pct * 0.46)),
                "message": f"Downloading... {int(pct)}%",
            })
            continue

        if "[Merger]" in line or ("[ffmpeg]" in line and "Merging" in line):
            jobs[job_id].update({
                "step": "processing",
                "step_progress": 50,
                "progress": 48,
                "message": "Merging video & audio...",
                "detail": "ffmpeg is combining tracks",
            })


async def _process(
    job_id: str, url: str, action: str, provider: str,
    creds_data: Optional[dict], sid: str = "",
):
    try:
        jobs[job_id].update({
            "status": "downloading", "step": "fetching",
            "step_progress": 0, "progress": 2,
            "message": "Fetching video info...", "detail": "Connecting to YouTube",
        })

        job_dir = DOWNLOADS_DIR / job_id
        job_dir.mkdir(exist_ok=True)

        base_cmd = [
            "yt-dlp", "--no-playlist",
            # default = актуальный набор клиентов, который yt-dlp сам подстраивает.
            "--extractor-args", "youtube:player_client=default",
            # PO-token берётся у bgutil-provider (без аккаунта и cookies).
            "--extractor-args", "youtubepot-bgutilhttp:base_url=http://bgutil-provider:4416",
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "--add-header", "Accept-Language:en-US,en;q=0.9",
            "-o", str(job_dir / "%(title)s.%(ext)s"),
            "--print", "after_move:filepath",
        ]
        # Optional one-shot account cookies (mounted at /cookies/youtube-cookies.txt).
        cookies_args = []
        for cookies_src in (Path("/cookies/youtube-cookies.txt"),):
            if cookies_src.exists():
                import shutil
                tmp_cookies = job_dir / "cookies.txt"
                shutil.copy(cookies_src, tmp_cookies)
                cookies_args = ["--cookies", str(tmp_cookies)]
                break

        # Retry across the proxy pool. Many datacenter IPs are flagged by YouTube
        # ("not a bot"), so one bad proxy must not fail the whole job — rotate to a
        # different proxy and retry. Failed proxies are sidelined for a while.
        pool = _proxy_pool()
        max_attempts = max(1, min(len(pool) or 1, 6))
        RETRYABLE = ("sign in to confirm", "not a bot", "http error 403",
                     "http error 429", "rate-limited", "ratelimit")
        tried: set[str] = set()
        stdout_data = b""
        stderr_text = ""
        stderr_tail = ""
        ok = False
        for attempt in range(max_attempts):
            proxy = _get_proxy(exclude=tried)
            if proxy:
                tried.add(proxy)
            cmd = base_cmd + cookies_args + (["--proxy", proxy] if proxy else []) + [url]
            jobs[job_id]["_stderr"] = []
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            progress_task = asyncio.create_task(_read_progress(proc.stderr, job_id))
            stdout_data = await proc.stdout.read()
            await proc.wait()
            await progress_task
            if proc.returncode == 0:
                ok = True
                break
            lines = jobs[job_id].get("_stderr", [])
            stderr_text = " ".join(lines)
            stderr_tail = " | ".join(l for l in lines[-5:] if l)
            low = stderr_text.lower()
            if proxy and any(s in low for s in RETRYABLE) and attempt < max_attempts - 1:
                _block_proxy(proxy, 1800)
                jobs[job_id].update({
                    "status": "downloading", "step": "fetching", "step_progress": 0,
                    "progress": 3, "message": "Finding a working route...",
                    "detail": f"attempt {attempt + 2}/{max_attempts}",
                })
                continue
            break

        if not ok:
            low = stderr_text.lower()
            if "rate-limited" in low or "ratelimit" in low:
                msg = "YouTube has rate-limited us. Please try again in a few minutes."
            elif "sign in to confirm" in low or "not a bot" in low:
                msg = "All routes are busy right now. Please try again in a few minutes."
            elif "video unavailable" in low or "not available" in low:
                msg = "Video unavailable (private, deleted or geo-blocked)."
            elif "http error 403" in low:
                msg = "YouTube blocked the download (403). Please try again in a few minutes."
            elif "http error 429" in low:
                msg = "Too many requests — please try again later."
            else:
                msg = f"Download error: {stderr_tail}" if stderr_tail else "Download error. Check the URL."
            jobs[job_id].update({"status": "error", "message": msg})
            return

        filepath = stdout_data.decode(errors="replace").strip().splitlines()[-1] if stdout_data.strip() else ""
        if not filepath or not os.path.exists(filepath):
            for f in job_dir.iterdir():
                if f.suffix in (".mp4", ".mkv", ".webm", ".m4v"):
                    filepath = str(f)
                    break

        if not filepath or not os.path.exists(filepath):
            jobs[job_id].update({"status": "error", "message": "File not found after download"})
            return

        filename = Path(filepath).name
        jobs[job_id].update({"filepath": filepath, "filename": filename})

        if action == "download":
            jobs[job_id].update({"status": "ready", "progress": 100, "message": "Ready to download!"})
            _save_history((creds_data or {}).get("email") or sid, {
                "job_id": job_id, "filename": filename,
                "action": "download", "timestamp": time.time(), "status": "ready",
            })
            return

        if action == "cloud" and provider == "google" and creds_data:
            size_mb = os.path.getsize(filepath) / 1024 / 1024
            jobs[job_id].update({
                "status": "uploading", "step": "connecting",
                "step_progress": 0, "progress": 50,
                "message": "Connecting to Google Drive...",
                "detail": f"{filename} · {size_mb:.0f} MB ready to upload",
            })
            await asyncio.sleep(0.5)
            jobs[job_id].update({
                "step": "uploading", "step_progress": 0, "progress": 52,
                "message": "Uploading to Google Drive...", "detail": "0%",
            })
            await asyncio.to_thread(_upload_gdrive, job_id, creds_data, filepath, filename)
            _save_history((creds_data or {}).get("email") or sid, {
                "job_id": job_id,
                "filename": jobs[job_id].get("filename", filename),
                "action": "cloud", "provider": provider,
                "file_id": jobs[job_id].get("file_id"),
                "link": jobs[job_id].get("link"),
                "timestamp": time.time(), "status": "done",
            })

    except Exception as e:
        jobs[job_id].update({"status": "error", "message": str(e)})


def _upload_gdrive(job_id, creds_data, filepath, filename):
    c = _creds(creds_data)
    _refresh_if_needed(c, creds_data)
    svc = build("drive", "v3", credentials=c)

    folder_id = _get_or_create_app_folder(svc)
    metadata = {"name": filename, "parents": [folder_id]}

    media = MediaFileUpload(filepath, mimetype="video/mp4", resumable=True, chunksize=10 * 1024 * 1024)
    req = svc.files().create(body=metadata, media_body=media, fields="id,name,webViewLink")

    response = None
    while response is None:
        status, response = req.next_chunk()
        if status:
            upload_pct = int(status.progress() * 100)
            pct = 52 + int(status.progress() * 46)
            jobs[job_id].update({
                "status": "uploading", "step": "uploading",
                "step_progress": upload_pct, "progress": pct,
                "message": f"Uploading to Google Drive...",
                "detail": f"{upload_pct}%",
            })

    jobs[job_id].update({
        "status": "done", "progress": 100, "message": "Done!",
        "filename": response["name"],
        "file_id": response["id"],
        "link": response.get("webViewLink", ""),
    })
