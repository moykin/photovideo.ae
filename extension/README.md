# PhotoVideo.ae Saver — browser extension (MVP)

Downloads YouTube videos **from the user's own browser and IP**, so it isn't hit
by YouTube's datacenter-IP block that stops the server-side downloader. Two
modes: save to device, or upload straight to the user's Google Drive — in both
cases the bytes never pass through our server.

## Why this exists
A plain website can't extract YouTube (CORS sandbox) and a server gets the
"Sign in to confirm you're not a bot" block (datacenter IP). An extension runs
outside the CORS sandbox, uses the visitor's residential IP and their YouTube
cookies — exactly what YouTube expects — so extraction works, for free, with no
proxies.

## Install (testing)

### Chrome / Edge / Brave / Kiwi (Android)
1. Go to `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select this `extension/` folder.
3. Pin the icon; click it to open the popup.

### Firefox (desktop & Android)
1. Go to `about:debugging#/runtime/this-firefox`.
2. **Load Temporary Add-on** → pick `extension/manifest.json`.
   (Permanent install = sign/publish on Firefox Add-ons, which allows downloaders.)

## Use
- **Popup:** click the toolbar icon, paste a YouTube link, choose **Download**
  or **Save to Drive**. (On a YouTube tab the link auto-fills.)
- **On photovideo.ae/download:** the page can detect the extension
  (`document.documentElement.dataset.pvSaver`) and route its buttons through it —
  see the contract in `content/bridge.js`. (Site wiring is a follow-up.)

## Google Drive setup (only for "Save to Drive")
The bytes go browser → Drive with the user's own token. One-time config of the
existing Google OAuth project:
1. In Google Cloud Console → your OAuth client (type **Web application**).
2. Click the extension → **Google Drive setup** → copy the shown **redirect URI**
   (`https://<id>.chromiumapp.org/`) and add it to the client's *Authorized
   redirect URIs*.
3. Paste the client's **Client ID** into the same setup box → **Save**.
4. Scope used: `drive.file` (only files the app creates).

## What works now (MVP) / what's next
**Works:** videos that expose a single-file progressive MP4 (most ≤720p),
extracted via the iOS/Android/Web InnerTube clients on the user's IP; device
download and Drive upload with live progress.

**Not yet:**
- 4K / high-res that ship as separate video+audio streams (needs in-browser
  muxing, e.g. ffmpeg.wasm) — next iteration.
- Cipher-only formats (we currently prefer direct-URL clients).
- Non-YouTube sites (TikTok/Instagram/etc.) — easy to add per-extractor.

**Hardening roadmap:** swap the hand-rolled extractor for a vendored
`youtubei.js` bundle (handles ciphers, n-param, PO tokens, 1000+ sites),
add ffmpeg.wasm muxing for 4K, and publish to Firefox Add-ons.

## Files
- `manifest.json` — MV3, permissions, host access, content script
- `background.js` — job router; device download + Drive orchestration + progress
- `src/youtube.js` — InnerTube extractor (runs on the user's IP, with cookies)
- `src/drive.js` — in-browser OAuth (`launchWebAuthFlow`) + resumable Drive upload
- `popup/` — standalone UI (paste link → download / save to Drive)
- `content/bridge.js` — connects the photovideo.ae page to the extension
