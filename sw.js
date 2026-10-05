// オフライン用。通信がある時は最新を取って保存し直す。2.5秒で取れない時や圏外の時は、保存した版を出す
const CACHE = "wallet-demo-v1";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const net = fetch(req).then(async res => {
    if (res.ok) { const copy = res.clone(); await (await caches.open(CACHE)).put(req, copy); }
    return res;
  });
  e.waitUntil(net.then(() => {}, () => {}));
  e.respondWith((async () => {
    try {
      const res = await Promise.race([net, new Promise(r => setTimeout(r, 2500))]);
      if (res) return res;
    } catch (_) {}
    const cache = await caches.open(CACHE);
    const hit = (await cache.match(req, {ignoreSearch: true})) || (req.mode === "navigate" ? await cache.match("./") : undefined);
    return hit || net;
  })());
});
