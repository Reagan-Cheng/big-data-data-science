// 讓遊戲在 HTTPS 網址下可以離線遊玩：有網路時抓最新版，沒網路時用快取
importScripts('version.js');
const CACHE = 'anya-kart-' + self.ANYA_KART_VERSION;
const FILES = ['./', './index.html', './style.css', './main.js', './main.js?v=2.0', './anya-model.js?v=2.0', './tracks.js?v=2.0', './version.js', './lib/three.module.min.js', './manifest.webmanifest',
  './img/racer1.png', './img/racer2.png', './img/racer3.png', './img/racer4.png', './img/icon-180.png', './img/icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // no-cache：每次都向網站確認有沒有新版（不用瀏覽器暫存的舊檔）
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
