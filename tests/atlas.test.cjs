const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('public/explorer.html', 'utf8');
const data = JSON.parse(html.match(/id="atlas-data" type="application\/json">(.*?)<\/script>/s)[1]);
const source = html.match(/<script>\s*('use strict';.*?)<\/script>/s)[1];
const noop = () => {};
const context = new Proxy({createRadialGradient: () => ({addColorStop: noop})}, {get: (o,k) => o[k] || noop, set: (o,k,v) => (o[k]=v,true)});
const elements = new Map(), storage=new Map();
function element(){return {checked:true,value:'',textContent:'',children:[],dataset:{},style:{},classList:{add:noop,remove:noop},setAttribute(k,v){this[k]=v},append(...x){this.children.push(...x)},prepend:noop,replaceChildren(){this.children=[]},addEventListener:noop,getBoundingClientRect:()=>({width:800,height:640,left:0,top:0}),getContext:()=>context,scrollIntoView:noop}}
for(const id of html.matchAll(/id="([^"]+)"/g)) elements.set(id[1],element());
const translated=[...html.matchAll(/data-i18n="([^"]+)"/g)].map(m=>({...element(),dataset:{i18n:m[1]}}));
elements.get('atlas-data').textContent=JSON.stringify(data);
const sandbox={location:{href:'file:///explorador-estrellas.html',protocol:'file:'},document:{documentElement:{lang:''},querySelector:()=>element(),querySelectorAll:()=>translated,getElementById:id=>elements.get(id),createElement:element},window:{},devicePixelRatio:1,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},ResizeObserver:class{observe(){}},requestAnimationFrame:noop,matchMedia:()=>({matches:true}),console};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
assert.equal(sandbox.document.documentElement.lang,'es');
assert.equal(elements.get('name').textContent,'Orión');
assert.equal(elements.get('offlineStatus').textContent,'Archivo local: todo el atlas ya está incluido.');
assert.equal(data.constellations.length,88);assert.equal(data.stars.length,5044);
assert.equal(new Set(data.constellations.map(c=>c.id)).size,88);
assert(data.constellations.find(c=>c.id==='Ser').lines.length>1);
for(const language of ['es','en']){
 vm.runInContext(`language='${language}';applyLanguage()`,sandbox);
 assert.equal(elements.get('choose').children.length,88);
 assert(translated.every(e=>e.textContent && typeof e.textContent==='string'));
 for(const c of data.constellations){
  assert(c.nameEs&&c.meaningEs,c.id);
  vm.runInContext(`select('${c.id}');draw()`,sandbox);
  assert(vm.runInContext('visible.length > 0 && Number.isFinite(lon) && Number.isFinite(lat)',sandbox),c.id);
  assert.equal(elements.get('name').textContent,language==='es'?c.nameEs:c.name);
  if(language==='es')assert(!elements.get('description').textContent.includes('This constellation'));
 }
}
for(const dimensions of [[360,480],[736,620],[1024,640]]){vm.runInContext(`width=${dimensions[0]};height=${dimensions[1]};select('Ori');draw();`,sandbox);assert(vm.runInContext('visible.length > 0',sandbox))}
vm.runInContext("language='es';applyLanguage();showStar(DATA.stars.find(s=>s.name==='Sirius'))",sandbox);
assert(elements.get('starInfo').children.some(e=>e.textContent==='Sirio'));
const view=vm.runInContext('[lon,lat,zoom].join()' ,sandbox);
elements.get('language').onchange({target:{value:'en'}});
assert(elements.get('starInfo').children.some(e=>e.textContent==='Sirius'));
assert.equal(storage.get('little-star-language'),'en');
assert.equal(vm.runInContext('[lon,lat,zoom].join()',sandbox),view);
for(const query of ['orion','Orión']){elements.get('search').value=query;vm.runInContext('renderGrid()',sandbox);assert.equal(elements.get('grid').children.length,1)}
elements.get('search').value='osa';vm.runInContext('renderGrid()',sandbox);assert.equal(elements.get('grid').children.length,2);
elements.get('search').value='zzzzzz';vm.runInContext('renderGrid()',sandbox);assert.equal(elements.get('grid').children[0].textContent,'No matches yet. Try “bear”, “Orion”, or “dragon”.');
vm.runInContext("language='es';applyLanguage()",sandbox);
assert.equal(elements.get('grid').children[0].textContent,'No hay resultados. Prueba «osa», «Orión» o «dragón».');
assert(vm.runInContext('Object.keys(stories).every(id=>storiesEs[id]) && missions.length===missionsEs.length',sandbox));
let spoken;
sandbox.window.speechSynthesis=true;
sandbox.speechSynthesis={cancel:noop,speaking:false,getVoices:()=>[{lang:'es-ES',localService:false,name:'network'},{lang:'es-MX',localService:true,name:'local'}],speak:u=>spoken=u};
sandbox.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
vm.runInContext("language='es';applyLanguage();$('listen').onclick()",sandbox);
assert.equal(spoken.lang,'es-CR');assert.equal(spoken.voice.name,'local');
assert(spoken.text.includes('Orión'));
// The actual standalone page has no resource fetches, script imports or remote fonts.
assert(!/<script[^>]+src=|<link[^>]+(?:stylesheet|preload)|@import|fetch\(/.test(html));
console.log('PASS: 176 bilingual constellation views, 5,044 stars, Spanish defaults, accent-insensitive search, language persistence, selected-star/view preservation, local Spanish voice selection, standalone dependency check.');

// Every zodiac figure navigates to the matching catalog entry in both languages.
for(const lang of ['es','en']){
 vm.runInContext(`language='${lang}';applyLanguage()`,sandbox);
 assert.equal(elements.get('zodiacGrid').children.length,12);
 for(let i=0;i<12;i++){
  elements.get('zodiacGrid').children[i].onclick();
  const id=vm.runInContext('selected',sandbox);
  assert.equal(elements.get('choose').value,id);
  assert.equal(elements.get('zodiacFigure').hidden,false);
  assert(elements.get('zodiacFigure').innerHTML.includes('<path'));
  assert.equal(elements.get('zodiacGrid').children[i]['aria-pressed'],'true');
 }
 vm.runInContext("select('Ori')",sandbox);
 assert.equal(elements.get('zodiacFigure').hidden,true);
 assert.equal(elements.get('zodiacFigure').innerHTML,'');
}
assert.equal(fs.readFileSync('docs/index.html','utf8'),fs.readFileSync('public/offline/index.html','utf8'));
console.log('PASS: all 12 zodiac figures, bilingual navigation, selected state, non-zodiac clearing, and GitHub Pages parity.');
