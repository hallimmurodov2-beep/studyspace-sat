/* Studyspace SAT — offline shell. Network first (always the newest files when online), saved copy when offline.
   Your data never passes through here; it lives in localStorage. */
const CACHE = 'studyspace-sat-v4';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/util.js', 'js/content/skills.js', 'js/content/rw.js', 'js/content/math.js', 'js/content/vocab.js',
  'js/store.js', 'js/engine.js', 'js/ui.js', 'js/orbit.js', 'js/views.js', 'js/player.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('studyspace-sat-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE), key = url.origin + url.pathname;
    try {
      const res = await Promise.race([fetch(req.url, { cache: 'no-cache' }), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 3500))]);
      if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(key)) || (req.mode === 'navigate' ? cache.match(new URL('index.html', self.registration.scope).href) : Response.error());
    }
  })());
});
