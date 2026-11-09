const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(),storage=new Map(),databases=new Map();
function element(){return {value:'',textContent:'',hidden:false,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},querySelector(){return element()},querySelectorAll(){return []},showModal(){this.open=true},close(){this.open=false},setAttribute(){},addEventListener(){},reset(){},focus(){},click(){},prepend(){}};}
const document={querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)},querySelectorAll(){return []},addEventListener(){},documentElement:element(),createElement:element};
const indexedDB={open(name){const r={};setImmediate(()=>{if(!databases.has(name))databases.set(name,new Map());const data=databases.get(name);r.result={transaction(){return {objectStore(){return {getAll(){const q={};setImmediate(()=>{q.result=[...data.values()].map(v=>structuredClone(v));q.onsuccess()});return q},put(record){const q={};setImmediate(()=>{data.set(record.id,structuredClone(record));q.onsuccess()});return q},delete(id){const q={};setImmediate(()=>{data.delete(id);q.onsuccess()});return q}}}}}};r.onsuccess()});return r}};
const context=vm.createContext({console,document,indexedDB,window:{COMMENTARY_CONFIG:{}},navigator:{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},structuredClone,URL,URLSearchParams,Blob,Intl,Date,Set,Map,Promise,AbortController,AbortSignal,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout});
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
  const commentUrl='https://youtube.com/shorts/W1b_8so8rRg?lc=UgxuA7BiwDidG-EZOR94AaABAg&si=eQHNAntsU-uhH69l';
  let readerCalls=0;
  globalThis.fetch=async()=>{
    readerCalls++;
    return {ok:true,text:async()=> 'Title: Sign in\\nWarning: Target URL returned error 401: Unauthorized\\nMarkdown Content:\\nBack Skip navigation'};
  };
  const comment=await processLink(commentUrl,['manual']);
  assert(readerCalls===0&&comment.url===commentUrl&&comment.readError&&!comment.content&&comment.tags.join(',')==='manual','YouTube comment URL is preserved without digesting the video page');
  assert(youtubeCommentIds('https://youtu.be/W1b_8so8rRg?lc=UgxuA7BiwDidG-EZOR94AaABAg.reply123').commentId.endsWith('.reply123'),'reply link retains the complete ID');
  globalThis.location={hash:'#share?text='+encodeURIComponent(commentUrl),pathname:'/',search:''};
  globalThis.history={replaceState(){}};
  openSharedCapture();
  assert(els.capture.open&&els.links.value===commentUrl,'Android share URL survives into the capture form');
  closeCapture();
  const blocked=await processLink('https://example.com/a',['manual']);
  assert(readerCalls===1&&blocked.url==='https://example.com/a'&&blocked.readError&&!blocked.content&&blocked.tags.join(',')==='manual','target error in a successful reader response is treated as a failed read');
  const legacy=normaliseRecord({id:'older-comment',url:commentUrl,title:'Comment from @someone',quote:'Sign in',relevance:'Sign in',resonance:'Warning: Target URL returned error 401: Unauthorized',tags:['__favourite'],updatedAt:1000});
  assert(legacy.id==='older-comment'&&legacy.url===commentUrl&&legacy.readError&&legacy.title===comment.title&&!legacy.relevance&&!legacy.resonance&&legacy.updatedAt===1000&&legacy.tags[0]==='__favourite','legacy error card displays as an unread link and retains archive metadata');
  state.records=[legacy];openDetail(legacy.id);
  assert($('#relevancePanel').hidden&&$('#resonancePanel').hidden&&$('#originalSection').hidden&&$('#detailLink').href===commentUrl,'unread card displays the original source without empty digest panels');
  els.detail.close();
  globalThis.fetch=async url=>{
    assert(url.includes('commentId=UgxuA7BiwDidG-EZOR94AaABAg')&&url.includes('videoId=W1b_8so8rRg'),'exact shared IDs reach the lookup');
    return {ok:true,json:async()=>({comment:{text:'Exact public comment',author:'Author'},parent:{text:'Original thread text'},video:{title:'The Short',channel:'Channel'}})};
  };
  await loadYouTubeContext(legacy);
  assert($('#youtubeText').textContent==='Exact public comment'&&$('#youtubeVideo').textContent.includes('The Short')&&$('#youtubeParent').textContent.includes('Original thread text'),'exact comment and its context appear in the card');
  assert(!legacy.content,'live API data stays out of the saved record');
  const originalSyncRecords=syncRecords;
  window.Summarizer={availability:()=>new Promise(()=>{})};
  syncRecords=()=>new Promise(()=>{});
  openCapture();
  els.links.value=commentUrl;
  const captureFinished=await Promise.race([
    els.form.onsubmit({preventDefault(){}}).then(()=>true),
    new Promise(resolve=>setTimeout(()=>resolve(false),500))
  ]);
  assert(captureFinished&&els.capture.open===false&&!els.save.disabled,'capture finishes even when the browser AI and cloud sync never respond');
  assert((await allRecords()).some(record=>record.url===commentUrl),'the exact comment link is committed locally before sync');
  assert(els.detail.open&&state.records.find(record=>record.id===state.currentId)?.url===commentUrl,'capture opens the newly saved comment card');
  els.detail.close();
  syncRecords=originalSyncRecords;
  globalThis.fetch=async()=>({ok:true,text:async()=> 'Title: Article title\\nPublished Time: 2026-11-09\\nMarkdown Content:\\nA valid article that should still be summarized and saved.\\n\\nThis second paragraph should be readable on its own.'});
  const article=await processLink('https://example.com/article',[]);
  assert(!article.readError&&article.title==='Article title'&&article.content.includes('saved.\\n\\nThis second paragraph')&&article.publishedAt==='2026-11-09','article import keeps paragraphs and publication metadata');
  state.records=[article];openDetail(article.id);
  assert($('#relevancePanel').hidden&&!$('#resonancePanel').hidden&&!$('#originalSection').hidden&&!$('#articleContext').hidden,'article displays its source context and captured body');
  els.detail.close();
  globalThis.fetch=async()=>({ok:false});
  const link=await processLink('https://example.com/a',[]);assert(link.url==='https://example.com/a'&&link.readError,'blocked link preserved');
  readScreenshot=async()=>{throw new Error('OCR unavailable')};fileToDataUrl=async()=> 'data:image/png;base64,AA==';const image=await processImage({name:'capture.png'},[],1,1);assert(image.image.startsWith('data:')&&image.readError,'OCR failure preserves screenshot');
  // Newer cloud version must win, and local deletion markers must sync.
  state.records=[];await putRecord(normaliseRecord({id:'deleted',quote:'gone',bucket:'deleted',tags:[],updatedAt:5000}));
  readCloudRecords=async()=>[{id:'alice-item',quote:'new cloud text',category:'life',tags:[],bucket:'saved',createdAt:Date.now(),updatedAt:Date.now()+10000}];
  let pushed=[];syncRecords=async r=>{pushed.push(...r)};syncPreferences=async()=>{};
  await syncAll();assert(state.records.find(r=>r.id==='alice-item').quote==='new cloud text','newer cloud wins');
  assert(!state.records.some(r=>r.id==='deleted'),'deleted items remain hidden');assert(pushed.some(r=>r.id==='deleted'),'deletion marker syncs');
  state.session=null;await loadWorkspace();assert(state.records.length===1&&state.records[0].id==='guest-item','signout restores guest only');
})()`,vm.createContext(Object.assign(context,{assert:(ok,m)=>assert.ok(ok,m)})));
const commentId='UgxuA7BiwDidG-EZOR94AaABAg.reply123';
const parentId='UgxuA7BiwDidG-EZOR94AaABAg';
const videoId='W1b_8so8rRg';
const handler=require('../api/youtube-comment.js');
const previousKey=process.env.YOUTUBE_DATA_API_KEY;
const previousFetch=global.fetch;
let status, body;
const res={setHeader(name,value){if(name==='Cache-Control')assert.equal(value,'private, no-store');},status(code){status=code;return this;},json(data){body=data;}};
const request={method:'GET',query:{commentId,videoId}};
try {
  delete process.env.YOUTUBE_DATA_API_KEY;
  await handler(request,res);
  assert.equal(status,503);
  process.env.YOUTUBE_DATA_API_KEY='test-key';
  global.fetch=async url=>{
    const id=url.searchParams.get('id');
    const snippets={
      [commentId]:{textDisplay:'Exact reply',parentId},
      [parentId]:{textDisplay:'The parent'},
      [videoId]:{title:'The Short',channelTitle:'Channel'}
    };
    assert.equal(url.hostname,'www.googleapis.com');
    return {ok:true,json:async()=>({items:[{id,snippet:snippets[id]}]})};
  };
  await handler(request,res);
  assert.equal(status,200);
  assert.equal(body.comment.text,'Exact reply');
  assert.equal(body.parent.text,'The parent');
  assert.equal(body.video.title,'The Short');
  global.fetch=async()=>({ok:true,json:async()=>({items:[{id:parentId,snippet:{textDisplay:'Wrong comment'}}]})});
  await handler(request,res);
  assert.equal(status,404);
} finally {
  global.fetch=previousFetch;
  if(previousKey===undefined) delete process.env.YOUTUBE_DATA_API_KEY;
  else process.env.YOUTUBE_DATA_API_KEY=previousKey;
}
console.log('PASS: Archive, link import, and sync checks.');})().catch(e=>{console.error(e);process.exitCode=1});

