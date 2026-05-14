const CACHE = 'nihongo-app-v1';
const STATIC = [
  '/',
  '/index.html',
  '/student.html',
  '/teacher.html',
  '/css/common.css',
  '/css/student.css',
  '/css/teacher.css',
  '/js/config.js',
  '/js/i18n.js',
  '/js/tts.js',
  '/js/api.js',
  '/js/student.js',
  '/js/teacher.js',
  '/js/auth.js',
  '/locales/ja.json',
  '/locales/en.json',
  '/locales/pt.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
