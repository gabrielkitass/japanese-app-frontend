const CACHE_VERSION = 'nihongo-app-v1.2.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const CORE_STATIC = [
  '/login.html',
  '/student.html',
  '/css/common.css',
  '/css/student.css',
  '/js/config.js',
  '/js/i18n.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/student.js',
  '/locales/ja.json',
  '/locales/en.json',
  '/locales/pt.json'
];

const OPTIONAL_STATIC = [
  '/teacher.html',
  '/css/teacher.css',
  '/js/teacher.js',
  '/js/tts.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(async c => {
      await c.addAll(CORE_STATIC);
      await Promise.allSettled(OPTIONAL_STATIC.map(url => c.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !k.startsWith(CACHE_VERSION))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(
          JSON.stringify({ error: 'offline', message: 'オフラインです。接続を確認してください。' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        if (e.request.destination === 'document') {
          return caches.match('/login.html');
        }
      });
    })
  );
});
