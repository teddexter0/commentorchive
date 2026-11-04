const CACHE = "commentorchive-v12";
const ASSETS = ["./", "./index.html", "./styles.css?v=12", "./config.js?v=12", "./app.js?v=12", "./firebase-cloud.js?v=12", "./main.js?v=12", "./personal.js?v=12", "./ocr/tesseract.min.js?v=12", "./manifest.webmanifest", "./favicon.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("commentorchive-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Never cache credentials, API responses, or signed private images.
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if(r.ok) { const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); } return r; }).catch(()=>caches.match(e.request)));
});
