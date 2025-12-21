const CACHE_NAME = 'buildflow-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Игнорируем API запросы для Service Worker, чтобы они всегда шли в сеть
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Если сеть недоступна и ресурса нет в кеше, возвращаем главную (для SPA)
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});