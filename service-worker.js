const CACHE_NAME="cafe-pos-pro-v1";
const FILES=["./","./index.html","./manifest.json","./app.js","./style.css","./assets/icon.svg"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES)))});
self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
