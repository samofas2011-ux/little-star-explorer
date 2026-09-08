"""Build the installable offline edition and a portable bilingual ZIP."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[1];public=root/'public';out=public/'offline';out.mkdir(exist_ok=True)
source=(public/'explorer.html').read_text()
head='''<link rel="manifest" href="./manifest.webmanifest"><link rel="apple-touch-icon" href="./icon-192.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'''
registration='''
$('offlinePage').href='./index.html';
if(location.protocol!=='file:'){
 if('serviceWorker' in navigator && window.isSecureContext){
  offlineStatus('offlineSaving');
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async registration=>{
   const worker=registration.installing||registration.waiting||registration.active;
   if(!worker)throw new Error('No service worker');
   if(worker.state!=='activated')await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Offline setup timed out')),25000);
    function check(){if(worker.state==='activated'){clearTimeout(timer);resolve()}else if(worker.state==='redundant'){clearTimeout(timer);reject(new Error('Offline setup failed'))}}
    worker.addEventListener('statechange',check);check();
   });
   const stored=await caches.match(new URL('./index.html',location.href).href);
   if(!stored)throw new Error('Atlas was not cached');
   offlineStatus('offlineReady');
   if(navigator.storage && navigator.storage.persist)navigator.storage.persist().catch(()=>{});
  }).catch(()=>offlineStatus('offlineError'));
 }else offlineStatus('offlineUnsupported');
}
'''
html=source.replace('</head>',head+'</head>').replace('</script></body>',registration+'</script></body>')
(out/'index.html').write_text(html)
revision=hashlib.sha256(html.encode()).hexdigest()[:12]
worker="""'use strict';
// This cache is restricted to the atlas folder and contains no account data.
const PREFIX='little-star-offline:'+self.registration.scope+':';
const CACHE=PREFIX+'__VERSION__';
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
""".replace('__VERSION__',revision)
(out/'sw.js').write_text(worker)
manifest={'id':'./','name':'Explorador de estrellas / Star Explorer','short_name':'Estrellas','description':'88 constelaciones y 5.044 estrellas. Español / English. Sin conexión.','lang':'es','start_url':'./index.html','scope':'./','display':'standalone','background_color':'#080f21','theme_color':'#080f21','icons':[{'src':f'./icon-{size}.png','sizes':f'{size}x{size}','type':'image/png','purpose':'any'} for size in [192,512]]}
(out/'manifest.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
with zipfile.ZipFile(public/'explorador-estrellas-offline.zip','w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('explorador-estrellas.html',source)
 for p in sorted(out.iterdir()):
  if p.is_file():z.write(p,'tablet/'+p.name)
 z.write(root/'OFFLINE.md','LEEME-README.md')
print('Offline bundle:',public/'explorador-estrellas-offline.zip')
"""
The standalone HTML defaults to Spanish; both editions remember the selected
language where local storage is available. Keep the original BSD notice.
"""
