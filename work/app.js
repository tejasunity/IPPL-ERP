/* ═══════════════════════════════════════════════════════════
   INNOTEK WORK — chat + task management on Firebase
   Real-time via Firestore onSnapshot. Confidential: data lives
   in Tejas's own Firebase project; accounts are admin-created.
   ═══════════════════════════════════════════════════════════ */
'use strict';

const CONFIG_KEY = 'innotek_fb_config';
const ATT_KEY = 'innotek_att_url';
const STATUSES = ['Pending','Accepted','In Progress','Completed','Rejected','Reallocated','Overdue','Cancelled'];
const MAX_OPEN_TASKS = 5; // workload warning threshold

let db=null, auth=null, me=null, myDoc=null;
let USERS=[], CHANNELS=[], TASKS=[];
let unsubChans=null, unsubTasks=null, unsubUsers=null, unsubMsgs=null, unsubComments=null, unsubAudit=null;
let activeChan=null, activeTask=null, taskFilter='mine';

// ── UTIL ──
function $(id){ return document.getElementById(id); }
function show(id){ $(id).classList.add('on'); }
function hide(id){ $(id).classList.remove('on'); }
function toast(msg){
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.body.appendChild(t); setTimeout(()=>t.remove(), 3200);
}
function fmtTs(ts){
  if(!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
}
function fmtDate(s){ return s ? new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'; }
function esc(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }
function initials(n){ return (n||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase(); }
function effStatus(t){
  if(['Completed','Cancelled','Rejected'].includes(t.status)) return t.status;
  if(t.dueDate && new Date(t.dueDate) < new Date()) return 'Overdue';
  return t.status;
}
function statusBadge(s){
  const cls = {Completed:'b-green','In Progress':'b-blue',Accepted:'b-blue',Pending:'b-warn','Not Started':'b-muted',
    Overdue:'b-danger',Rejected:'b-danger',Cancelled:'b-muted',Reallocated:'b-warn'}[s]||'b-muted';
  return `<span class="badge ${cls}">${s}</span>`;
}

// ── BOOT ──
function boot(){
  hide('scr-setup'); // visible by default (no-JS/preview fallback); JS decides the real screen
  const cfgRaw = localStorage.getItem(CONFIG_KEY);
  if(typeof firebase === 'undefined'){
    show('scr-setup');
    $('setup-config').placeholder = '⚠️ Firebase SDK failed to load — check internet connection and reload.';
    return;
  }
  if(!cfgRaw){ show('scr-setup'); return; }
  try{
    firebase.initializeApp(JSON.parse(cfgRaw));
    auth = firebase.auth(); db = firebase.firestore();
    auth.onAuthStateChanged(u=>{
      if(u){ me = u; onSignedIn(); }
      else { me = null; teardown(); hide('scr-main'); show('scr-login'); }
    });
  }catch(e){
    localStorage.removeItem(CONFIG_KEY);
    show('scr-setup'); toast('Config invalid — paste again: '+e.message);
  }
}

function extractFirebaseObject(raw){
  // Prefer the object that actually follows "firebaseConfig =" — this avoids
  // being fooled by the import line's own { } (e.g. `import { initializeApp } from ...`)
  // when the full <script type="module"> block is pasted.
  const labeled = raw.match(/firebaseConfig\s*=\s*(\{[\s\S]*?\})\s*;/);
  if(labeled) return labeled[1];
  // Fallback: bare object paste (no "const firebaseConfig =" wrapper at all) —
  // use the first-to-last brace, which is safe only when nothing else in the
  // paste contains braces (true for a bare {...} paste).
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if(firstBrace===-1 || lastBrace===-1 || lastBrace<firstBrace) return null;
  return raw.slice(firstBrace, lastBrace+1);
}

function saveSetup(){
  const raw = $('setup-config').value.trim();
  // Accepts: the bare {...} object, "const firebaseConfig = {...};", or the
  // full <script type="module"> block with imports/comments — all three work.
  const isolated = extractFirebaseObject(raw);
  if(!isolated){ toast('Could not find a { ... } config object in what was pasted'); return; }
  try{
    const cfg = new Function('return ('+isolated+')')();
    if(!cfg || !cfg.apiKey || !cfg.projectId) throw new Error('apiKey/projectId missing from the pasted block');
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    localStorage.setItem(ATT_KEY, $('setup-att').value.trim());
    location.reload();
  }catch(e){ toast('Could not parse config: '+e.message); }
}

async function doLogin(){
  $('login-err').textContent='';
  try{
    await auth.signInWithEmailAndPassword($('login-email').value.trim(), $('login-pass').value);
  }catch(e){ $('login-err').textContent = e.message; }
}
function doLogout(){ auth.signOut(); }

async function onSignedIn(){
  hide('scr-login'); hide('scr-setup'); show('scr-main');
  // Ensure my user doc; the FIRST user ever becomes admin
  const uref = db.collection('users').doc(me.uid);
  const snap = await uref.get();
  if(!snap.exists){
    const anyUsers = await db.collection('users').limit(1).get();
    const role = anyUsers.empty ? 'admin' : 'member';
    await uref.set({email:me.email, name:me.email.split('@')[0], role, createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    if(role==='admin') toast('You are the first user — admin role assigned');
  }
  myDoc = (await uref.get()).data();
  $('me-name').textContent = myDoc.name + (myDoc.role==='admin'?' · admin':'');
  listenAll();
  ensureTodaysRecurringTasks();
  handleDeepLink();
}

function teardown(){ [unsubChans,unsubTasks,unsubUsers,unsubMsgs].forEach(u=>{ if(u) u(); }); }

// ═══════════════════════════════════════════════════════════
// RECURRING TASK TEMPLATES — "daily work as a pending list"
// A template defines a task that should exist every day it applies
// (Daily, or specific weekdays). Whenever ANYONE opens the app, we
// check: for each active template, does today's task already exist?
// If not, create it. A Firestore transaction on a per-template-per-day
// "runlog" doc prevents two people opening the app at once from
// creating the same day's task twice.
// No billing plan needed — this runs client-side, on app open.
// ═══════════════════════════════════════════════════════════
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
let TEMPLATES = [];
let unsubTemplates = null;

function listenTemplates(){
  if(unsubTemplates) unsubTemplates();
  unsubTemplates = db.collection('taskTemplates').orderBy('createdAt','desc').onSnapshot(s=>{
    TEMPLATES = s.docs.map(d=>({id:d.id, ...d.data()}));
    renderTemplates();
  });
}

async function ensureTodaysRecurringTasks(){
  const todayStr = new Date().toISOString().slice(0,10);
  const dow = WEEKDAYS[new Date().getDay()];
  const snap = await db.collection('taskTemplates').where('active','==', true).get();
  for(const doc of snap.docs){
    const tpl = doc.data();
    const applies = tpl.recurrence==='Daily' || (tpl.recurrence==='Weekdays' && (tpl.weekdays||[]).includes(dow));
    if(!applies) continue;
    const runId = doc.id+'_'+todayStr;
    const runRef = db.collection('taskTemplateRuns').doc(runId);
    try{
      // Transaction: only the first device to reach this today actually creates the task.
      await db.runTransaction(async (tx)=>{
        const runSnap = await tx.get(runRef);
        if(runSnap.exists) return; // already created today by someone else
        tx.set(runRef, {templateId:doc.id, date:todayStr, createdAt:firebase.firestore.FieldValue.serverTimestamp()});
        const chanRef = db.collection('channels').doc();
        tx.set(chanRef, {
          name:'✅ '+tpl.title, taskId:'pending', createdBy:'system',
          createdAt:firebase.firestore.FieldValue.serverTimestamp(),
          lastAt:firebase.firestore.FieldValue.serverTimestamp(), lastMsg:'Recurring task — auto-created',
        });
        const dueDate = todayStr+'T'+(tpl.dueTime||'18:00');
        const taskRef = db.collection('tasks').doc();
        tx.set(taskRef, {
          title: tpl.title, desc: tpl.desc||'', priority: tpl.priority||'Medium',
          startDate: todayStr, dueDate,
          estHours: tpl.estHours||0, attachment:'',
          createdBy:'system', createdByName:'Recurring: '+tpl.title,
          assignees: tpl.assignees||[], assigneeNames: tpl.assigneeNames||[],
          status:'Pending', channelId: chanRef.id, templateId: doc.id,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
    }catch(e){ /* transaction races are expected & harmless — someone else won */ }
  }
}

function openNewTemplate(){
  $('tpl-title').value=''; $('tpl-desc').value=''; $('tpl-due').value='18:00'; $('tpl-est').value='';
  document.querySelectorAll('#tpl-weekdays .fbtn').forEach(b=>b.classList.remove('on'));
  $('tpl-recurrence').value='Daily';
  toggleTplWeekdays();
  renderTplAssigneePicker();
  show('scr-newtemplate');
}
function toggleTplWeekdays(){
  $('tpl-weekdays-wrap').style.display = $('tpl-recurrence').value==='Weekdays' ? '' : 'none';
}
function tplToggleDay(el){ el.classList.toggle('on'); }
function renderTplAssigneePicker(){
  $('tpl-assignees').innerHTML = USERS.map(u=>`
    <label class="checkline"><input type="checkbox" class="tpl-a" value="${u.uid}" data-name="${esc(u.name)}">
      <div class="avatar" style="width:30px;height:30px;font-size:.7rem">${initials(u.name)}</div><span>${esc(u.name)}</span></label>`).join('');
}
async function saveTemplate(){
  const title = $('tpl-title').value.trim();
  const picked = [...document.querySelectorAll('.tpl-a:checked')];
  if(!title){ toast('Title required'); return; }
  if(!picked.length){ toast('Select at least one assignee'); return; }
  const recurrence = $('tpl-recurrence').value;
  const weekdays = [...document.querySelectorAll('#tpl-weekdays .fbtn.on')].map(b=>b.dataset.day);
  if(recurrence==='Weekdays' && !weekdays.length){ toast('Pick at least one weekday'); return; }
  await db.collection('taskTemplates').add({
    title, desc:$('tpl-desc').value, priority:'Medium',
    recurrence, weekdays, dueTime:$('tpl-due').value||'18:00',
    estHours:parseFloat($('tpl-est').value)||0,
    assignees:picked.map(p=>p.value), assigneeNames:picked.map(p=>p.dataset.name),
    active:true, createdBy:me.uid, createdByName:myDoc.name,
    createdAt:firebase.firestore.FieldValue.serverTimestamp(),
  });
  hide('scr-newtemplate');
  toast('Recurring task template saved ✓ — first instance appears next time the app opens');
}
function renderTemplates(){
  const el = $('template-list');
  if(!el) return;
  el.innerHTML = TEMPLATES.map(t=>`
    <div class="task-card" style="cursor:default">
      <div class="task-title">${esc(t.title)} ${t.active?'':'<span class="badge b-muted">Paused</span>'}</div>
      <div class="task-meta">
        <span class="badge b-blue">${t.recurrence==='Daily'?'Daily':(t.weekdays||[]).join(',')}</span>
        <span>⏰ ${t.dueTime||'18:00'}</span>
        <span>👤 ${(t.assigneeNames||[]).join(', ')}</span>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" onclick="toggleTemplateActive('${t.id}',${t.active})">${t.active?'Pause':'Resume'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTemplate('${t.id}')">Delete</button>
      </div>
    </div>`).join('') || '<p style="color:var(--muted);text-align:center;padding:20px;font-size:.85rem">No recurring templates — create one above. Each one auto-creates its task every day it applies, the moment anyone opens the app.</p>';
}
async function toggleTemplateActive(id, cur){ await db.collection('taskTemplates').doc(id).update({active: !cur}); }
async function deleteTemplate(id){
  if(!confirm('Delete this recurring template? Past auto-created tasks are unaffected — only future ones stop.')) return;
  await db.collection('taskTemplates').doc(id).delete();
}

// ── REAL-TIME LISTENERS ──
function listenAll(){
  unsubUsers = db.collection('users').onSnapshot(s=>{
    USERS = s.docs.map(d=>({uid:d.id, ...d.data()}));
    renderTeam(); renderAssigneePicker();
  });
  unsubChans = db.collection('channels').orderBy('lastAt','desc').onSnapshot(s=>{
    CHANNELS = s.docs.map(d=>({id:d.id, ...d.data()}));
    renderChannels();
  });
  listenTemplates();
  unsubTasks = db.collection('tasks').orderBy('createdAt','desc').onSnapshot(s=>{
    TASKS = s.docs.map(d=>({id:d.id, ...d.data()}));
    renderTasks(); renderDash(); updateDots();
    if(activeTask){ const t=TASKS.find(x=>x.id===activeTask); if(t) fillTaskDetail(t); }
  });
}

function updateDots(){
  const awaiting = TASKS.filter(t=>t.assignees.includes(me.uid) && t.status==='Pending').length;
  const d=$('dot-tasks'); d.style.display = awaiting?'flex':'none'; d.textContent = awaiting;
}

// ── TABS ──
function switchTab(el){
  document.querySelectorAll('.tabbtn').forEach(b=>b.classList.remove('on')); el.classList.add('on');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
  show('view-'+el.dataset.v);
  $('topbar-title').textContent = {chats:'Chats',tasks:'Tasks',dash:'Dashboard',team:'Team'}[el.dataset.v];
}

// ── CHAT ──
function renderChannels(){
  const q = ($('chat-search')?.value||'').trim().toLowerCase();
  let list = CHANNELS;
  if(q){
    const matchingTaskChanIds = new Set(TASKS.filter(t=>t.title.toLowerCase().includes(q)).map(t=>t.channelId));
    list = CHANNELS.filter(c=> c.name.toLowerCase().includes(q) || (c.lastMsg||'').toLowerCase().includes(q) || matchingTaskChanIds.has(c.id));
  }
  $('chan-list').innerHTML = list.map(c=>`
    <div class="chan-row" onclick="openChat('${c.id}')">
      <div class="chan-ico">${c.taskId && c.taskId!=='pending' ? '✅':'💬'}</div>
      <div style="flex:1;min-width:0">
        <div class="chan-name">${esc(c.name)} ${c.taskId && c.taskId!=='pending' ? '<span class="badge b-blue" style="margin-left:4px">Task</span>':''}</div>
        <div class="chan-last">${esc(c.lastMsg||'No messages yet')}</div>
      </div>
      <div style="font-size:.64rem;color:var(--muted)">${c.lastAt?fmtTs(c.lastAt):''}</div>
    </div>`).join('') || `<p style="color:var(--muted);text-align:center;padding:20px;font-size:.85rem">${q?'No matches':'No channels — create one above'}</p>`;
}

async function createChannel(){
  const name = $('new-chan-name').value.trim();
  if(!name) return;
  await db.collection('channels').add({name, createdBy:me.uid, createdAt:firebase.firestore.FieldValue.serverTimestamp(), lastAt:firebase.firestore.FieldValue.serverTimestamp(), lastMsg:''});
  $('new-chan-name').value='';
}

function openChat(chanId){
  activeChan = chanId;
  const c = CHANNELS.find(x=>x.id===chanId);
  $('chat-title').textContent = c ? c.name : '';
  $('chat-sub').textContent = c && c.taskId ? 'Task discussion thread' : 'Team channel';
  $('chat-msgs').innerHTML='';
  document.getElementById('chat-screen').classList.add('on');
  if(unsubMsgs) unsubMsgs();
  unsubMsgs = db.collection('channels').doc(chanId).collection('messages').orderBy('ts','asc').limitToLast(100)
    .onSnapshot(s=>{
      $('chat-msgs').innerHTML = s.docs.map(d=>{
        const m=d.data(); const mine = m.uid===me.uid;
        return `<div class="msg ${mine?'me':'them'}">
          ${mine?'':`<div class="who">${esc(m.name)}</div>`}
          <div>${esc(m.text)}</div><div class="when">${fmtTs(m.ts)}</div></div>`;
      }).join('');
      $('chat-msgs').scrollTop = $('chat-msgs').scrollHeight;
    });
}
function closeChat(){ document.getElementById('chat-screen').classList.remove('on'); if(unsubMsgs){unsubMsgs(); unsubMsgs=null;} activeChan=null; }

async function sendMsg(){
  const text = $('chat-input').value.trim();
  if(!text || !activeChan) return;
  $('chat-input').value='';
  const ref = db.collection('channels').doc(activeChan);
  await ref.collection('messages').add({text, uid:me.uid, name:myDoc.name, ts:firebase.firestore.FieldValue.serverTimestamp()});
  await ref.update({lastMsg:(myDoc.name+': '+text).substring(0,60), lastAt:firebase.firestore.FieldValue.serverTimestamp()});
}

// ── TASKS ──
function setTaskFilter(el){
  document.querySelectorAll('#task-filters .fbtn').forEach(b=>b.classList.remove('on')); el.classList.add('on');
  taskFilter = el.dataset.f; renderTasks();
}

function toggleTemplatesView(){
  const t = $('template-section'), r = $('regular-task-section');
  const showingTpl = t.style.display !== 'none';
  t.style.display = showingTpl ? 'none' : '';
  r.style.display = showingTpl ? '' : 'none';
}

function filteredTasks(){
  return TASKS.filter(t=>{
    if(taskFilter==='mine') return t.assignees.includes(me.uid);
    if(taskFilter==='created') return t.createdBy===me.uid;
    if(taskFilter==='overdue') return effStatus(t)==='Overdue';
    if(taskFilter==='awaiting') return t.status==='Pending';
    return true;
  });
}

function renderTasks(){
  $('task-list').innerHTML = filteredTasks().map(t=>`
    <div class="task-card p-${t.priority}" onclick="openTask('${t.id}')">
      <div class="task-title">${esc(t.title)}</div>
      <div class="task-meta">
        ${statusBadge(effStatus(t))}
        <span class="badge b-muted">${t.priority}</span>
        <span>👤 ${esc(t.assigneeNames.join(', '))}</span>
        <span>📅 ${fmtDate(t.dueDate)}</span>
      </div>
    </div>`).join('') || '<p style="color:var(--muted);text-align:center;padding:20px;font-size:.85rem">No tasks in this view</p>';
}

function renderAssigneePicker(){
  const box = $('nt-assignees');
  if(!box) return;
  box.innerHTML = USERS.map(u=>`
    <label class="checkline"><input type="checkbox" class="nt-a" value="${u.uid}" data-name="${esc(u.name)}" onchange="checkWorkload()">
      <div class="avatar" style="width:30px;height:30px;font-size:.7rem">${initials(u.name)}</div>
      <span>${esc(u.name)}</span><span style="color:var(--muted);font-size:.7rem;margin-left:auto">${u.role}</span></label>`).join('');
}

let ntLinkedChanId = null;
let ntMode = 'task';

function setTaskMode(mode){
  ntMode = mode;
  $('nt-mode-task').classList.toggle('on', mode==='task');
  $('nt-mode-checklist').classList.toggle('on', mode==='checklist');
  $('nt-checklist-wrap').style.display = mode==='checklist' ? '' : 'none';
  $('nt-mode-hint').textContent = mode==='checklist'
    ? 'Instruction checklist: assignee taps Begin → In Progress → ticks each item → writes a response → Submit Complete. No accept/reject step.'
    : 'Full task: assignee can Accept / Reject / Reallocate.';
  $('nt-heading').textContent = mode==='checklist' ? 'New Instruction' : 'New Task';
  if(mode==='checklist' && !document.querySelectorAll('.ck-item-in').length) addChecklistItemField();
}

function addChecklistItemField(){
  const wrap = $('nt-checklist-items');
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px';
  row.innerHTML = `<input class="ck-item-in" placeholder="e.g. Check tank 2 pressure"><button type="button" class="btn btn-ghost btn-sm" onclick="this.parentElement.remove()">✕</button>`;
  wrap.appendChild(row);
}

function openNewTask(){
  ntLinkedChanId = null;
  pendingErpCard = null;
  $('nt-linked-chat-note').style.display='none';
  $('nt-title').value=''; $('nt-desc').value=''; $('nt-est').value=''; $('nt-attach').value='';
  $('nt-start').value = new Date().toISOString().slice(0,10);
  $('nt-due').value=''; $('nt-warnings').innerHTML='';
  $('nt-checklist-items').innerHTML='';
  setTaskMode('task');
  renderAssigneePicker();
  show('scr-newtask');
}

// Opened from inside a chat's ✅＋ button — the new task's discussion IS this channel,
// no separate thread gets created.
// ═══════════════════════════════════════════════════════════
// ERP ACTION DETECTION — parks the full auto-draft bridge for later
// (per your decision). For now: recognize common ERP-style instructions
// (PO, dispatch, stock allocation) in a task's title/description and
// offer a clean, structured, shareable data card — accounts/warehouse
// staff read it and act on it in the ERP themselves. Nothing is written
// to the ERP automatically; this is a communication aid, not a bridge.
// ═══════════════════════════════════════════════════════════
function detectErpAction(text){
  const t = (text||'').toLowerCase();
  // PO: "PO to Vendor A for XYZ 10kg at 75" / "purchase order ... 10 kg ... rs 75" / "@75" / "₹75"
  if(/\bpo\b|purchase\s*order/.test(t)){
    const vendor = text.match(/(?:to|from)\s+([A-Z][\w&.\- ]{2,30}?)(?:\s+for|\s+material|\s*,|$)/i);
    const material = text.match(/for\s+([A-Za-z0-9\-\/ ]{2,30}?)\s+[\d.]+\s*(?:kg|kgs|units|nos)/i);
    const qty = text.match(/([\d.]+)\s*(kg|kgs|units|nos)\b/i);
    const rate = text.match(/(?:rs\.?|₹|inr|at)\s*\.?\s*([\d.]+)|@\s*([\d.]+)/i);
    return {
      type:'Purchase Order', icon:'📄',
      fields:{
        Vendor: vendor ? vendor[1].trim() : '(not detected — check instruction)',
        Material: material ? material[1].trim() : '(not detected — check instruction)',
        Quantity: qty ? qty[1]+' '+qty[2] : '(not detected)',
        Rate: rate ? '₹'+(rate[1]||rate[2]) : '(not detected)',
      },
      note:'Draft this PO in ERP → Purchase → New PO using the details above, then route for approval.',
    };
  }
  if(/dispatch|delivery|shipment/.test(t)){
    return {type:'Dispatch Action', icon:'🚚', fields:{Instruction:text}, note:'Create/update in ERP → Dispatch based on the instruction above.'};
  }
  if(/allocat|stock\s*(transfer|issue|reserve)/.test(t)){
    return {type:'Stock Allocation', icon:'📦', fields:{Instruction:text}, note:'Action in ERP → Inventory based on the instruction above.'};
  }
  return null;
}

let pendingErpCard = null;
function checkErpActionHint(){
  const combined = ($('nt-title').value||'') + ' ' + ($('nt-desc').value||'');
  const detected = detectErpAction(combined);
  const box = $('nt-erp-hint');
  if(!box) return;
  if(detected){
    pendingErpCard = detected;
    box.style.display='';
    box.innerHTML = `<div class="warnbox" style="border-color:var(--accent);color:var(--text)">
      ${detected.icon} Looks like a <b>${detected.type}</b> instruction — a structured data card will be attached for easy WhatsApp sharing to accounts/warehouse.
      <label style="margin-top:6px"><input type="checkbox" id="nt-attach-erp-card" checked> Attach shareable ${detected.type} card</label></div>`;
  } else {
    pendingErpCard = null;
    box.style.display='none'; box.innerHTML='';
  }
}

function erpCardText(card, taskTitle){
  let text = `${card.icon} *${card.type.toUpperCase()} — DATA CARD*\nFrom task: ${taskTitle}\n\n`;
  Object.entries(card.fields).forEach(([k,v])=>{ text += `*${k}:* ${v}\n`; });
  text += `\n📝 ${card.note}\n\n_Innotek Work — generated from instruction, please verify before acting_`;
  return text;
}

function shareErpCard(){
  const t = TASKS.find(x=>x.id===activeTask);
  if(!t || !t.erpCard) return;
  window.open('https://wa.me/?text='+encodeURIComponent(erpCardText(t.erpCard, t.title)),'_blank');
}

function openNewTaskFromChat(){
  if(!activeChan) return;
  openNewTask();
  ntLinkedChanId = activeChan;
  const c = CHANNELS.find(x=>x.id===activeChan);
  $('nt-linked-chat-note').style.display='';
  $('nt-linked-chat-note').innerHTML = `💬 This task's discussion will be <b>${esc(c?c.name:'this chat')}</b> — no new thread is created.`;
}

async function createTask(){
  const title = $('nt-title').value.trim();
  const picked = [...document.querySelectorAll('.nt-a:checked')];
  if(!title){ toast('Title required'); return; }
  if(!picked.length){ toast('Select at least one assignee'); return; }
  if(!$('nt-due').value){ toast('Due date required'); return; }
  const assignees = picked.map(p=>p.value);
  const assigneeNames = picked.map(p=>p.dataset.name);

  let channelId = ntLinkedChanId;
  if(!channelId){
    const chanRef = await db.collection('channels').add({
      name:'✅ '+title, taskId:'pending', createdBy:me.uid,
      createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      lastAt:firebase.firestore.FieldValue.serverTimestamp(), lastMsg:'Task discussion opened',
    });
    channelId = chanRef.id;
  }

  const items = ntMode==='checklist'
    ? [...document.querySelectorAll('.ck-item-in')].map(i=>i.value.trim()).filter(Boolean).map(text=>({text, done:false}))
    : [];
  if(ntMode==='checklist' && !items.length){ toast('Add at least one instruction item'); return; }

  const attachErpCard = pendingErpCard && document.getElementById('nt-attach-erp-card') && document.getElementById('nt-attach-erp-card').checked;
  const t = {
    title, desc:$('nt-desc').value, priority:$('nt-priority').value,
    taskMode: ntMode, checklist: items,
    startDate:$('nt-start').value, dueDate:$('nt-due').value,
    estHours:parseFloat($('nt-est').value)||0, attachment:$('nt-attach').value||'',
    createdBy:me.uid, createdByName:myDoc.name,
    assignees, assigneeNames,
    status: ntMode==='checklist' ? 'Not Started' : 'Pending',
    channelId,
    erpCard: attachErpCard ? pendingErpCard : null,
    createdAt:firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
  };
  const ref = await db.collection('tasks').add(t);
  await db.collection('channels').doc(channelId).update({taskId:ref.id, name: ntLinkedChanId ? undefined : undefined});
  await logAudit(ref.id, 'Created & Assigned', `to ${assigneeNames.join(', ')} · due ${t.dueDate}${ntLinkedChanId?' · linked to existing chat':''}`);
  hide('scr-newtask');
  toast((ntMode==='checklist'?'Instruction':'Task')+' assigned ✓');
}

// ── WORKLOAD + LEAVE CHECK (links to the ERP's attendance backend) ──
let leaveCache=null;
function fetchLeaves(){
  return new Promise(resolve=>{
    if(leaveCache) return resolve(leaveCache);
    const url = localStorage.getItem(ATT_KEY);
    if(!url) return resolve([]);
    const cb = 'lv_'+Date.now();
    const timeout = setTimeout(()=>{ delete window[cb]; resolve([]); }, 8000);
    window[cb] = (json)=>{
      clearTimeout(timeout); delete window[cb]; script.remove();
      leaveCache = (json && json.leaveRequests) ? json.leaveRequests.filter(l=>l.Status==='Approved') : [];
      resolve(leaveCache);
    };
    const script = document.createElement('script');
    script.onerror = ()=>{ clearTimeout(timeout); resolve([]); };
    script.src = url+'?action=getAll&callback='+cb;
    document.head.appendChild(script);
  });
}

async function checkWorkload(){
  const box = $('nt-warnings');
  box.innerHTML = '';
  const picked = [...document.querySelectorAll('.nt-a:checked')];
  if(!picked.length) return;
  const start = $('nt-start').value, due = ($('nt-due').value||'').slice(0,10);
  const leaves = await fetchLeaves();
  const warns = [];
  picked.forEach(p=>{
    const name = p.dataset.name;
    // Open-task load
    const open = TASKS.filter(t=>t.assignees.includes(p.value) && !['Completed','Cancelled','Rejected'].includes(t.status)).length;
    if(open >= MAX_OPEN_TASKS) warns.push(`⚠️ <b>${esc(name)}</b> already has ${open} open tasks (limit ${MAX_OPEN_TASKS})`);
    // Approved leave overlap (match by name against attendance records)
    leaves.forEach(l=>{
      if((l.EmployeeName||'').toLowerCase().includes(name.toLowerCase()) ||
         name.toLowerCase().includes((l.EmployeeName||'').toLowerCase())){
        if(start && due && !(due < l.FromDate || start > l.ToDate)){
          warns.push(`🌴 <b>${esc(name)}</b> is on approved leave ${fmtDate(l.FromDate)}–${fmtDate(l.ToDate)} — overlaps this task`);
        }
      }
    });
  });
  if(warns.length) box.innerHTML = `<div class="warnbox">${warns.join('<br>')}<br><small>You can still assign — this is a warning, not a block.</small></div>`;
}

// ── TASK DETAIL + LIFECYCLE ──
function openTask(id){
  activeTask = id;
  const t = TASKS.find(x=>x.id===id);
  if(!t) return;
  fillTaskDetail(t);
  listenComments(id); listenAudit(id);
  show('scr-task');
}

function fillTaskDetail(t){
  $('td-title').textContent = t.title;
  $('td-status').outerHTML = statusBadge(effStatus(t)).replace('class="badge','id="td-status" class="badge');
  $('td-desc').textContent = t.desc||'';
  $('td-kv').innerHTML = `
    <div class="kv"><span class="k">Type</span><b>${t.taskMode==='checklist'?'Instruction Checklist':'Full Task'}</b></div>
    <div class="kv"><span class="k">Priority</span><b>${t.priority}</b></div>
    <div class="kv"><span class="k">Assigned to</span><b>${esc(t.assigneeNames.join(', '))}</b></div>
    <div class="kv"><span class="k">Created by</span><b>${esc(t.createdByName)}</b></div>
    <div class="kv"><span class="k">Start</span><b>${fmtDate(t.startDate)}</b></div>
    <div class="kv"><span class="k">Due</span><b>${t.dueDate?new Date(t.dueDate).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—'}</b></div>
    <div class="kv"><span class="k">Estimated</span><b>${t.estHours||'—'} hrs</b></div>
    ${t.attachment?`<div class="kv"><span class="k">Attachment</span><a href="${esc(t.attachment)}" target="_blank" style="color:var(--accent)">Open link</a></div>`:''}
    ${t.rejectReason?`<div class="kv"><span class="k">Reject reason</span><b style="color:var(--danger)">${esc(t.rejectReason)}</b></div>`:''}
    ${t.reallocRequest?`<div class="kv"><span class="k">Reallocation requested</span><b style="color:var(--warn)">${esc(t.reallocRequest)}</b></div>`:''}`;
  if(t.taskMode==='checklist'){
    $('td-kv').innerHTML += `<div style="margin-top:10px">${(t.checklist||[]).map((item,i)=>`
      <label class="checkline"><input type="checkbox" ${item.done?'checked':''} ${t.assignees.includes(me.uid)&&t.status==='In Progress'?'':'disabled'} onchange="toggleChecklistItem(${i},this.checked)">
        <span style="${item.done?'text-decoration:line-through;color:var(--muted)':''}">${esc(item.text)}</span></label>`).join('')}</div>
      ${t.response?`<div class="kv" style="margin-top:8px"><span class="k">Response</span><b>${esc(t.response)}</b></div>`:''}`;
  }
  renderTaskActions(t);
}

async function toggleChecklistItem(idx, checked){
  const t = TASKS.find(x=>x.id===activeTask);
  if(!t) return;
  const cl = [...t.checklist]; cl[idx] = {...cl[idx], done:checked};
  await db.collection('tasks').doc(t.id).update({checklist:cl, updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
}

function renderTaskActions(t){
  const el = $('td-actions');
  const isAssignee = t.assignees.includes(me.uid);
  const isOwner = t.createdBy===me.uid || (myDoc&&myDoc.role==='admin');
  let html = `<button class="btn btn-ghost btn-sm" onclick="openChat('${t.channelId}')">💬 Thread</button>`;
  if(t.erpCard) html += `<button class="btn btn-ghost btn-sm" onclick="shareErpCard()">${t.erpCard.icon} Share ${t.erpCard.type} Card</button>`;

  if(t.taskMode==='checklist'){
    if(isAssignee && t.status==='Not Started') html += `<button class="btn btn-primary btn-sm" onclick="taskAction('begin')">▶ Begin</button>`;
    if(isAssignee && t.status==='In Progress'){
      const allDone = (t.checklist||[]).every(i=>i.done);
      html += `<button class="btn btn-success btn-sm" ${allDone?'':'disabled title="Tick all items first"'} onclick="taskAction('submitChecklist')">✓ Submit Complete</button>`;
    }
    if(isOwner && !['Completed','Cancelled'].includes(t.status)) html += `<button class="btn btn-danger btn-sm" onclick="taskAction('cancel')">Cancel</button>`;
    el.innerHTML = html;
    return;
  }

  if(isAssignee && t.status==='Pending'){
    html += `<button class="btn btn-success btn-sm" onclick="taskAction('accept')">✓ Accept</button>
      <button class="btn btn-danger btn-sm" onclick="taskAction('reject')">✗ Reject</button>
      <button class="btn btn-ghost btn-sm" onclick="taskAction('realloc')">↪ Suggest Reallocation</button>
      <button class="btn btn-ghost btn-sm" onclick="taskAction('extend')">⏰ Request Extension</button>`;
  }
  if(isAssignee && t.status==='Accepted') html += `<button class="btn btn-primary btn-sm" onclick="taskAction('start')">▶ Start Work</button>`;
  if(isAssignee && t.status==='In Progress') html += `<button class="btn btn-success btn-sm" onclick="taskAction('complete')">✓ Mark Completed</button>`;
  if(isOwner && t.reallocRequest) html += `<button class="btn btn-primary btn-sm" onclick="taskAction('approveRealloc')">✓ Approve Reallocation</button>
    <button class="btn btn-ghost btn-sm" onclick="taskAction('denyRealloc')">✗ Keep Original</button>`;
  if(isOwner && !['Completed','Cancelled'].includes(t.status)) html += `<button class="btn btn-danger btn-sm" onclick="taskAction('cancel')">Cancel Task</button>`;
  if(isOwner && t.status==='Completed' && !t.reviewed) html += `<button class="btn btn-success btn-sm" onclick="taskAction('review')">👍 Review OK</button>`;
  el.innerHTML = html;
}

async function taskAction(kind){
  const t = TASKS.find(x=>x.id===activeTask);
  if(!t) return;
  const ref = db.collection('tasks').doc(t.id);
  const upd = {updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
  if(kind==='accept'){ upd.status='Accepted'; await logAudit(t.id,'Accepted',`by ${myDoc.name}`); }
  if(kind==='begin'){ upd.status='In Progress'; await logAudit(t.id,'Begun',`by ${myDoc.name}`); }
  if(kind==='submitChecklist'){
    const response = prompt('Your response / observation for this instruction:')||'';
    upd.status='Completed'; upd.response=response; upd.completedAt=firebase.firestore.FieldValue.serverTimestamp();
    await logAudit(t.id,'Instruction Completed',`by ${myDoc.name}${response?': '+response:''}`);
  }
  if(kind==='start'){ upd.status='In Progress'; await logAudit(t.id,'Started',`by ${myDoc.name}`); }
  if(kind==='complete'){ upd.status='Completed'; upd.completedAt=firebase.firestore.FieldValue.serverTimestamp(); await logAudit(t.id,'Completed',`by ${myDoc.name}`); }
  if(kind==='reject'){
    const reason = prompt('Reason for rejecting (mandatory):');
    if(!reason) return;
    upd.status='Rejected'; upd.rejectReason=reason;
    await logAudit(t.id,'Rejected',`by ${myDoc.name}: ${reason}`);
  }
  if(kind==='realloc'){
    const other = prompt('Suggest another person (name) + reason:');
    if(!other) return;
    upd.reallocRequest = `${other} (suggested by ${myDoc.name})`;
    await logAudit(t.id,'Reallocation Requested',`${other} — by ${myDoc.name}`);
  }
  if(kind==='approveRealloc'){
    const uname = prompt('Type the exact team member name to reassign to:', (t.reallocRequest||'').split(' (')[0]);
    const u = USERS.find(x=>x.name.toLowerCase()===String(uname).toLowerCase());
    if(!u){ toast('No team member with that name'); return; }
    upd.assignees=[u.uid]; upd.assigneeNames=[u.name]; upd.status='Reallocated'; upd.reallocRequest='';
    await logAudit(t.id,'Reallocated',`to ${u.name} — approved by ${myDoc.name}`);
    setTimeout(()=>ref.update({status:'Pending'}), 800); // new assignee must accept
  }
  if(kind==='denyRealloc'){ upd.reallocRequest=''; await logAudit(t.id,'Reallocation Denied',`by ${myDoc.name}`); }
  if(kind==='extend'){
    const nd = prompt('Proposed new due date (YYYY-MM-DD HH:MM):');
    if(!nd) return;
    await logAudit(t.id,'Extension Requested',`${nd} — by ${myDoc.name}`);
    toast('Extension request logged — creator will see it in the audit & thread');
    await db.collection('channels').doc(t.channelId).collection('messages').add({
      text:`⏰ Extension requested to ${nd}`, uid:me.uid, name:myDoc.name, ts:firebase.firestore.FieldValue.serverTimestamp()});
    return;
  }
  if(kind==='cancel'){
    if(!confirm('Cancel this task?')) return;
    upd.status='Cancelled'; await logAudit(t.id,'Cancelled',`by ${myDoc.name}`);
  }
  if(kind==='review'){ upd.reviewed=true; await logAudit(t.id,'Reviewed OK',`by ${myDoc.name}`); }
  await ref.update(upd);
}

function logAudit(taskId, action, detail){
  return db.collection('tasks').doc(taskId).collection('audit').add({
    action, detail, by:myDoc.name, ts:firebase.firestore.FieldValue.serverTimestamp(),
  });
}

let activeTaskComments = []; // cached structured data for export/share — HTML rendering derives from this

function listenComments(id){
  if(unsubComments) unsubComments();
  unsubComments = db.collection('tasks').doc(id).collection('comments').orderBy('ts','asc')
    .onSnapshot(s=>{
      activeTaskComments = s.docs.map(d=>d.data());
      $('td-comments').innerHTML = activeTaskComments.map(c=>
        `<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:.82rem">
          <b style="color:var(--accent);font-size:.72rem">${esc(c.name)}</b> <span style="color:var(--muted);font-size:.64rem">${fmtTs(c.ts)}</span><br>${esc(c.text)}</div>`
      ).join('') || '<p style="color:var(--muted);font-size:.78rem;padding:6px 0">No comments yet</p>';
      $('td-comments').scrollTop = $('td-comments').scrollHeight;
    });
}

function listenAudit(id){
  if(unsubAudit) unsubAudit();
  unsubAudit = db.collection('tasks').doc(id).collection('audit').orderBy('ts','desc')
    .onSnapshot(s=>{
      $('td-audit').innerHTML = s.docs.map(d=>{
        const a=d.data();
        return `<div class="audit-row"><b>${esc(a.action)}</b> — ${esc(a.detail)} · ${esc(a.by)} · ${fmtTs(a.ts)}</div>`;
      }).join('');
    });
}

async function addComment(){
  const text = $('td-comment-in').value.trim();
  if(!text || !activeTask) return;
  $('td-comment-in').value='';
  await db.collection('tasks').doc(activeTask).collection('comments').add({
    text, uid:me.uid, name:myDoc.name, ts:firebase.firestore.FieldValue.serverTimestamp()});
}

// ── DASHBOARD ──
function setDashSub(sub){
  $('dash-sub-overview').classList.toggle('on', sub==='overview');
  $('dash-sub-schedule').classList.toggle('on', sub==='schedule');
  $('dash-overview-section').style.display = sub==='overview' ? '' : 'none';
  $('dash-schedule-section').style.display = sub==='schedule' ? '' : 'none';
  if(sub==='schedule') renderSchedule();
}

// Jump straight into the Tasks tab pre-filtered — used by clickable KPIs
function jumpToTasks(filterKey){
  document.querySelectorAll('.tabbtn').forEach(b=>b.classList.remove('on'));
  document.querySelector('.tabbtn[data-v="tasks"]').classList.add('on');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
  show('view-tasks');
  $('topbar-title').textContent = 'Tasks';
  document.querySelectorAll('#task-filters .fbtn').forEach(b=>b.classList.toggle('on', b.dataset.f===filterKey));
  taskFilter = filterKey;
  $('template-section').style.display='none';
  $('regular-task-section').style.display='';
  renderTasks();
}

function renderSchedule(){
  const mine = TASKS.filter(t=>t.assignees.includes(me.uid) && t.dueDate && !['Completed','Cancelled'].includes(t.status));
  const byDate = {};
  mine.forEach(t=>{
    const d = (t.dueDate||'').slice(0,10);
    (byDate[d]=byDate[d]||[]).push(t);
  });
  const dates = Object.keys(byDate).sort();
  const el = $('dash-schedule-section');
  if(!dates.length){ el.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;font-size:.85rem">No upcoming scheduled tasks</p>'; return; }
  const todayStr = new Date().toISOString().slice(0,10);
  el.innerHTML = dates.map(d=>{
    const label = d===todayStr ? 'Today' : new Date(d).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'});
    const isPast = d < todayStr;
    return `<div class="card">
      <b style="font-size:.82rem;color:${isPast?'var(--danger)':'var(--accent)'}">${label}${isPast?' (overdue)':''}</b>
      ${byDate[d].map(t=>`<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:.82rem;cursor:pointer;display:flex;justify-content:space-between" onclick="openTask('${t.id}')">
        <span>${esc(t.title)}</span>${statusBadge(effStatus(t))}</div>`).join('')}
    </div>`;
  }).join('');
}

function renderDash(){
  const mine = TASKS.filter(t=>t.assignees.includes(me.uid));
  const today = new Date().toISOString().slice(0,10);
  const dueToday = mine.filter(t=>!['Completed','Cancelled'].includes(t.status) && (t.dueDate||'').slice(0,10)===today);
  const overdue = mine.filter(t=>effStatus(t)==='Overdue');
  const awaiting = mine.filter(t=>t.status==='Pending');
  const done = mine.filter(t=>t.status==='Completed');
  $('dash-kpis').innerHTML = `
    <div class="kpi accent" style="cursor:pointer" onclick="jumpToTasks('mine')"><div class="n">${dueToday.length}</div><div class="l">Due Today</div></div>
    <div class="kpi warn" style="cursor:pointer" onclick="jumpToTasks('awaiting')"><div class="n">${awaiting.length}</div><div class="l">Awaiting My Response</div></div>
    <div class="kpi danger" style="cursor:pointer" onclick="jumpToTasks('overdue')"><div class="n">${overdue.length}</div><div class="l">Overdue</div></div>
    <div class="kpi green" style="cursor:pointer" onclick="jumpToTasks('all')"><div class="n">${done.length}</div><div class="l">Completed</div></div>`;
  const li = arr => arr.map(t=>`<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:.82rem;cursor:pointer" onclick="openTask('${t.id}')">${esc(t.title)} <span style="color:var(--muted);font-size:.7rem">· ${fmtDate(t.dueDate)}</span></div>`).join('') || '<p style="color:var(--muted);font-size:.76rem;padding:6px 0">None</p>';
  $('dash-today').innerHTML = li(dueToday);
  $('dash-awaiting').innerHTML = li(awaiting);
  $('dash-overdue').innerHTML = li(overdue);
  // Admin: team-wide workload
  if(myDoc && myDoc.role==='admin'){
    $('dash-team-card').style.display='';
    $('dash-team').innerHTML = USERS.map(u=>{
      const open = TASKS.filter(t=>t.assignees.includes(u.uid) && !['Completed','Cancelled','Rejected'].includes(t.status)).length;
      const od = TASKS.filter(t=>t.assignees.includes(u.uid) && effStatus(t)==='Overdue').length;
      return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:.82rem">
        <span>${esc(u.name)}</span><span>${open} open ${od?`· <b style="color:var(--danger)">${od} overdue</b>`:''}</span></div>`;
    }).join('');
  }
}

function shareTeamDigest(){
  const open = TASKS.filter(t=>!['Completed','Cancelled','Rejected'].includes(t.status));
  const od = TASKS.filter(t=>effStatus(t)==='Overdue');
  let text = `🤝 *INNOTEK WORK — TEAM DIGEST*\n${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long'})}\n\n`;
  text += `Open tasks: ${open.length} · Overdue: ${od.length}\n\n`;
  od.slice(0,8).forEach(t=>{ text += `🔴 ${t.title} — ${t.assigneeNames.join(', ')} (due ${fmtDate(t.dueDate)})\n`; });
  text += `\n_Innotek Work_`;
  window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
}

function taskSummaryText(t){
  return `✅ *TASK: ${t.title}*\nPriority: ${t.priority} · Status: ${effStatus(t)}\nAssigned: ${t.assigneeNames.join(', ')}\nDue: ${t.dueDate?new Date(t.dueDate).toLocaleString('en-IN'):'—'}\n${t.desc||''}`;
}

// Fetches the linked channel's full message thread once (not a live listener) — used for export/share.
async function fetchThreadMessages(channelId){
  const snap = await db.collection('channels').doc(channelId).collection('messages').orderBy('ts','asc').get();
  return snap.docs.map(d=>d.data());
}

// ── SHARE: task-only vs task+discussion — the person's explicit choice, never automatic ──
function shareTaskWA(){
  const t = TASKS.find(x=>x.id===activeTask);
  if(!t) return;
  const choice = confirm('Include the discussion thread in the WhatsApp share?\n\nOK = Task + Discussion\nCancel = Task summary only');
  if(!choice){
    window.open('https://wa.me/?text='+encodeURIComponent(taskSummaryText(t)+'\n\n_Innotek Work_'),'_blank');
    return;
  }
  fetchThreadMessages(t.channelId).then(msgs=>{
    let text = taskSummaryText(t) + '\n\n💬 *Discussion:*\n';
    if(!msgs.length) text += '(no messages yet)\n';
    msgs.forEach(m=>{ text += `${m.name}: ${m.text}\n`; });
    text += '\n_Innotek Work_';
    // WhatsApp's own length limits apply to very long threads — trim with a notice if needed
    if(text.length > 3500) text = text.slice(0,3400) + '\n…(truncated — use PDF/CSV export for the full record)\n\n_Innotek Work_';
    window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
  });
}

// ── EXPORT DISCUSSION as MOM — CSV or PDF, for records/sharing outside WhatsApp ──
async function exportDiscussionCSV(){
  const t = TASKS.find(x=>x.id===activeTask);
  if(!t) return;
  const msgs = await fetchThreadMessages(t.channelId);
  let csv = 'Task,'+t.title.replace(/,/g,';')+'\n\nTime,From,Message\n';
  msgs.forEach(m=>{
    const line = [fmtTs(m.ts), m.name, '"'+String(m.text||'').replace(/"/g,'""')+'"'].join(',');
    csv += line+'\n';
  });
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${t.title.replace(/[^\w]+/g,'_')}_MOM.csv`;
  a.click();
}

async function exportDiscussionPDF(){
  const t = TASKS.find(x=>x.id===activeTask);
  if(!t) return;
  const msgs = await fetchThreadMessages(t.channelId);
  const w = window.open('', '_blank');
  const rows = msgs.map(m=>`<tr><td style="padding:6px;border-bottom:1px solid #ddd;font-size:12px;color:#666;white-space:nowrap">${fmtTs(m.ts)}</td><td style="padding:6px;border-bottom:1px solid #ddd;font-size:13px;font-weight:600">${esc(m.name)}</td><td style="padding:6px;border-bottom:1px solid #ddd;font-size:13px">${esc(m.text)}</td></tr>`).join('');
  w.document.write(`<html><head><title>${esc(t.title)} — MOM</title></head>
    <body style="font-family:Arial,sans-serif;padding:24px;color:#222">
      <h2 style="margin-bottom:4px">${esc(t.title)} — Minutes of Discussion</h2>
      <p style="color:#666;font-size:13px">Priority: ${t.priority} · Status: ${effStatus(t)} · Assigned: ${esc(t.assigneeNames.join(', '))} · Due: ${t.dueDate?new Date(t.dueDate).toLocaleString('en-IN'):'—'}</p>
      <p style="font-size:13px">${esc(t.desc||'')}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead><tr><th style="text-align:left;padding:6px;border-bottom:2px solid #333;font-size:12px">Time</th><th style="text-align:left;padding:6px;border-bottom:2px solid #333;font-size:12px">From</th><th style="text-align:left;padding:6px;border-bottom:2px solid #333;font-size:12px">Message</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" style="padding:10px;color:#999">No messages</td></tr>'}</tbody>
      </table>
      <p style="margin-top:24px;font-size:11px;color:#999">Innotek Work — generated ${new Date().toLocaleString('en-IN')}</p>
      <script>window.onload=()=>window.print();</` + `script>
    </body></html>`);
  w.document.close();
}

// ── TEAM ──
function renderTeam(){
  $('team-list').innerHTML = USERS.map(u=>`
    <div class="member-row">
      <div class="avatar">${initials(u.name)}</div>
      <div style="flex:1"><b>${esc(u.name)}</b><div style="font-size:.7rem;color:var(--muted)">${esc(u.email)}</div></div>
      <span class="badge ${u.role==='admin'?'b-blue':'b-muted'}">${u.role}</span>
      ${myDoc&&myDoc.role==='admin'&&u.uid!==me.uid?`<button class="btn btn-ghost btn-sm" onclick="toggleRole('${u.uid}','${u.role}')">${u.role==='admin'?'Demote':'Make Admin'}</button>`:''}
      ${u.uid===me.uid?`<button class="btn btn-ghost btn-sm" onclick="renameMe()">✏️</button>`:''}
    </div>`).join('');
}
async function toggleRole(uid, cur){
  await db.collection('users').doc(uid).update({role: cur==='admin'?'member':'admin'});
}
async function renameMe(){
  const n = prompt('Your display name:', myDoc.name);
  if(!n) return;
  await db.collection('users').doc(me.uid).update({name:n});
  myDoc.name = n; $('me-name').textContent = n + (myDoc.role==='admin'?' · admin':'');
}

// ── DEEP LINKS (from the ERP) ──
function handleDeepLink(){
  const h = location.hash;
  if(h.startsWith('#task-')){
    const id = h.slice(6);
    setTimeout(()=>{ if(TASKS.some(t=>t.id===id)) openTask(id); }, 1200);
  }
}

boot();
