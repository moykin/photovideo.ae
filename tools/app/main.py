import asyncio
import os
import json
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
    "https://www.googleapis.com/auth/drive",
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
  ],
}

LANG_NAMES = {'en':'English','hi':'हिन्दी','zh':'中文','ar':'العربية','es':'Español','de':'Deutsch','fr':'Français'}
LANG_DIRS  = {'en':'ltr','hi':'ltr','zh':'ltr','ar':'rtl','es':'ltr','de':'ltr','fr':'ltr'}

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
        f'<a href="{BASE_URL}/article/{lang}/{ARTICLE_SLUGS[a["id"]]}" class="rel-link">{a["title"]}</a>'
        for a in other_articles
    )
    lang_links = ' '.join(
        f'<a href="{BASE_URL}/article/{l}/{slug}" class="lnk-l{"active" if l==lang else ""}">{LANG_NAMES[l]}</a>'
        for l in ARTICLES
    )
    dir_attr = LANG_DIRS.get(lang, 'ltr')
    json_ld = f'''{{"@context":"https://schema.org","@type":"Article","headline":"{article["title"]}","description":"{article["description"]}","url":"{BASE_URL}/article/{lang}/{slug}","inLanguage":"{lang}","publisher":{{"@type":"Organization","name":"PhotoVideo.ae","url":"https://photovideo.ae"}},"mainEntityOfPage":"{BASE_URL}/article/{lang}/{slug}"}}'''
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
<script type="application/ld+json">{json_ld}</script>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
:root{{--bg:#0d0f18;--s1:#161924;--s2:#1e2130;--border:#2a3050;--text:#e2e6f3;--muted:#7a82a0;--accent:#4f8ef7;--r:12px}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:0 0 60px}}
header{{background:var(--s1);border-bottom:1px solid var(--border);padding:0 16px}}
.hdr{{max-width:760px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:56px}}
.logo{{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text);font-weight:700;font-size:1rem}}
.logo-icon{{width:32px;height:32px;background:#4f8ef7;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1rem}}
.back{{color:var(--accent);text-decoration:none;font-size:.85rem}}
.back:hover{{text-decoration:underline}}
main{{max-width:760px;margin:0 auto;padding:32px 16px}}
h1{{font-size:1.7rem;font-weight:700;margin-bottom:12px;line-height:1.3}}
.desc{{color:var(--muted);margin-bottom:28px;font-size:.95rem;line-height:1.6}}
.art-body{{font-size:.93rem;line-height:1.7;color:#c8cde0}}
.art-body h2{{font-size:1.1rem;font-weight:600;color:var(--text);margin:24px 0 10px}}
.art-body p{{margin-bottom:12px}}
.art-body ol,.art-body ul{{margin:10px 0 10px 20px}}
.art-body li{{margin-bottom:6px}}
.art-body dl{{margin:10px 0}}
.art-body dt{{font-weight:600;color:var(--text);margin-top:10px}}
.art-body dd{{margin-left:16px;color:var(--muted);margin-bottom:4px}}
.art-body strong{{color:var(--text)}}
.art-body a{{color:var(--accent);text-decoration:none}}
.art-body a:hover{{text-decoration:underline}}
[dir="rtl"] .art-body ol,[dir="rtl"] .art-body ul{{margin:10px 20px 10px 0}}
.langs{{display:flex;flex-wrap:wrap;gap:6px;margin:24px 0 0}}
.lnk-l{{padding:4px 10px;border-radius:6px;font-size:.78rem;background:var(--s2);color:var(--muted);text-decoration:none;border:1px solid var(--border)}}
.lnk-lactive{{background:var(--accent);color:#fff;border-color:var(--accent)}}
.lnk-l:hover{{color:var(--text)}}
.related{{margin-top:36px;padding-top:24px;border-top:1px solid var(--border)}}
.related h3{{font-size:.85rem;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em}}
.rel-link{{display:block;color:var(--accent);text-decoration:none;font-size:.9rem;margin-bottom:8px}}
.rel-link:hover{{text-decoration:underline}}
.cta{{display:inline-block;margin-top:28px;padding:12px 24px;background:var(--accent);color:#fff;border-radius:var(--r);text-decoration:none;font-weight:600;font-size:.95rem}}
.cta:hover{{opacity:.9}}
</style>
</head>
<body>
<header>
  <div class="hdr">
    <a href="{BASE_URL}" class="logo"><span class="logo-icon">▶</span> YT Downloader</a>
    <a href="{BASE_URL}" class="back">← Back to Downloader</a>
  </div>
</header>
<main>
  <h1>{article['title']}</h1>
  <p class="desc">{article['description']}</p>
  <div class="art-body">{article['body']}</div>
  <a href="{BASE_URL}" class="cta">⬇ Try the Downloader</a>
  <div class="related">
    <h3>More Guides</h3>
    {related_html}
  </div>
  <div class="langs">{lang_links}</div>
</main>
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


@app.get("/")
async def index():
    return FileResponse(
        "static/index.html",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )


@app.get("/article/{slug}")
async def article_en(slug: str):
    return await article_page(lang="en", slug=slug)


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
    return RedirectResponse("/")


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


@app.get("/api/folders")
async def list_folders(request: Request, parent_id: str = "root"):
    data = _get_session(request)
    if not data or not data.get("google_connected"):
        raise HTTPException(status_code=401, detail="Google Drive not connected")

    creds = _creds(data)
    _refresh_if_needed(creds, data)
    svc = build("drive", "v3", credentials=creds)

    result = svc.files().list(
        q=f"'{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields="files(id,name)",
        orderBy="name",
        pageSize=200,
    ).execute()

    parent_name = "My Drive"
    parent_parent_id = None
    if parent_id != "root":
        try:
            meta = svc.files().get(fileId=parent_id, fields="name,parents").execute()
            parent_name = meta.get("name", parent_id)
            parents = meta.get("parents", [])
            parent_parent_id = parents[0] if parents else "root"
        except Exception:
            pass

    return JSONResponse({
        "folders": result.get("files", []),
        "parent_id": parent_id,
        "parent_name": parent_name,
        "parent_parent_id": parent_parent_id,
    })


@app.post("/api/start")
async def start(request: Request, background_tasks: BackgroundTasks):
    body = await request.json()
    url = body.get("url", "").strip()
    action = body.get("action", "download")    # "download" | "cloud"
    provider = body.get("provider", "google")  # "google" | "onedrive" | "dropbox"
    folder_id = body.get("folder_id") or None

    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

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
        _process, job_id, url, action, provider, folder_id,
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


@app.post("/api/drive/folder")
async def create_drive_folder(request: Request):
    body = await request.json()
    name = body.get("name", "").strip()
    parent_id = body.get("parent_id", "root")
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    data = _get_session(request)
    if not data or not data.get("google_connected"):
        raise HTTPException(status_code=401, detail="Not connected")
    creds = _creds(data)
    _refresh_if_needed(creds, data)
    svc = build("drive", "v3", credentials=creds)
    meta = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
    if parent_id and parent_id != "root":
        meta["parents"] = [parent_id]
    folder = svc.files().create(body=meta, fields="id,name").execute()
    return JSONResponse(folder)


@app.patch("/api/drive/move/{file_id}")
async def move_drive_file(file_id: str, request: Request):
    body = await request.json()
    folder_id = body.get("folder_id") or "root"
    data = _get_session(request)
    if not data or not data.get("google_connected"):
        raise HTTPException(status_code=401, detail="Not connected")
    creds = _creds(data)
    _refresh_if_needed(creds, data)
    svc = build("drive", "v3", credentials=creds)
    file_meta = svc.files().get(fileId=file_id, fields="parents").execute()
    old_parents = ",".join(file_meta.get("parents", []))
    svc.files().update(
        fileId=file_id,
        addParents=folder_id,
        removeParents=old_parents,
        fields="id,parents",
    ).execute()
    return JSONResponse({"ok": True})


# ── Background worker ─────────────────────────────────────────────────────────

async def _read_progress(stream, job_id: str):
    async for raw in stream:
        line = raw.decode(errors="replace").strip()

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
    folder_id: Optional[str], creds_data: Optional[dict], sid: str = "",
):
    try:
        jobs[job_id].update({
            "status": "downloading", "step": "fetching",
            "step_progress": 0, "progress": 2,
            "message": "Fetching video info...", "detail": "Connecting to YouTube",
        })

        job_dir = DOWNLOADS_DIR / job_id
        job_dir.mkdir(exist_ok=True)

        cmd = [
            "yt-dlp", "--no-playlist",
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "-o", str(job_dir / "%(title)s.%(ext)s"),
            "--print", "after_move:filepath",
        ]
        for cookies_path in (Path("/cookies/youtube-cookies.txt"), Path("/app/cookies.txt")):
            if cookies_path.exists():
                cmd += ["--cookies", str(cookies_path)]
                break
        cmd.append(url)

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        progress_task = asyncio.create_task(_read_progress(proc.stderr, job_id))
        stdout_data = await proc.stdout.read()
        await proc.wait()
        await progress_task

        if proc.returncode != 0:
            jobs[job_id].update({"status": "error", "message": "Download error. Check the URL."})
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
            await asyncio.to_thread(_upload_gdrive, job_id, creds_data, filepath, filename, folder_id)
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


def _upload_gdrive(job_id, creds_data, filepath, filename, folder_id):
    c = _creds(creds_data)
    _refresh_if_needed(c, creds_data)
    svc = build("drive", "v3", credentials=c)

    metadata = {"name": filename}
    if folder_id:
        metadata["parents"] = [folder_id]

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
