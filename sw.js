// オフライン対応：ネットワーク優先、失敗したらキャッシュ（問題データ更新をすぐ反映するため）
const CACHE = 'sa-study-v1';
const FILES = ['./', 'index.html', 'css/style.css', 'js/srs.js', 'js/charts.js', 'js/app.js',
  'data/a1.js', 'data/a2_part1.js', 'data/a2_part2.js', 'data/b1.js', 'data/b2.js', 'icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
