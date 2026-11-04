/* Private account workspaces and personal archive controls. No social graph. */
const DEFAULT_PREFS = { pairs: [['#f5f5f7','#141414'],['#000000','#ffffff'],['#ffffff','#141414']], categories: ['Life','God','Tech','History','Science'] };
const PREF_ID = '__commentorchive_preferences_v1';
let preferences = structuredClone(DEFAULT_PREFS);
let workspace = 'guest';
const ownerKey = () => state.session?.user?.id || 'guest';
function workspaceDb() { return workspace === 'guest' ? DB_NAME : `${DB_NAME}:user:${workspace}`; }
openDb = function() { return new Promise((resolve,reject) => { const r=indexedDB.open(workspaceDb(),VERSION); r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id'}); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); }); };
function preferenceKey(){return `commentorchive:preferences:${workspace}`;}
function loadPreferences(){try{preferences={...structuredClone(DEFAULT_PREFS),...JSON.parse(localStorage.getItem(preferenceKey())||'{}')};}catch{preferences=structuredClone(DEFAULT_PREFS);} applyPreferences();}
function applyPreferences(){ preferences.pairs.forEach((p,i)=>{if(p.every(c=>/^#[a-f\d]{6}$/i.test(c))){document.documentElement.style.setProperty(`--layer${i}-bg`,p[0]);document.documentElement.style.setProperty(`--layer${i}-fg`,p[1]);}}); }
function categoryOf(r){return r.tags?.find(t=>t.startsWith('__category:'))?.slice(11) || preferences.categories.find(n=>n.toLowerCase()===r.category) || titleCase(r.category);}
function visibleTags(r){return (r.tags||[]).filter(t=>!t.startsWith('__'));}
function allCategories(){return [...new Set([...preferences.categories,...state.records.map(categoryOf)])];}
function fillCategories(){const options=allCategories().map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join(''); $('#captureCategory').innerHTML='<option value="">Suggest automatically</option>'+options;$('#editCategory').innerHTML=options;}
renderNavigation = function(){const categories=allCategories();$('#categoryNav').innerHTML=categories.map(n=>`<button class="category-trigger ${state.view==='category:'+n?'active':''}" data-view="${escapeHtml('category:'+n)}" type="button"><span class="nav-symbol">◇</span><span>${escapeHtml(n)}</span><b>${state.records.filter(r=>categoryOf(r)===n).length}</b></button>`).join('');$('#mobileCategoryGrid').innerHTML=categories.map(n=>`<button class="secondary-button" data-more-view="${escapeHtml('category:'+n)}" type="button">${escapeHtml(n)}</button>`).join('')+'<button class="secondary-button" id="mobilePreferences" type="button">Appearance & categories</button>';bindNavigation();$('#mobilePreferences').onclick=()=>{els.more.close();openPreferences();};fillCategories();};
setView = function(view,subcategory=''){state.view=view;state.subcategory=subcategory;state.source='all';$$('[data-source]').forEach(b=>b.classList.toggle('active',b.dataset.source==='all'));$$('[data-view],[data-mobile-view]').forEach(b=>b.classList.toggle('active',(b.dataset.view||b.dataset.mobileView)===view));els.title.textContent=view==='all'?'Everything worth keeping.':view==='weekly'?'Worth meeting again.':view==='favourites'?'Your favourites.':view==='archived'?'Safely tucked away.':view.replace('category:','');els.eyebrow.textContent='Your private archive';renderNavigation();render();};
filteredRecords = function(){const q=state.query.trim().toLowerCase(),weekly=new Set(weeklyRecords().map(r=>r.id));return state.records.filter(r=>{const archived=r.bucket==='archived';const inView=state.view==='archived'?archived:!archived&&(state.view==='all'||state.view==='favourites'&&r.tags.includes('__favourite')||state.view==='weekly'&&weekly.has(r.id)||state.view==='category:'+categoryOf(r));const hay=[r.title,r.quote,r.content,r.note,r.url,categoryOf(r),...visibleTags(r)].join(' ').toLowerCase();return inView&&(state.source==='all'||sourceDetails(r.url,Boolean(r.image||r.imagePath)).type===state.source)&&(!q||hay.includes(q));}).sort((a,b)=>state.newest?b.createdAt-a.createdAt:a.createdAt-b.createdAt);};
const renderBase=render;
render=function(){renderBase();$$('.fragment-card').forEach(card=>{const r=state.records.find(r=>r.id===card.dataset.id);card.querySelector('.category-pill').textContent=categoryOf(r);card.querySelectorAll('.tag').forEach(t=>t.remove());const footer=card.querySelector('.card-bottom');visibleTags(r).slice(0,3).reverse().forEach(tag=>{const el=document.createElement('span');el.className='tag';el.textContent='#'+tag;footer.prepend(el);});if(r.tags.includes('__favourite')){const badge=document.createElement('span');badge.className='favourite-mark';badge.textContent='★';badge.setAttribute('aria-label','Favourite');footer.prepend(badge);}});};
const detailBase=openDetail;
openDetail=function(id){detailBase(id);const r=state.records.find(r=>r.id===id);$('#detailTags').textContent=visibleTags(r).map(t=>'#'+t).join(' ');$('#detailMeta').textContent=categoryOf(r)+' · '+(r.sourceLabel||'Saved text');$('#originalText').textContent=r.content||r.quote;$('#detailImage').hidden=!r.image;$('#detailImage').src=r.image||'';$('#toggleFavourite').textContent=r.tags.includes('__favourite')?'★ Favourited':'☆ Favourite';$('#toggleArchive').textContent=r.bucket==='archived'?'Unarchive':'Archive';$('#editTags').value=visibleTags(r).join(', ');fillCategories();$('#editCategory').value=categoryOf(r);$('#deleteRecord').hidden=false;};
async function persistEdit(r){r.updatedAt=Date.now();await putRecord(r);renderNavigation();render();if(state.session){try{await syncRecords([r]);$('#saveState').textContent='Synced';}catch{$('#saveState').textContent='Saved locally · sync pending';notify('Saved on this device. Cloud sync needs a retry.');}}}
$('#toggleFavourite').onclick=async()=>{const r=state.records.find(r=>r.id===state.currentId);r.tags=r.tags.includes('__favourite')?r.tags.filter(t=>t!=='__favourite'):[...r.tags,'__favourite'];await persistEdit(r);openDetailRefresh();};
$('#toggleArchive').onclick=async()=>{const r=state.records.find(r=>r.id===state.currentId);r.bucket=r.bucket==='archived'?'saved':'archived';await persistEdit(r);openDetailRefresh();};
function openDetailRefresh(){els.detail.close();openDetail(state.currentId);}
$('#saveDetails').onclick=async()=>{const r=state.records.find(r=>r.id===state.currentId);r.tags=[...r.tags.filter(t=>t.startsWith('__')&&!t.startsWith('__category:')),...$('#editTags').value.split(',').map(t=>t.trim().replace(/^#+/,'')).filter(t=>t&&!t.startsWith('__')).slice(0,12),'__category:'+$('#editCategory').value];await persistEdit(r);openDetailRefresh();notify('Changes saved');};
for(const name of ['processLink','processImage','processPlainText']){const original=({processLink,processImage,processPlainText})[name];const wrapped=async(...args)=>{const category=$('#captureCategory').value;const record=await original(...args);if(category)record.tags.push('__category:'+category);return record;};if(name==='processLink')processLink=wrapped;if(name==='processImage')processImage=wrapped;if(name==='processPlainText')processPlainText=wrapped;}
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function openPreferences(){$('#colourPairs').innerHTML=preferences.pairs.map((p,i)=>`<fieldset class="colour-pair"><legend>${['Page','Navigation','Cards & dialogs'][i]}</legend><label>Background <input type="color" data-pair="${i}" data-colour="0" value="${p[0]}" /></label><label>Text <input type="color" data-pair="${i}" data-colour="1" value="${p[1]}" /></label></fieldset>`).join('');$('#categoryNames').value=preferences.categories.join('\n');$('#contrastError').hidden=true;$('#preferencesDialog').showModal();}
$('#personalise').onclick=openPreferences;$('#closePreferences').onclick=()=>$('#preferencesDialog').close();$('#resetColours').onclick=()=>{preferences.pairs=structuredClone(DEFAULT_PREFS.pairs);openPreferencesRefresh();};function openPreferencesRefresh(){$('#preferencesDialog').close();openPreferences();}
async function syncPreferences(){if(!state.session)return;await syncRecords([{id:PREF_ID,title:'Archive preferences',content:JSON.stringify(preferences),category:'life',subcategory:'growth',tags:[],bucket:'saved',createdAt:preferences.updatedAt||Date.now(),updatedAt:preferences.updatedAt||Date.now()}]);}
$('#preferencesForm').onsubmit=async e=>{e.preventDefault();const pairs=preferences.pairs.map(p=>[...p]);$$('[data-pair]').forEach(input=>pairs[Number(input.dataset.pair)][Number(input.dataset.colour)]=input.value);if(pairs.some(p=>contrast(...p)<4.5)){$('#contrastError').textContent='Choose text and backgrounds with at least 4.5:1 contrast.';$('#contrastError').hidden=false;return;}const categories=[...new Set($('#categoryNames').value.split('\n').map(n=>n.trim().slice(0,50)).filter(Boolean))].slice(0,30);preferences={pairs,categories,updatedAt:Date.now()};localStorage.setItem(preferenceKey(),JSON.stringify(preferences));applyPreferences();renderNavigation();render();$('#preferencesDialog').close();try{await syncPreferences();notify('Preferences saved');}catch{notify('Preferences saved here. Cloud sync pending.');}};
async function loadWorkspace(){workspace=ownerKey();loadPreferences();state.records=(await allRecords()).filter(r=>r.id!==PREF_ID&&r.bucket!=='deleted').map(normaliseRecord);setView('all');renderAccount();$('#adoptGuest').hidden=!state.session;$('#saveState').textContent='Saved locally';}
let syncQueue = Promise.resolve();
function syncAll() {
  const owner = workspace;
  const run = syncQueue.then(() => syncWorkspace(owner));
  syncQueue = run.catch(() => {});
  return run;
}

async function syncWorkspace(owner) {
  if (!state.session || workspace !== owner) return;
  $("#saveState").textContent = "Syncing…";
  try {
    const rows = await readCloudRecords(owner);
    if (workspace !== owner) return;
    const remote = new Map(rows.map(row => [row.id, row]));
    const pref = remote.get(PREF_ID);
    if (pref?.updatedAt > (preferences.updatedAt || 0)) {
      const next = JSON.parse(pref.content);
      if (Array.isArray(next.pairs) && Array.isArray(next.categories)) {
        preferences = { ...next, updatedAt: pref.updatedAt };
        localStorage.setItem(preferenceKey(), JSON.stringify(preferences));
        applyPreferences();
      }
    }
    for (const row of rows) {
      if (row.id === PREF_ID) continue;
      const local = (await allRecords()).find(record => record.id === row.id);
      if (workspace !== owner) return;
      if (local && local.updatedAt >= row.updatedAt) continue;
      const image = await readCloudImage(row);
      const { ref, chunkCount, imageHeader, ...record } = row;
      const latest = (await allRecords()).find(record => record.id === row.id);
      if (workspace !== owner) return;
      if (!latest || latest.updatedAt < row.updatedAt) await putRecord(normaliseRecord({ ...record, image }));
    }
    const records = await allRecords();
    if (workspace !== owner) return;
    state.records = records.filter(r => r.bucket !== "deleted").map(normaliseRecord);
    renderNavigation();
    render();
    await syncRecords(records.filter(r => r.updatedAt > (remote.get(r.id)?.updatedAt || 0)));
    if (workspace !== owner) return;
    if (preferences.updatedAt > (pref?.updatedAt || 0)) await syncPreferences();
    if (workspace === owner) $("#saveState").textContent = "Synced";
  } catch (error) {
    if (workspace === owner) $("#saveState").textContent = "Saved locally · sync pending";
    throw error;
  }
}

async function refreshSession() {
  if (!cloudReady()) return;
  const error = $("#accountError");
  const button = $("#signIn");
  try {
    const { auth, account } = await connectFirebase();
    auth.getRedirectResult(account).catch(caught => {
      error.textContent = caught.message;
      error.hidden = false;
      if (!els.account.open) els.account.showModal();
    });
    auth.onAuthStateChanged(account, async user => {
      state.session = user ? { user: { id: user.uid, email: user.email } } : null;
      await loadWorkspace();
      button.disabled = false;
      if (user) await syncAll().catch(() => {});
    });
    $("#accountForm").onsubmit = async event => {
      event.preventDefault();
      button.disabled = true;
      error.hidden = true;
      try {
        const provider = new auth.GoogleAuthProvider();
        if (location.hostname === "commentorchive.vercel.app") {
          await auth.signInWithRedirect(account, provider);
        } else {
          await auth.signInWithPopup(account, provider);
        }
      } catch (caught) {
        error.textContent = caught.message;
        error.hidden = false;
      } finally { button.disabled = false; }
    };
    $("#signOut").onclick = async () => {
      try { await auth.signOut(account); els.account.close(); }
      catch { notify("Sign-out failed. Please try again."); }
    };
    $("#retrySync").onclick = () => syncAll().catch(() => notify("Cloud sync failed. Please try again."));
    window.addEventListener("online", () => syncAll().catch(() => {}));
    window.addEventListener("focus", () => syncAll().catch(() => {}));
  } catch {
    error.textContent = "Cloud sign-in could not load. Refresh to try again.";
    error.hidden = false;
  }
}
$('#adoptGuest').onclick=async()=>{const account=workspace;workspace='guest';let records;try{records=await allRecords();}finally{workspace=account;}for(const r of records)await putRecord(normaliseRecord(r));await loadWorkspace();try{await syncAll();notify('Guest archive copied into this account');}catch{notify('Copied locally. Cloud sync pending.');}};
// Sync a deletion marker so another device cannot resurrect a removed item.
$('#deleteRecord').onclick=async()=>{const r=state.records.find(r=>r.id===state.currentId);if(!r)return;const deleted={...r,bucket:'deleted',updatedAt:Date.now()};try{if(state.session)await syncRecords([deleted]);await putRecord(deleted);state.records=state.records.filter(r=>r.id!==state.currentId);els.detail.close();renderNavigation();render();notify('Deleted');}catch{notify('Could not delete from cloud. Try again when connected.');}};
const exportBase=exportArchive;
exportArchive=async function(){const payload={app:'Commentorchive',version:3,exportedAt:new Date().toISOString(),preferences,fragments:state.records};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='commentorchive-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};$('#exportData').onclick=exportArchive;
const importBase=importArchive;
importArchive=async function(file){if(!file)return;const raw=await file.text();let data;try{data=JSON.parse(raw);}catch{notify('That backup could not be read');return;}if(data.preferences?.pairs?.every(p=>p.length===2&&p.every(c=>/^#[a-f\d]{6}$/i.test(c)))&&Array.isArray(data.preferences.categories)){preferences=data.preferences;preferences.updatedAt=Date.now();localStorage.setItem(preferenceKey(),JSON.stringify(preferences));applyPreferences();}await importBase({text:async()=>raw});};$('#importData').onchange=e=>importArchive(e.target.files[0]);
(async()=>{await loadWorkspace();await refreshSession();registerWebMcp();if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=13').catch(()=>{});})();
