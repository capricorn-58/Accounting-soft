// Salesman App — Service Worker
//
// IMPORTANT: Har baar jab bhi salesman-app.html (ya is se juri koi file) update
// karein, neeche CACHE_VERSION ka number badha dein (v3, v4, v5...). Yehi
// version number Android par install shuda app ko naya update dikhane ka
// signal deta hai — agar version number nahi badla to Android app purani
// file hi dikhata rahega.
const CACHE_VERSION = 'salesman-app-v2';

const CACHE_FILES = [
  './salesman-app.html',
  './manifest.json',
  './icon-192.png'
];

// Naya version install hote hi purani files cache kar lete hain, lekin turant
// activate nahi hote (waitUntil / no skipWaiting) — taake koi salesman order
// bharte waqt beech mein hi app refresh na ho jaye. Activation user ke
// "Update Available" banner tap karne per hoti hai (salesman-app.html mein
// PWA.applyUpdate() dekhein).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CACHE_FILES))
      .catch(err => console.warn('SW cache addAll failed', err))
  );
});

// Purane cache versions saaf kar dete hain jab naya version activate hota hai.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Jab app ka "Update Available" banner tap ho, salesman-app.html se ye message
// aata hai — is se naya service worker foran activate ho jata hai.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch strategy:
// - HTML app shell: NETWORK-FIRST — internet available ho to hamesha sab se
//   nayi file layein (taake update turant nazar aaye), offline ho to cache
//   se dikha dein.
// - Baaki files (manifest, icons, fonts wagera): CACHE-FIRST — tez load,
//   background mein cache refresh ho jati hai.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('./salesman-app.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      const networkFetch = fetch(req).then(res => {
        const resClone = res.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(req, resClone));
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
