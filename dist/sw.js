const CACHE = "commentorchive-v18";
const ASSETS = ["./", "./index.html", "./styles.css?v=18", "./config.js?v=18", "./app.js?v=18", "./firebase-cloud.js?v=18", "./main.js?v=18", "./personal.js?v=18", "./ocr/tesseract.min.js?v=18", "./manifest.webmanifest", "./favicon.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("commentorchive-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  const scope = self.registration.scope;
  if (e.request.method === "POST" && url.href === new URL("./share", scope).href) {
    e.respondWith((async () => {
      const data = await e.request.formData();
      const params = new URLSearchParams();
      for (const field of ["title", "text", "url"]) {
        const value = data.get(field);
        if (typeof value === "string" && value) params.set(field, value.slice(0, 12000));
      }
      const destination = new URL("./", scope);
      destination.hash = "share?" + params;
      return Response.redirect(destination.href, 303);
    })());
    return;
  }
  // Never cache credentials, API responses, or signed private images.
  if (e.request.method !== "GET" || url.origin !== self.location.origin || (url.pathname.startsWith("/__/") || url.pathname.startsWith("/api/"))) return;
  e.respondWith(fetch(e.request).then(r => { if(r.ok) { const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); } return r; }).catch(()=>caches.match(e.request)));
});
