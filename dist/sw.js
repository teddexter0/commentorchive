const CACHE = "commentorchive-v13";
const ASSETS = ["./", "./index.html", "./styles.css?v=13", "./config.js?v=13", "./app.js?v=13", "./firebase-cloud.js?v=13", "./main.js?v=13", "./personal.js?v=13", "./ocr/tesseract.min.js?v=13", "./manifest.webmanifest", "./favicon.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("commentorchive-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Never cache credentials, API responses, or signed private images.
  if (e.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/__/")) return;
  e.respondWith(fetch(e.request).then(r => { if(r.ok) { const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); } return r; }).catch(()=>caches.match(e.request)));
});
