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
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
import google.oauth2.credentials
from google.auth.transport.requests import Request as GoogleRequest
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

app = FastAPI(root_path=os.environ.get("ROOT_PATH", ""))
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


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
async def index():
    return FileResponse(
        "static/index.html",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
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
