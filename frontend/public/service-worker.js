// Service Worker para SetupSO PWA
// Cache versioning
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `setupso-${CACHE_VERSION}`;
const DATA_CACHE = `setupso-data-${CACHE_VERSION}`;

// Arquivos a cachear
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo/icon-192.png',
  '/logo/icon-512.png'
];

// Install event - cache arquivos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Cacheando arquivos:', URLS_TO_CACHE);
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.error('[ServiceWorker] Install error:', err))
  );
});

// Activate event - limpar caches antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE) {
            console.log('[ServiceWorker] Deletando cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - estratégia network-first para dados, cache-first para assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip não-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API calls - network-first com fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const cache = caches.open(DATA_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fallback para cache offline
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              // Offline page fallback
              return new Response(
                JSON.stringify({
                  error: 'Offline - dados do cache podem estar desatualizados'
                }),
                { headers: { 'Content-Type': 'application/json' } }
              );
            });
        })
    );
    return;
  }

  // Assets estáticos - cache-first
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request)
          .then((response) => {
            // Cachear novas respostas bem-sucedidas
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            return response;
          });
      })
      .catch(() => {
        // Retornar offline page
        return caches.match('/index.html');
      })
  );
});

// Background Sync para sincronizar dados quando online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-events') {
    event.waitUntil(
      fetch('/api/events/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString()
        })
      })
        .then((response) => {
          if (response.ok) {
            console.log('[ServiceWorker] Sincronizado com sucesso');
          }
        })
        .catch((err) => {
          console.error('[ServiceWorker] Erro ao sincronizar:', err);
        })
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {
    title: 'SetupSO',
    body: 'Nova notificação'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo/icon-192.png',
      badge: '/logo/icon-96.png',
      tag: 'setupso-notification',
      data: data
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Procurar por cliente aberto
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

console.log('[ServiceWorker] Service Worker carregado');
