const CACHE='than-theology-v2';
const OLD_AI='https://than-theology-ai-buichithan221199-9344.vercel.app/api/process';
const NEW_AI='https://cikobcunfmnvlyutlyai.supabase.co/functions/v1/theology-process';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/','/index.html','/manifest.webmanifest'])));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.url===OLD_AI){
    e.respondWith((async()=>{
      const body=await e.request.clone().arrayBuffer();
      const headers=new Headers(e.request.headers);
      headers.delete('host');
      return fetch(NEW_AI,{method:e.request.method,headers,body});
    })());
    return;
  }
  if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});