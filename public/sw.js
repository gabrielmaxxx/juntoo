// Service Worker for PWA - Push Notifications & Caching
const CACHE_NAME = 'juntoo-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Routes/URLs that should NEVER be cached
const DENY_LIST = [/^\/~oauth/, /supabase\.co/, /\/rest\//, /\/auth\//, /\/functions\//];

// Install event - cache static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(cacheName) {
            return cacheName !== CACHE_NAME;
          })
          .map(function(cacheName) {
            return caches.delete(cacheName);
          })
      );
    })
  );
  event.waitUntil(clients.claim());
});

// Fetch event - network first for navigation, cache-first for static assets
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  var requestUrl = event.request.url;
  var pathname = new URL(requestUrl).pathname;

  // Skip denied URLs (API calls, auth, etc.)
  if (DENY_LIST.some(function(re) { return re.test(requestUrl) || re.test(pathname); })) return;

  // For navigation requests, always go network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match('/');
      })
    );
    return;
  }

  // For static assets (.js, .css, images), use cache-first
  var isStaticAsset = /\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ico)(\?.*)?$/.test(pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (response.status === 200) {
            var responseClone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // For everything else, network-only (don't cache API responses, JSON, etc.)
  event.respondWith(fetch(event.request));
});

// Push notification event
self.addEventListener('push', function(event) {
  var title = 'Juntoo';
  var options = {
    body: 'Você tem uma nova notificação',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: { url: '/' },
  };

  if (event.data) {
    try {
      var data = event.data.json();
      title = data.title || title;
      options.body = data.message || data.body || options.body;
      options.data = { url: data.url || '/' };
    } catch (e) {
      // If payload can't be parsed, use defaults
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Listen for skip waiting message
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
