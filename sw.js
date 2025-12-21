const CACHE_NAME = 'buildflow-v6';
const ASSETS = [
  './',
  'index.html',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Пытаемся кешировать, но не ломаем установку если какой-то файл не найден
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url))
      ).then(results => {
        results.forEach((res, i) => {
          if (res.status === 'rejected') {
            console.warn(`[SW] Failed to cache ${ASSETS[i]}:`, res.reason);
          }
        });
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
});

self.addEventListener('fetch', (event) => {
  // Игнорируем API запросы и внешние ресурсы
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Возвращаем главную страницу если оффлайн и это навигация
        if (event.request.mode === 'navigate') {
          return caches.match('./');
        }
      });
    })
  );
});