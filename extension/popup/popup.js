// popup.js — drives the popup UI and talks to the background service worker.

const $ = (id) => document.getElementById(id);
const urlEl = $('url');
const statusEl = $('status');
const titleEl = $('title');
const fillEl = $('fill');
const msgEl = $('msg');
const linkEl = $('link');

let port = null;
let busy = false;

function connect() {
  port = chrome.runtime.connect({ name: 'pv' });
  port.onMessage.addListener(onMessage);
  port.onDisconnect.addListener(() => {
    port = null;
  });
}

function start(mode) {
  const url = urlEl.value.trim();
  if (!url) {
    urlEl.focus();
    return;
  }
  if (busy) return;
  busy = true;
  setButtons(false);
  statusEl.classList.remove('hidden');
  linkEl.classList.add('hidden');
  titleEl.textContent = '';
  setFill(0);
  msgEl.textContent = 'Starting…';
  if (!port) connect();
  port.postMessage({ type: 'START', url, mode });
}

function onMessage(m) {
  switch (m.type) {
    case 'log':
      msgEl.textContent = m.message;
      break;
    case 'info':
      titleEl.textContent = `${m.title}  ·  ${m.quality} (${m.client})`;
      break;
    case 'progress':
      setFill(m.pct || 0);
      msgEl.textContent = stepLabel(m.step, m.pct);
      break;
    case 'done':
      setFill(100);
      busy = false;
      setButtons(true);
      if (m.mode === 'drive') {
        msgEl.textContent = 'Saved to Google Drive ✓';
        if (m.link) {
          linkEl.href = m.link;
          linkEl.classList.remove('hidden');
        }
      } else {
        msgEl.textContent = 'Downloaded to your device ✓';
      }
      break;
    case 'error':
      busy = false;
      setButtons(true);
      msgEl.textContent = '⚠ ' + m.message;
      break;
  }
}

function stepLabel(step, pct) {
  switch (step) {
    case 'extracting': return 'Reading video info from your IP…';
    case 'downloading': return pct ? `Downloading… ${pct}%` : 'Downloading…';
    case 'authorizing': return 'Connecting Google Drive…';
    case 'uploading': return `Uploading to Drive… ${pct || 0}%`;
    default: return '';
  }
}

function setFill(pct) {
  fillEl.style.width = Math.max(0, Math.min(100, pct)) + '%';
}
function setButtons(enabled) {
  $('device').disabled = !enabled;
  $('drive').disabled = !enabled;
}

$('device').addEventListener('click', () => start('device'));
$('drive').addEventListener('click', () => start('drive'));

// ── Drive setup (client id + redirect uri) ─────────────────────────────────
$('redir').textContent = chrome.identity.getRedirectURL();
chrome.storage.local.get('google_client_id').then(({ google_client_id }) => {
  if (google_client_id) $('clientId').value = google_client_id;
});
$('saveCid').addEventListener('click', async () => {
  const id = $('clientId').value.trim();
  await chrome.storage.local.set({ google_client_id: id });
  $('cidOk').classList.remove('hidden');
  setTimeout(() => $('cidOk').classList.add('hidden'), 1500);
});

// Prefill from the current tab if it's a YouTube page (best effort).
chrome.tabs?.query?.({ active: true, currentWindow: true }).then(([tab]) => {
  if (tab?.url && /youtube\.com|youtu\.be/.test(tab.url)) urlEl.value = tab.url;
}).catch(() => {});

connect();
