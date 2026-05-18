const CACHE_VERSION = 'nihongo-app-v1.2.2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const CORE_FILES = [
  'login.html',
  'student.html',
  'css/common.css',
  'css/student.css',
  'js/config.js',
  'js/i18n.js',
  'js/api.js',
  'js/auth.js',
  'js/student.js',
  'locales/ja.json',
  'locales/en.json',
  'locales/pt.json'
];

const OPTIONAL_FILES = [
  'teacher.html',
  'css/teacher.css',
  'js/teacher.js',
  'js/tts.js'
];

self.addEventListener('install', e => {
  const base = self.registration.scope;
  e.waitUntil(
    caches.open(STATIC_CACHE).then(async c => {
      await c.addAll(CORE_FILES.map(f => base + f));
      await Promise.allSettled(OPTIONAL_FILES.map(f => c.add(base + f)));
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

  if (url.pathname.includes('/api/')) {
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
          return caches.match(self.registration.scope + 'login.html');
        }
      });
    })
  );
});
