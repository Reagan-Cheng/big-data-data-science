// 讓遊戲在 HTTPS 網址下可以離線遊玩
const CACHE = 'anya-monster-anime-v5-phone';
const FILES = ['./', './index.html', './style.css', './draw.js', './draw.js?v=20261101-phone', './anime-art.js?v=20261101-phone', './style.css?v=20261101-phone', './game.js', './game.js?v=20261101-phone', './manifest.webmanifest',
  './img/anime/frames.json?v=20261101-penguin',
  ...['anya-atlas', 'loid-atlas', 'yor-atlas', 'bond-atlas', 'enemies-atlas', 'penguin-atlas', 'city', 'school', 'ship', 'night'].flatMap(n => [`./img/anime/${n}.png`, `./img/anime/${n}.png?v=20261101-penguin`]),
  './img/anya.png', './img/icon-180.png', './img/icon-512.png'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys
      .filter((k) => k.startsWith('anya-monster-') && k !== CACHE)
      .map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))));
