// background.js — the extension's brain (MV3 service worker, module).
//
// Receives jobs from the popup or the photovideo.ae page (via content bridge),
// runs extraction on the user's IP, then either:
//   • device mode → hands the direct URL to chrome.downloads (browser downloads
//     from the user's connection — no bytes through our server), or
//   • drive  mode → fetches the bytes (user IP) and uploads straight to the
//     user's Google Drive.

import { extractYouTube, safeFilename } from './src/youtube.js';
import { getAccessToken, uploadToDrive } from './src/drive.js';

// Map chrome.downloads id -> port, so we can stream device-download progress.
const downloadPorts = new Map();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'pv') return;
  port.onMessage.addListener(async (msg) => {
    if (msg?.type === 'START') {
      try {
        await handleJob(port, msg.url, msg.mode);
      } catch (e) {
        safePost(port, { type: 'error', message: e?.message || String(e) });
      }
    }
  });
});

function safePost(port, obj) {
  try {
    port.postMessage(obj);
  } catch {
    /* port closed */
  }
}

async function handleJob(port, url, mode) {
  const log = (message) => safePost(port, { type: 'log', message });

  safePost(port, { type: 'progress', step: 'extracting', pct: 0 });
  const info = await extractYouTube(url, log);
  const filename = safeFilename(info.title);
  safePost(port, {
    type: 'info',
    title: info.title,
    quality: info.format.qualityLabel,
    client: info.client,
    filename,
  });

  if (mode === 'drive') {
    await saveToDrive(port, info, filename);
  } else {
    await saveToDevice(port, info, filename);
  }
}

// ── Device mode ───────────────────────────────────────────────────────────
async function saveToDevice(port, info, filename) {
  safePost(port, { type: 'progress', step: 'downloading', pct: 0 });
  const downloadId = await chrome.downloads.download({
    url: info.format.url,
    filename,
    saveAs: false,
  });
  downloadPorts.set(downloadId, port);
  safePost(port, { type: 'log', message: 'Download started in your browser…' });
}

chrome.downloads.onChanged.addListener((delta) => {
  const port = downloadPorts.get(delta.id);
  if (!port) return;
  if (delta.state?.current === 'complete') {
    safePost(port, { type: 'done', mode: 'device' });
    downloadPorts.delete(delta.id);
  } else if (delta.state?.current === 'interrupted') {
    safePost(port, { type: 'error', message: 'Browser download was interrupted.' });
    downloadPorts.delete(delta.id);
  }
});

// ── Drive mode ────────────────────────────────────────────────────────────
async function saveToDrive(port, info, filename) {
  safePost(port, { type: 'progress', step: 'downloading', pct: 0 });

  const resp = await fetch(info.format.url);
  if (!resp.ok) throw new Error(`Could not fetch the video (HTTP ${resp.status}).`);

  const total = Number(resp.headers.get('content-length') || info.format.contentLength || 0);
  const reader = resp.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total) {
      safePost(port, { type: 'progress', step: 'downloading', pct: Math.round((loaded / total) * 100) });
    }
  }
  const blob = new Blob(chunks, { type: 'video/mp4' });

  safePost(port, { type: 'progress', step: 'authorizing', pct: 0 });
  const token = await getAccessToken(true);

  safePost(port, { type: 'progress', step: 'uploading', pct: 0 });
  const result = await uploadToDrive(token, blob, filename, (pct) =>
    safePost(port, { type: 'progress', step: 'uploading', pct })
  );

  safePost(port, { type: 'done', mode: 'drive', link: result?.webViewLink || '' });
}
