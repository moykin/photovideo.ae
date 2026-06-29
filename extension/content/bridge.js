// bridge.js — content script on photovideo.ae.
//
// Lets the website use the extension instead of the (blocked) server. The page
// can detect the extension and post a request; we run it on the user's IP and
// stream progress back to the page.
//
// Page-side contract (add this to /download when the extension is present):
//   if (document.documentElement.dataset.pvSaver) { ...show "download via extension"... }
//   window.postMessage({ source: 'pv-saver', type: 'download', url, mode }, '*');
//   window.addEventListener('message', (e) => {
//     if (e.data?.source === 'pv-saver-bg') { /* e.data.kind: progress|info|done|error */ }
//   });

(() => {
  const VERSION = chrome.runtime.getManifest().version;
  document.documentElement.dataset.pvSaver = VERSION;
  window.dispatchEvent(new CustomEvent('pv-saver-ready', { detail: { version: VERSION } }));

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== 'pv-saver' || data.type !== 'download') return;

    const port = chrome.runtime.connect({ name: 'pv' });
    port.onMessage.addListener((m) => {
      window.postMessage({ source: 'pv-saver-bg', kind: m.type, ...m }, '*');
    });
    port.postMessage({ type: 'START', url: data.url, mode: data.mode === 'drive' ? 'drive' : 'device' });
  });
})();
