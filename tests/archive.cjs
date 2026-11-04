const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(),storage=new Map(),databases=new Map();
function element(){return {value:'',textContent:'',hidden:false,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},querySelector(){return element()},querySelectorAll(){return []},showModal(){this.open=true},close(){this.open=false},setAttribute(){},addEventListener(){},reset(){},focus(){},click(){},prepend(){}};}
const document={querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)},querySelectorAll(){return []},addEventListener(){},documentElement:element(),createElement:element};
const indexedDB={open(name){const r={};setImmediate(()=>{if(!databases.has(name))databases.set(name,new Map());const data=databases.get(name);r.result={transaction(){return {objectStore(){return {getAll(){const q={};setImmediate(()=>{q.result=[...data.values()].map(v=>structuredClone(v));q.onsuccess()});return q},put(record){const q={};setImmediate(()=>{data.set(record.id,structuredClone(record));q.onsuccess()});return q},delete(id){const q={};setImmediate(()=>{data.delete(id);q.onsuccess()});return q}}}}}};r.onsuccess()});return r}};
const context=vm.createContext({console,document,indexedDB,window:{COMMENTARY_CONFIG:{}},navigator:{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},structuredClone,URL,Blob,Intl,Date,Set,Map,Promise,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout});
for(const name of ['app.js','firebase-cloud.js','main.js','personal.js']){let source=fs.readFileSync('dist/'+name,'utf8');if(name==='personal.js')source=source.slice(0,source.lastIndexOf('(async()=>{await loadWorkspace()'));vm.runInContext(source,context);}
(async()=>{await vm.runInContext(`(async()=>{
  assert(contrast('#000000','#ffffff')===21,'contrast');
  assert(contrast('#ffffff','#ffffff')===1,'unreadable contrast');
  await loadWorkspace();assert(state.records.length===0,'fresh archive is empty');
  await putRecord(normaliseRecord({id:'guest-item',quote:'guest private thought',tags:[]}));
  state.session={user:{id:'alice'}};await loadWorkspace();assert(state.records.length===0,'guest does not leak into Alice');
  await putRecord(normaliseRecord({id:'alice-item',quote:'Alice private thought',tags:['funny','__favourite','__category:Comedy']}));
  state.session={user:{id:'bob'}};await loadWorkspace();assert(state.records.length===0,'Alice does not leak into Bob');
  state.session={user:{id:'alice'}};await loadWorkspace();assert(state.records.length===1,'Alice survives switching');
  state.view='favourites';assert(filteredRecords().length===1,'favourites filter');
  state.view='category:Comedy';assert(filteredRecords().length===1,'custom category');
  assert(visibleTags(state.records[0]).join(',')==='funny','internal markers hidden');
  state.records[0].bucket='archived';state.view='all';assert(filteredRecords().length===0,'archived excluded from main');
  state.view='archived';assert(filteredRecords().length===1,'archive filter');
  assert(safeUrl('javascript:alert(1)')==='','unsafe link blocked');
  assert(normaliseRecord({tags:'bad'}).tags.length===0,'malformed import tags');
  const plain=await processPlainText('A funny comment to remember forever.', ['funny']);assert(plain.content.includes('funny comment'),'plain text preserved');
  assert(parseLinks('https://example.com/a\\nhttps://example.com/b').length===2,'bulk links');
  readArticle=async()=>{throw new Error('blocked')};const link=await processLink('https://example.com/a',[]);assert(link.url==='https://example.com/a'&&link.readError,'blocked link preserved');
  readScreenshot=async()=>{throw new Error('OCR unavailable')};fileToDataUrl=async()=> 'data:image/png;base64,AA==';const image=await processImage({name:'capture.png'},[],1,1);assert(image.image.startsWith('data:')&&image.readError,'OCR failure preserves screenshot');
  // Newer cloud version must win, and local deletion markers must sync.
  state.records=[];await putRecord(normaliseRecord({id:'deleted',quote:'gone',bucket:'deleted',tags:[],updatedAt:5000}));
  readCloudRecords=async()=>[{id:'alice-item',quote:'new cloud text',category:'life',tags:[],bucket:'saved',createdAt:Date.now(),updatedAt:Date.now()+10000}];
  let pushed=[];syncRecords=async r=>{pushed.push(...r)};syncPreferences=async()=>{};
  await syncAll();assert(state.records.find(r=>r.id==='alice-item').quote==='new cloud text','newer cloud wins');
  assert(!state.records.some(r=>r.id==='deleted'),'deleted items remain hidden');assert(pushed.some(r=>r.id==='deleted'),'deletion marker syncs');
  state.session=null;await loadWorkspace();assert(state.records.length===1&&state.records[0].id==='guest-item','signout restores guest only');
})()`,vm.createContext(Object.assign(context,{assert:(ok,m)=>assert.ok(ok,m)})));
console.log('PASS: 19 checks covering empty starts, account isolation, filters, contrast, imports, conflict resolution and deletion markers.');})().catch(e=>{console.error(e);process.exitCode=1});

