self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('taskly-v1').then(cache => {
      return cache.addAll(['./', './index.html', './style.css', './script.js']);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
