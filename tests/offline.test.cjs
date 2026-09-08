const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync('public/offline/sw.js','utf8');
const scope='https://example.test/tablet/';
async function harness(fail=false,redirect=false){
 const handlers={},stores=new Map();let online=true,fetches=0;
 const caches={open:async key=>{if(!stores.has(key))stores.set(key,new Map());const s=stores.get(key);return {put:async(url,r)=>s.set(url,r.clone()),match:async url=>s.get(typeof url==='string'?url:url.url)?.clone()}},keys:async()=>[...stores.keys()],delete:async key=>stores.delete(key)};
 const sandbox={URL,Response,self:{registration:{scope},addEventListener:(n,f)=>handlers[n]=f,skipWaiting:async()=>{},clients:{claim:async()=>{}}},caches,fetch:async input=>{fetches++;if(!online)throw new Error('No internet');const file=new URL(typeof input==='string'?input:input.url).pathname.split('/').pop();const response=new Response(fail?'Sign in':fs.readFileSync('public/offline/'+file),{status:200});if(redirect&&file==='index.html'){Object.defineProperty(response,'redirected',{value:true});Object.defineProperty(response,'url',{value:redirect==='external'?'https://example.test/login':scope})}return response}};
 vm.createContext(sandbox);vm.runInContext(script,sandbox);
 function lifetime(type){let job;handlers[type]({waitUntil:p=>job=p});return job}
 function request(path,mode='navigate',method='GET'){let result;handlers.fetch({request:{url:new URL(path,scope).href,mode,method},respondWith:p=>result=p});return result}
 return {lifetime,request,stores,get fetches(){return fetches},offline(){online=false}};
}
(async()=>{
 const h=await harness();await h.lifetime('install');await h.lifetime('activate');assert.equal(h.fetches,4);
 h.offline();const calls=h.fetches;
 for(const path of ['index.html','./','index.html?launch=home']){const r=await h.request(path);assert(r.ok);assert((await r.text()).includes('id="atlas-data"'))}
 const icon=await h.request('icon-192.png','same-origin');assert(icon.ok);
 assert.equal(h.fetches,calls,'cached navigation must work without making network requests');
 assert.equal(h.request('/account'),undefined);
 assert.equal(h.request('private-notes.html'),undefined);
 assert.equal(h.request('index.html','navigate','POST'),undefined);
 const bad=await harness(true);await assert.rejects(bad.lifetime('install'),/Expected atlas/);assert.equal(bad.stores.size,0,'a sign-in page must never be accepted as the offline atlas');
 const canonical=await harness(false,true);await canonical.lifetime('install');canonical.offline();assert((await (await canonical.request('./')).text()).includes('id="atlas-data"'));
 const external=await harness(false,'external');await assert.rejects(external.lifetime('install'),/Offline asset unavailable/);
 const manifest=JSON.parse(fs.readFileSync('public/offline/manifest.webmanifest','utf8'));
 assert.equal(manifest.start_url,'./index.html');assert.equal(manifest.scope,'./');
 for(const icon of manifest.icons)assert(fs.existsSync('public/offline/'+icon.src));
 const html=fs.readFileSync('public/offline/index.html','utf8');assert(html.includes("register('./sw.js'"));new vm.Script(html.match(/<script>\s*('use strict';.*?)<\/script>/s)[1]);
 console.log('PASS: service-worker installation, cache-only airplane-mode navigation, subfolder scope, both icons, no unrelated interception, rejection of sign-in pages, manifest and installable script syntax.');
})().catch(e=>{console.error(e);process.exitCode=1});
