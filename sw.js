// オフライン対応：ネットワーク優先（タイムアウト付き）、失敗したらキャッシュ
// 問題データを更新したら CACHE のバージョンを上げる
const CACHE = 'sa-study-v4';
const FILES = ['./', 'index.html', 'css/style.css', 'js/srs.js', 'js/charts.js', 'js/app.js',
  'data/a1.js', 'data/a1_strategy.js', 'data/a1_hard.js', 'data/a2_part1.js', 'data/a2_part2.js', 'data/a2_strategy.js', 'data/a2_hard.js', 'data/b1.js', 'data/b2.js', 'icon.svg', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'];
const TIMEOUT = 4000;

self.addEventListener('install', (e) => {
  // 1ファイルの失敗で全体がインストールされないことがないよう、個別にキャッシュする
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const net = fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); e.waitUntil(caches.open(CACHE).then((c) => c.put(e.request, copy))); }
    return r;
  });
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT));
  e.respondWith(Promise.race([net, timeout]).catch(() =>
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || net)));
});
