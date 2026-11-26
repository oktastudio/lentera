// Service worker LENTERA: membuat game bisa dibuka tanpa internet setelah
// pernah dimuat sekali. Hanya menyentuh file dari situs ini; Firebase dan
// layanan luar lainnya tidak diganggu.
const CACHE = 'lentera-v1';
const ROOT = new URL('./', self.registration.scope).href;
const CORE = [ROOT, './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const MAX_ENTRIES = 80; // batas isi cache supaya file lama tidak menumpuk

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(CORE.map((url) => cache.add(url).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, ROOT));
  } else if (url.pathname.includes('/assets/')) {
    // File di /assets/ bernama hash, isinya tidak pernah berubah.
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(networkFirst(req));
  }
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_ENTRIES; i++) await cache.delete(keys[i]);
}

async function networkFirst(req, key) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) {
      await cache.put(key ?? req, res.clone());
      await trim(cache);
    }
    return res;
  } catch (err) {
    const hit = await cache.match(key ?? req);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    await trim(cache);
  }
  return res;
}
