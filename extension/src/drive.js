// drive.js — upload a video straight to the user's Google Drive FROM the browser.
//
// The bytes never touch your server: the extension fetches the video (user IP)
// and PUTs it to Drive with the user's own OAuth token. Reuses the existing
// Google OAuth project — you only need to add this extension's redirect URI.
//
// SETUP (one-time, in Google Cloud Console → your OAuth client):
//   1. Use a "Web application" OAuth 2.0 Client ID.
//   2. Add Authorized redirect URI:  https://<EXTENSION_ID>.chromiumapp.org/
//      (get <EXTENSION_ID> from chrome://extensions; or run
//       chrome.identity.getRedirectURL() in the SW console — it prints the URL)
//   3. Put the client id below (or set it from the popup; it's cached in storage).

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'PhotoVideo.ae Downloads';

// Fallback client id — override via chrome.storage ('google_client_id').
const DEFAULT_CLIENT_ID = '';

async function getClientId() {
  const { google_client_id } = await chrome.storage.local.get('google_client_id');
  return google_client_id || DEFAULT_CLIENT_ID;
}

export async function setClientId(id) {
  await chrome.storage.local.set({ google_client_id: id });
}

function parseHashToken(redirectUrl) {
  const u = new URL(redirectUrl);
  const frag = new URLSearchParams((u.hash || '').replace(/^#/, ''));
  return {
    access_token: frag.get('access_token'),
    expires_in: Number(frag.get('expires_in') || 3600),
  };
}

export async function getAccessToken(interactive = true) {
  const cached = await chrome.storage.local.get(['drive_token', 'drive_token_exp']);
  if (cached.drive_token && cached.drive_token_exp && cached.drive_token_exp - 60_000 > Date.now()) {
    return cached.drive_token;
  }

  const clientId = await getClientId();
  if (!clientId) {
    throw new Error('Google client ID is not set. Open the extension options and paste it.');
  }

  const redirectUri = chrome.identity.getRedirectURL();
  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: clientId,
      response_type: 'token',
      redirect_uri: redirectUri,
      scope: SCOPE,
      prompt: 'consent',
    }).toString();

  const redirect = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive });
  const { access_token, expires_in } = parseHashToken(redirect);
  if (!access_token) throw new Error('Google did not return an access token.');

  await chrome.storage.local.set({
    drive_token: access_token,
    drive_token_exp: Date.now() + expires_in * 1000,
  });
  return access_token;
}

async function getOrCreateFolder(token) {
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const find = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await find.json();
  if (data.files && data.files[0]) return data.files[0].id;

  const create = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  return (await create.json()).id;
}

/**
 * Upload a Blob to Drive with a resumable session, reporting progress.
 * onProgress(pct) gets 0..100. Returns { id, webViewLink, name }.
 */
export async function uploadToDrive(token, blob, filename, onProgress = () => {}) {
  const folderId = await getOrCreateFolder(token);

  // 1) open a resumable session
  const session = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': blob.type || 'video/mp4',
        'X-Upload-Content-Length': String(blob.size),
      },
      body: JSON.stringify({ name: filename, parents: [folderId] }),
    }
  );
  if (!session.ok) throw new Error(`Drive session HTTP ${session.status}`);
  const sessionUrl = session.headers.get('Location');
  if (!sessionUrl) throw new Error('Drive did not return an upload session URL.');

  // 2) PUT in chunks (multiple of 256 KiB as Drive requires)
  const CHUNK = 8 * 1024 * 1024;
  let offset = 0;
  let result = null;
  while (offset < blob.size) {
    const end = Math.min(offset + CHUNK, blob.size);
    const chunk = blob.slice(offset, end);
    const res = await fetch(sessionUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes ${offset}-${end - 1}/${blob.size}` },
      body: chunk,
    });
    if (res.status === 308) {
      // incomplete — continue
      offset = end;
      onProgress(Math.round((offset / blob.size) * 100));
      continue;
    }
    if (res.ok) {
      result = await res.json();
      onProgress(100);
      break;
    }
    throw new Error(`Drive upload HTTP ${res.status}`);
  }
  return result;
}
