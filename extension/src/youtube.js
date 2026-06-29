// youtube.js — InnerTube extractor that runs inside the user's browser.
//
// Why this works where the server can't: these fetches go out the USER's
// residential IP (not a datacenter), and with `credentials: 'include'` they
// carry the user's youtube.com cookies. That combination is what YouTube's
// anti-bot expects, so the "Sign in to confirm you're not a bot" wall that
// blocks the server doesn't apply here.
//
// MVP strategy: ask several InnerTube clients for the player response and pick
// the first PROGRESSIVE mp4 (audio+video in one file, itag 22/18) that comes
// back with a direct `url` (no signature cipher). iOS/Android clients usually
// return direct URLs, so we avoid having to re-implement yt-dlp's base.js
// signature/n-param deciphering for the MVP. Adaptive-only / 4K videos that
// need muxing are a known follow-up.

const CLIENTS = {
  ios: {
    key: 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc',
    context: {
      client: {
        clientName: 'IOS',
        clientVersion: '19.45.4',
        deviceModel: 'iPhone16,2',
        osName: 'iOS',
        osVersion: '18.1.0.22B83',
        hl: 'en',
        gl: 'US',
      },
    },
    userAgent: 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X)',
  },
  android: {
    key: 'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
    context: {
      client: {
        clientName: 'ANDROID',
        clientVersion: '19.44.38',
        androidSdkVersion: 34,
        osName: 'Android',
        osVersion: '14',
        hl: 'en',
        gl: 'US',
      },
    },
    userAgent: 'com.google.android.youtube/19.44.38 (Linux; U; Android 14) gzip',
  },
  web: {
    key: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20241201.00.00',
        hl: 'en',
        gl: 'US',
      },
    },
    userAgent: navigator.userAgent,
  },
};

// Progressive itags (single-file audio+video, mp4). Highest first.
const PROGRESSIVE_PREF = [22, 18, 59, 37];

export function parseVideoId(input) {
  const s = (input || '').trim();
  // raw 11-char id
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1, 12) || null;
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/\/(shorts|embed|v|live)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  } catch {
    const m = s.match(/[A-Za-z0-9_-]{11}/);
    if (m) return m[0];
  }
  return null;
}

async function callPlayer(clientKey, videoId) {
  const c = CLIENTS[clientKey];
  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${c.key}&prettyPrint=false`,
    {
      method: 'POST',
      credentials: 'include', // send the user's youtube.com cookies
      headers: {
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': clientKey === 'ios' ? '5' : clientKey === 'android' ? '3' : '1',
        'X-YouTube-Client-Version': c.context.client.clientVersion,
        // Note: the UA on fetch() is partially controlled by the browser; sent best-effort.
        'User-Agent': c.userAgent,
      },
      body: JSON.stringify({
        context: c.context,
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
        playbackContext: {
          contentPlaybackContext: { html5Preference: 'HTML5_PREF_WANTS' },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`player ${clientKey} HTTP ${res.status}`);
  return res.json();
}

function collectProgressive(playerResponse) {
  const sd = playerResponse?.streamingData;
  if (!sd) return [];
  const out = [];
  for (const f of sd.formats || []) {
    if (!f.url) continue; // skip cipher-only formats in the MVP
    if (!String(f.mimeType || '').includes('mp4')) continue;
    out.push({
      itag: f.itag,
      url: f.url,
      qualityLabel: f.qualityLabel || `${f.height || '?'}p`,
      height: f.height || 0,
      mime: f.mimeType,
      bitrate: f.bitrate || 0,
      contentLength: Number(f.contentLength || 0),
    });
  }
  return out;
}

function pickBest(formats) {
  if (!formats.length) return null;
  // prefer known progressive itags by our order, else tallest
  for (const itag of PROGRESSIVE_PREF) {
    const m = formats.find((f) => f.itag === itag);
    if (m) return m;
  }
  return formats.slice().sort((a, b) => b.height - a.height)[0];
}

/**
 * Extract a directly-downloadable progressive MP4 for a YouTube URL/ID.
 * Returns { videoId, title, author, lengthSeconds, format, client } or throws.
 */
export async function extractYouTube(input, log = () => {}) {
  const videoId = parseVideoId(input);
  if (!videoId) throw new Error('Could not read a YouTube video ID from that link.');

  let lastErr = null;
  let title = null;
  for (const clientKey of ['ios', 'android', 'web']) {
    try {
      log(`Asking YouTube (${clientKey}) from your IP…`);
      const pr = await callPlayer(clientKey, videoId);

      const status = pr?.playabilityStatus?.status;
      title = pr?.videoDetails?.title || title;
      if (status && status !== 'OK') {
        const reason = pr?.playabilityStatus?.reason || status;
        // LOGIN_REQUIRED / bot wall — try next client before giving up
        lastErr = new Error(reason);
        if (/bot|sign in|login/i.test(reason)) continue;
        if (status === 'UNPLAYABLE' || status === 'ERROR') continue;
      }

      const progressive = collectProgressive(pr);
      const best = pickBest(progressive);
      if (best) {
        return {
          videoId,
          title: pr?.videoDetails?.title || title || videoId,
          author: pr?.videoDetails?.author || '',
          lengthSeconds: Number(pr?.videoDetails?.lengthSeconds || 0),
          format: best,
          client: clientKey,
        };
      }
      lastErr = new Error('No single-file MP4 available (video may be 4K/adaptive-only).');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Extraction failed.');
}

export function safeFilename(name, ext = 'mp4') {
  const base = (name || 'video')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return `${base || 'video'}.${ext}`;
}
