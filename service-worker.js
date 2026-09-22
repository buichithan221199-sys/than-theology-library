const CACHE='theology-library-v3';
const CORE=['./','./manifest.webmanifest','./app-icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

function normalizedCacheKey(request){
  if(request.mode==='navigate')return new Request(new URL('./',self.registration.scope).href);
  const u=new URL(request.url);
  u.searchParams.delete('v');
  return new Request(u.toString(),{method:'GET'});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  if(u.origin!==location.origin)return;
  const key=normalizedCacheKey(event.request);
  event.respondWith(
    fetch(event.request).then(r=>{
      if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(key,copy)).catch(()=>{});}
      return r;
    }).catch(async()=>{
      const cached=await caches.match(key);
      if(cached)return cached;
      if(event.request.mode==='navigate')return (await caches.match('./'))||Response.error();
      return Response.error();
    })
  );
});
