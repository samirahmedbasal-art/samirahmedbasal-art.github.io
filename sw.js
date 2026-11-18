const C="ironlog-v10",A=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png","icon-maskable.png","screenshot-home.png","JsBarcode.all.min.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{if(e.request.method!="GET")return;
  e.respondWith(caches.open(C).then(async c=>{
    try{const n=await fetch(e.request);if(n.ok)c.put(e.request,n.clone()).catch(()=>{});return n}
    catch(error){const cached=await c.match(e.request,{ignoreSearch:true});if(cached)return cached;if(e.request.mode==="navigate"){const home=await c.match("./");if(home)return home}throw error}
  }))});

