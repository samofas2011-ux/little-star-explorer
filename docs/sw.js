'use strict';
// This cache is restricted to the atlas folder and contains no account data.
const PREFIX='little-star-offline:'+self.registration.scope+':';
const CACHE=PREFIX+'3f28a99782c4';
const FILES=['index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
const urlFor=path=>new URL(path,self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const responses=await Promise.all(FILES.map(async path=>{
  const response=await fetch(urlFor(path),{cache:'reload',credentials:'same-origin'});
  const canonicalAtlasRedirect=path==='index.html'&&response.url===self.registration.scope;
  if(!response.ok||(response.redirected&&!canonicalAtlasRedirect))throw new Error('Offline asset unavailable: '+path);
  if(path==='index.html'&&!(await response.clone().text()).includes('id="atlas-data"'))throw new Error('Expected atlas, received another page');
  return [urlFor(path),response];
 }));
 const cache=await caches.open(CACHE);
 await Promise.all(responses.map(([url,response])=>cache.put(url,response)));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||!event.request.url.startsWith(self.registration.scope))return;
 const requestURL=new URL(event.request.url);
 const known=FILES.some(path=>urlFor(path)===requestURL.origin+requestURL.pathname);
 const isHome=event.request.mode==='navigate'&&(requestURL.pathname===new URL(self.registration.scope).pathname||requestURL.pathname===new URL(urlFor('index.html')).pathname);
 if(!known&&!isHome)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(isHome?urlFor('index.html'):requestURL.origin+requestURL.pathname);
  return cached||fetch(event.request);
 })());
});
