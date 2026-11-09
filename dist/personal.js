/* Private account workspaces and personal archive controls. No social graph. */
const DEFAULT_PREFS = { pairs: [['#f5f5f7','#141414'],['#000000','#ffffff'],['#ffffff','#141414']], categories: ['Life','God','Tech','History','Science'], resurfaceCadence: 'weekly' };
const PREF_ID = '__commentorchive_preferences_v1';
let preferences = structuredClone(DEFAULT_PREFS);
let workspace = 'guest';
let workspaceEpoch = 0;
const validCadence = value => ['daily', 'weekly', 'monthly'].includes(value) ? value : DEFAULT_PREFS.resurfaceCadence;
const ownerKey = () => state.session?.user?.id || 'guest';
const archiveContext = () => ({ owner: workspace, epoch: workspaceEpoch });
const isCurrentArchive = context => context.epoch === workspaceEpoch && context.owner === workspace && workspace === ownerKey();
function workspaceDb(owner) { return owner === 'guest' ? DB_NAME : `${DB_NAME}:user:${owner}`; }
openDb = function(owner = workspace) { return new Promise((resolve,reject) => { const r=indexedDB.open(workspaceDb(owner),VERSION); r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id'}); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); }); };
function preferenceKey(){return `commentorchive:preferences:${workspace}`;}
function loadPreferences(){try{preferences={...structuredClone(DEFAULT_PREFS),...JSON.parse(localStorage.getItem(preferenceKey())||'{}')};}catch{preferences=structuredClone(DEFAULT_PREFS);} preferences.resurfaceCadence=validCadence(preferences.resurfaceCadence); applyPreferences();}
function applyPreferences(){ preferences.pairs.forEach((p,i)=>{if(p.every(c=>/^#[a-f\d]{6}$/i.test(c))){document.documentElement.style.setProperty(`--layer${i}-bg`,p[0]);document.documentElement.style.setProperty(`--layer${i}-fg`,p[1]);}}); }
function categoryOf(r){return r.tags?.find(t=>t.startsWith('__category:'))?.slice(11) || preferences.categories.find(n=>n.toLowerCase()===r.category) || titleCase(r.category);}
function visibleTags(r){return (r.tags||[]).filter(t=>!t.startsWith('__'));}
function allCategories(){return [...new Set([...preferences.categories,...state.records.map(categoryOf)])];}
function fillCategories(){const options=allCategories().map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join(''); $('#captureCategory').innerHTML='<option value="">Suggest automatically</option>'+options;$('#editCategory').innerHTML=options;}
renderNavigation = function(){const categories=allCategories();$('#categoryNav').innerHTML=categories.map(n=>`<button class="category-trigger ${state.view==='category:'+n?'active':''}" data-view="${escapeHtml('category:'+n)}" type="button"><span class="nav-symbol">◇</span><span>${escapeHtml(n)}</span><b>${state.records.filter(r=>categoryOf(r)===n).length}</b></button>`).join('');$('#mobileCategoryGrid').innerHTML=categories.map(n=>`<button class="secondary-button" data-more-view="${escapeHtml('category:'+n)}" type="button">${escapeHtml(n)}</button>`).join('')+'<button class="secondary-button" id="mobilePreferences" type="button">Appearance & categories</button>';bindNavigation();$('#mobilePreferences').onclick=()=>{els.more.close();openPreferences();};fillCategories();};
setView = function(view,subcategory=''){state.view=view;state.subcategory=subcategory;state.source='all';$$('[data-source]').forEach(b=>b.classList.toggle('active',b.dataset.source==='all'));$$('[data-view],[data-mobile-view]').forEach(b=>b.classList.toggle('active',(b.dataset.view||b.dataset.mobileView)===view));els.title.textContent=view==='all'?'Everything worth keeping.':view==='weekly'?'Worth meeting again.':view==='favourites'?'Your favourites.':view==='archived'?'Safely tucked away.':view.replace('category:','');els.eyebrow.textContent=view==='weekly'?titleCase(validCadence(preferences.resurfaceCadence))+' rotation · up to 5 saves':'Your private archive';renderNavigation();render();};
filteredRecords = function(){const q=state.query.trim().toLowerCase(),weekly=new Set(resurfaceRecords().map(r=>r.id));return state.records.filter(r=>{const archived=r.bucket==='archived';const inView=state.view==='archived'?archived:!archived&&(state.view==='all'||state.view==='favourites'&&r.tags.includes('__favourite')||state.view==='weekly'&&weekly.has(r.id)||state.view==='category:'+categoryOf(r));const hay=[r.title,r.quote,r.content,r.note,r.url,categoryOf(r),...visibleTags(r)].join(' ').toLowerCase();return inView&&(state.source==='all'||sourceDetails(r.url,Boolean(r.image||r.imagePath)).type===state.source)&&(!q||hay.includes(q));}).sort((a,b)=>state.newest?b.createdAt-a.createdAt:a.createdAt-b.createdAt);};
const renderBase=render;
render=function(){renderBase();$$('.fragment-card').forEach(card=>{const r=state.records.find(r=>r.id===card.dataset.id);card.querySelector('.category-pill').textContent=categoryOf(r);card.querySelectorAll('.tag').forEach(t=>t.remove());const footer=card.querySelector('.card-bottom');visibleTags(r).slice(0,3).reverse().forEach(tag=>{const el=document.createElement('span');el.className='tag';el.textContent='#'+tag;footer.prepend(el);});if(r.tags.includes('__favourite')){const badge=document.createElement('span');badge.className='favourite-mark';badge.textContent='★';badge.setAttribute('aria-label','Favourite');footer.prepend(badge);}});};
const detailBase = openDetail;
let youtubeLookup;

openDetail = function(id) {
  const record = state.records.find(item => item.id === id);
  if (!record) return;
  detailBase(id);

  const commentLink = isYouTubeCommentLink(record.url);
  $('#detailTags').textContent = visibleTags(record).map(tag => '#' + tag).join(' ');
  $('#detailMeta').textContent = categoryOf(record) + ' · ' + (record.sourceLabel || 'Saved text');
  const published = new Date(record.publishedAt || '');
  const articleContext = $('#articleContext');
  articleContext.hidden = !record.articleSnapshot;
  articleContext.textContent = record.articleSnapshot
    ? [Number.isNaN(published.valueOf()) ? '' : 'Published ' + published.toLocaleDateString(), 'Captured ' + new Date(record.createdAt).toLocaleDateString()].filter(Boolean).join(' · ')
    : '';
  $('#originalSection').hidden = Boolean(record.url && record.readError);
  $('#originalLabel').textContent = record.articleSnapshot ? 'Captured article text' : record.commentCopy ? 'Saved comment text' : 'Original text';
  $('#originalText').textContent = record.content || record.quote;
  $('#detailImage').hidden = !record.image;
  $('#detailImage').src = record.image || '';
  $('#toggleFavourite').textContent = record.tags.includes('__favourite') ? '★ Favourited' : '☆ Favourite';
  $('#toggleArchive').textContent = record.bucket === 'archived' ? 'Unarchive' : 'Archive';
  $('#editTags').value = visibleTags(record).join(', ');
  fillCategories();
  $('#editCategory').value = categoryOf(record);
  $('#deleteRecord').hidden = false;
  $('#commentCopy').hidden = !commentLink;
  $('#commentCopy').open = false;
  $('#commentCopyText').value = record.commentCopy ? record.content : '';
  youtubeLookup?.abort();
  $('#youtubeContext').hidden = !commentLink;
  if (commentLink) loadYouTubeContext(record);
};

async function loadYouTubeContext(record) {
  const lookup = new AbortController();
  youtubeLookup = lookup;
  $('#youtubeVideo').textContent = 'Loading the linked comment…';
  for (const id of ['youtubeAuthor', 'youtubeText', 'youtubeParent', 'youtubeDescription']) $('#' + id).textContent = '';
  $('#youtubeDescriptionSection').hidden = true;

  try {
    const ids = youtubeCommentIds(record.url);
    if (!ids) throw new Error('This link does not contain a readable video and comment ID.');
    const response = await fetch('./api/youtube-comment?' + new URLSearchParams(ids), {
      signal: AbortSignal.any([lookup.signal, AbortSignal.timeout(15000)]), cache: 'no-store'
    });
    if (response.status === 404) throw new Error('YouTube no longer returns this comment.');
    if (!response.ok) throw new Error('Live comment lookup is unavailable. You can still open the source or save a copy here.');
    const { comment, parent, video } = await response.json();
    if (lookup.signal.aborted || state.currentId !== record.id) return;
    $('#youtubeVideo').textContent = [video?.title, video?.channel].filter(Boolean).join(' · ');
    const posted = new Date(comment.publishedAt || '');
    $('#youtubeAuthor').textContent = [comment.author, Number.isNaN(posted.valueOf()) ? '' : posted.toLocaleDateString()].filter(Boolean).join(' · ');
    $('#youtubeText').textContent = comment.text;
    $('#youtubeParent').textContent = parent ? 'In reply to ' + (parent.author || 'the parent comment') + '\n' + parent.text : '';
    $('#youtubeDescription').textContent = video?.description || '';
    $('#youtubeDescriptionSection').hidden = !video?.description;
    if (!record.commentCopy) $('#detailThesis').textContent = 'Original comment link saved. The text below is live from YouTube.';
  } catch (error) {
    if (lookup.signal.aborted || state.currentId !== record.id) return;
    $('#youtubeVideo').textContent = error instanceof Error && error.name === 'Error'
      ? error.message : 'Live comment lookup timed out or is offline.';
    if (!record.commentCopy) $('#detailThesis').textContent = 'Original comment link saved.';
  }
}

$('#saveCommentCopy').onclick = async () => {
  const record = state.records.find(item => item.id === state.currentId);
  const text = $('#commentCopyText').value.trim();
  if (!record || !text || !isYouTubeCommentLink(record.url)) return;
  const classification = classify(text);
  const updated = { ...record, title: 'YouTube comment', quote: text, content: text, commentCopy: true,
    readError: false, resonance: '', relevance: '', ...classification };
  Object.assign(record, updated);
  if (!await persistEdit(record)) return;
  if (state.currentId !== record.id || !els.detail.open) return;
  openDetailRefresh();
  notify('Comment text saved on this card');
};
async function persistEdit(record) {
  const context = archiveContext();
  record.updatedAt = Date.now();
  await putRecord(record, context.owner);
  if (!isCurrentArchive(context)) return false;
  renderNavigation();
  render();
  if (state.session) void syncAll().catch(() => {});
  return true;
}
$('#toggleFavourite').onclick=async()=>{const r=state.records.find(r=>r.id===state.currentId);r.tags=r.tags.includes('__favourite')?r.tags.filter(t=>t!=='__favourite'):[...r.tags,'__favourite'];if(await persistEdit(r))openDetailRefresh();};
$('#toggleArchive').onclick=async()=>{const r=state.records.find(r=>r.id===state.currentId);r.bucket=r.bucket==='archived'?'saved':'archived';if(await persistEdit(r))openDetailRefresh();};
function openDetailRefresh(){els.detail.close();openDetail(state.currentId);}
$('#saveDetails').onclick=async()=>{const r=state.records.find(r=>r.id===state.currentId);r.tags=[...r.tags.filter(t=>t.startsWith('__')&&!t.startsWith('__category:')),...$('#editTags').value.split(',').map(t=>t.trim().replace(/^#+/,'')).filter(t=>t&&!t.startsWith('__')).slice(0,12),'__category:'+$('#editCategory').value];if(await persistEdit(r))openDetailRefresh();notify('Changes saved');};
for(const name of ['processLink','processImage','processPlainText']){const original=({processLink,processImage,processPlainText})[name];const wrapped=async(...args)=>{const category=$('#captureCategory').value;const record=await original(...args);if(category)record.tags.push('__category:'+category);return record;};if(name==='processLink')processLink=wrapped;if(name==='processImage')processImage=wrapped;if(name==='processPlainText')processPlainText=wrapped;}
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function openPreferences(){$('#colourPairs').innerHTML=preferences.pairs.map((p,i)=>`<fieldset class="colour-pair"><legend>${['Page','Navigation','Cards & dialogs'][i]}</legend><label>Background <input type="color" data-pair="${i}" data-colour="0" value="${p[0]}" /></label><label>Text <input type="color" data-pair="${i}" data-colour="1" value="${p[1]}" /></label></fieldset>`).join('');$('#categoryNames').value=preferences.categories.join('\n');$('#resurfaceCadence').value=validCadence(preferences.resurfaceCadence);$('#contrastError').hidden=true;$('#preferencesDialog').showModal();}
$('#personalise').onclick=openPreferences;$('#closePreferences').onclick=()=>$('#preferencesDialog').close();$('#resetColours').onclick=()=>{preferences.pairs=structuredClone(DEFAULT_PREFS.pairs);openPreferencesRefresh();};function openPreferencesRefresh(){$('#preferencesDialog').close();openPreferences();}
async function syncPreferences(){if(!state.session)return;await syncRecords([{id:PREF_ID,title:'Archive preferences',content:JSON.stringify(preferences),category:'life',subcategory:'growth',tags:[],bucket:'saved',createdAt:preferences.updatedAt||Date.now(),updatedAt:preferences.updatedAt||Date.now()}]);}
$('#preferencesForm').onsubmit=async e=>{e.preventDefault();const pairs=preferences.pairs.map(p=>[...p]);$$('[data-pair]').forEach(input=>pairs[Number(input.dataset.pair)][Number(input.dataset.colour)]=input.value);if(pairs.some(p=>contrast(...p)<4.5)){$('#contrastError').textContent='Choose text and backgrounds with at least 4.5:1 contrast.';$('#contrastError').hidden=false;return;}const categories=[...new Set($('#categoryNames').value.split('\n').map(n=>n.trim().slice(0,50)).filter(Boolean))].slice(0,30);preferences={pairs,categories,resurfaceCadence:validCadence($('#resurfaceCadence').value),updatedAt:Date.now()};localStorage.setItem(preferenceKey(),JSON.stringify(preferences));applyPreferences();if(state.view==='weekly')setView('weekly');else{renderNavigation();render();}$('#preferencesDialog').close();try{await syncPreferences();notify('Preferences saved');}catch{notify('Preferences saved here. Cloud sync pending.');}};
async function loadWorkspace() {
  const owner = ownerKey();
  if (owner !== workspace) {
    workspace = owner;
    workspaceEpoch++;
    state.records = [];
    state.currentId = '';
    state.query = '';
    $('#searchInput').value = '';
    youtubeLookup?.abort();
    resetCapture();
    for (const dialog of [els.capture, els.detail, els.data, els.more, $('#preferencesDialog'), $('#deleteDialog')]) {
      if (dialog.open) dialog.close();
    }
    loadPreferences();
    setView('all');
    renderAccount();
  } else {
    loadPreferences();
  }
  const context = archiveContext();
  const records = await allRecords(owner);
  if (!isCurrentArchive(context)) return;
  state.records = records.filter(record => record.id !== PREF_ID && record.bucket !== 'deleted').map(normaliseRecord);
  setView('all');
  renderAccount();
  $('#adoptGuest').hidden = !state.session;
  $('#saveState').textContent = 'Saved locally';
}
let syncQueue = Promise.resolve();
function syncAll() {
  const context = archiveContext();
  const run = syncQueue.then(() => syncWorkspace(context));
  syncQueue = run.catch(() => {});
  return run;
}

async function syncWorkspace(context) {
  const { owner } = context;
  if (!state.session || !isCurrentArchive(context)) return;
  $("#saveState").textContent = "Syncing…";
  try {
    const rows = await readCloudRecords(owner);
    if (!isCurrentArchive(context)) return;
    const remote = new Map(rows.map(row => [row.id, row]));
    const pref = remote.get(PREF_ID);
    if (pref?.updatedAt > (preferences.updatedAt || 0)) {
      const next = JSON.parse(pref.content);
      if (Array.isArray(next.pairs) && Array.isArray(next.categories)) {
        preferences = { ...next, resurfaceCadence: validCadence(next.resurfaceCadence), updatedAt: pref.updatedAt };
        localStorage.setItem(preferenceKey(), JSON.stringify(preferences));
        applyPreferences();
      }
    }
    for (const row of rows) {
      if (row.id === PREF_ID) continue;
      const local = (await allRecords(owner)).find(record => record.id === row.id);
      if (!isCurrentArchive(context)) return;
      if (local && local.updatedAt >= row.updatedAt) continue;
      const image = await readCloudImage(row);
      const { ref, chunkCount, imageHeader, ...record } = row;
      const latest = (await allRecords(owner)).find(record => record.id === row.id);
      if (!isCurrentArchive(context)) return;
      if (!latest || latest.updatedAt < row.updatedAt) await putRecord(normaliseRecord({ ...record, image }), owner);
    }
    const records = await allRecords(owner);
    if (!isCurrentArchive(context)) return;
    state.records = records.filter(r => r.bucket !== "deleted").map(normaliseRecord);
    renderNavigation();
    render();
    await syncRecords(records.filter(r => r.updatedAt > (remote.get(r.id)?.updatedAt || 0)));
    if (!isCurrentArchive(context)) return;
    if (preferences.updatedAt > (pref?.updatedAt || 0)) await syncPreferences();
    if (isCurrentArchive(context)) $("#saveState").textContent = "Synced";
  } catch (error) {
    if (isCurrentArchive(context)) $("#saveState").textContent = "Saved locally · sync pending";
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
$('#adoptGuest').onclick = async () => {
  const context = archiveContext();
  if (!state.session) return;
  try {
    const guestRecords = await allRecords('guest');
    if (!isCurrentArchive(context)) return;
    const existing = new Set((await allRecords(context.owner)).map(record => record.id));
    if (!isCurrentArchive(context)) return;
    for (const record of guestRecords) {
      if (record.bucket === 'deleted' || existing.has(record.id)) continue;
      await putRecord(normaliseRecord(record), context.owner);
    }
    if (!isCurrentArchive(context)) return;
    await loadWorkspace();
    if (!isCurrentArchive(context)) return;
    void syncAll().catch(() => {});
    notify('Guest archive copied into this account');
  } catch {
    if (isCurrentArchive(context)) notify('Could not copy the guest archive.');
  }
};

const deleteDialog = $('#deleteDialog');
let pendingDelete;
$('#deleteRecord').onclick = () => {
  const record = state.records.find(item => item.id === state.currentId);
  if (!record) return;
  pendingDelete = { id: record.id, updatedAt: record.updatedAt, context: archiveContext() };
  $('#deletePrompt').textContent = 'Delete “' + (record.title || 'this saved item') + '” from your archive? This action cannot be undone.';
  deleteDialog.showModal();
};
function cancelDelete() {
  pendingDelete = null;
  deleteDialog.close();
}
$('#cancelDelete').onclick = cancelDelete;
deleteDialog.addEventListener('cancel', () => { pendingDelete = null; });
$('#confirmDelete').onclick = async () => {
  const pending = pendingDelete;
  cancelDelete();
  if (!pending || !isCurrentArchive(pending.context)) return;
  const { id, context } = pending;
  try {
    await putRecord({ id, bucket: 'deleted', updatedAt: Math.max(Date.now(), pending.updatedAt + 1) }, context.owner);
    if (!isCurrentArchive(context)) return;
    state.records = state.records.filter(record => record.id !== id);
    if (state.currentId === id) els.detail.close();
    renderNavigation();
    render();
    if (state.session) void syncAll().catch(() => {});
    notify('Deleted');
  } catch {
    if (isCurrentArchive(context)) notify('Could not delete this item. Try again.');
  }
};
const exportBase=exportArchive;
exportArchive=async function(){const payload={app:'Commentorchive',version:3,exportedAt:new Date().toISOString(),preferences,fragments:state.records};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='commentorchive-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};$('#exportData').onclick=exportArchive;
async function restoreArchive(file) {
  if (!file) return;
  const context = archiveContext();
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.fragments)) throw new Error();
    if (!isCurrentArchive(context)) return;
    const existing = new Map((await allRecords(context.owner)).map(record => [record.id, record]));
    if (!isCurrentArchive(context)) return;
    const imported = [];
    for (const item of data.fragments) {
      if (!item || typeof item.id !== 'string' || item.id === PREF_ID || !(item.quote || item.content)) continue;
      const record = normaliseRecord(item);
      const current = existing.get(record.id);
      if (current?.bucket === 'deleted' || current?.updatedAt >= record.updatedAt) continue;
      await putRecord(record, context.owner);
      existing.set(record.id, record);
      imported.push(record);
    }
    const records = await allRecords(context.owner);
    if (!isCurrentArchive(context)) return;
    if (data.preferences?.pairs?.length === 3 && data.preferences.pairs.every(p => Array.isArray(p) && p.length === 2 && p.every(c => /^#[a-f\d]{6}$/i.test(c))) && Array.isArray(data.preferences.categories)) {
      preferences = { ...data.preferences, resurfaceCadence: validCadence(data.preferences.resurfaceCadence), updatedAt: Date.now() };
      localStorage.setItem(preferenceKey(), JSON.stringify(preferences));
      applyPreferences();
    }
    state.records = records.filter(record => record.bucket !== 'deleted' && record.id !== PREF_ID).map(normaliseRecord);
    els.data.close();
    renderNavigation();
    render();
    if (state.session) void syncAll().catch(() => {});
    notify(imported.length + ' items restored');
  } catch {
    if (isCurrentArchive(context)) notify('That backup could not be read');
  }
}
$('#importData').onchange = event => restoreArchive(event.target.files[0]);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.view === 'weekly') render();
});
(async()=>{await loadWorkspace();await refreshSession();if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=18').catch(()=>{});openSharedCapture();})();
