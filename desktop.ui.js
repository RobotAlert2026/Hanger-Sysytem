const DEFAULT_MACHINES=Array.from({length:20},(_,index)=>({
  id:index+1,
  name:`Hanger ${String(index+1).padStart(2,'0')}`,
  model:`HNG-${(index+1)*5}`
}));
let MACHINES=DEFAULT_MACHINES.map(machine=>({...machine}));
let pmRecords=[];
let issues=[];
let settings={};
let charts={};
let currentMachineId=null;
let editIssueId=null;
let issueFilterStatus='all';
let searchTerm='';
let statusFilter='all';
let selectedShift='day';
let pendingDeleteId=null;
let currentOverviewMonth=null;
let batchMode=false;
let batchSelected=new Set();
let batchShift='day';
let pmCycles={};

function sortMachinesById(){MACHINES.sort((a,b)=>Number(a.id)-Number(b.id))}
function loadPMCycles(){return{}}
function savePMCycles(){saveMachines()}

function today(){const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`}
function parseLocalDate(s){if(!s)return new Date(NaN);const p=String(s).slice(0,10).split('-');return new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]))}
function normalizeDate(s){
  if(!s)return'';
  const str=String(s).trim();
  if(str.includes('T')||str.endsWith('Z')){const d=new Date(str);if(!isNaN(d)){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}}
  const short=str.slice(0,10);
  if(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(short)){const p=short.split(/[\/\-]/);return`${p[2]}-${p[1]}-${p[0]}`}
  if(/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(short)){return short.replace(/\//g,'-')}
  return short;
}
function fmt(d){if(!d)return'—';const clean=String(d).slice(0,10);const p=clean.split('-');if(p.length!==3||p[0].length!==4)return clean;return`${p[2]}/${p[1]}/${p[0]}`}
function formatTimeString(value){if(!value)return'—';const d=typeof value==='string'?new Date(value):new Date(value);if(isNaN(d))return'—';return`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
function formatDateTime(value){if(!value)return'—';const d=typeof value==='string'?new Date(value):new Date(value);if(isNaN(d))return'—';return`${fmt(d.toISOString().slice(0,10))} ${formatTimeString(d)}`}
function uid(){
  if(typeof crypto!=='undefined'&&crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36)+Math.random().toString(36).slice(2,10);
}
function machineOptions(){return MACHINES.map(m=>`<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}
let _debounceTimers={};
function debounce(key,fn,ms=220){clearTimeout(_debounceTimers[key]);_debounceTimers[key]=setTimeout(fn,ms)}
function thaiDate(d){if(!d)d=new Date();return d.toLocaleDateString('th-TH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
function thaiDateShort(d){if(!d)d=new Date();return d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'})}

function toast(msg,type='success'){
  const t=document.getElementById('toasts');
  const el=document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`<span>${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span><span>${msg}</span>`;
  t.appendChild(el);
  setTimeout(()=>el.remove(),3200);
}
function destroyChart(id){if(charts[id]){charts[id].destroy();delete charts[id]}}
function chartMuted(){return document.body.classList.contains('light')?'#7a6a55':'#9e8f7e'}
function chartGrid(){return document.body.classList.contains('light')?'rgba(140,100,40,.1)':'rgba(255,200,100,.06)'}

function toggleTheme(){
  const isLight=document.body.classList.toggle('light');
  const btn=document.getElementById('theme-btn');
  if(btn)btn.textContent=isLight?'☀️ Light':'🌙 Dark';
  settings.theme=isLight?'light':'dark';
  try{localStorage.setItem('hanger-pm-theme',settings.theme)}catch(error){console.warn('Could not save theme preference',error)}
  if(isSettingsAdmin()) saveSettings(settings);
  renderDashboard();
}
function applyTheme(){
  const btn=document.getElementById('theme-btn');
  let savedTheme='';
  try{savedTheme=localStorage.getItem('hanger-pm-theme')||''}catch(error){console.warn('Could not read theme preference',error)}
  const theme=savedTheme||settings.theme;
  if(theme==='light'){document.body.classList.add('light');if(btn)btn.textContent='☀️ Light'}
  else{document.body.classList.remove('light');if(btn)btn.textContent='🌙 Dark'}
}

let adminAuthenticatedAt=0;
function isAdminAuthenticated(){
  return adminAuthenticatedAt && (Date.now()-adminAuthenticatedAt)<600000;
}
function openSetAdminPinModal(){
  const modal=document.createElement('div');
  modal.className='overlay open';
  modal.id='modal-set-admin-pin-temp';
  modal.innerHTML=`<div class="modal" style="max-width:400px">
    <div class="modal-header"><div class="modal-title">🔐 ตั้ง Admin PIN</div></div>
    <div class="modal-body">
      <p style="font-size:12px;color:var(--muted);margin-bottom:12px">ยังไม่มีการตั้ง Admin PIN เพื่อป้องกันหน้าการตั้งค่า</p>
      <div class="form-group">
        <div class="form-label">ตั้ง Admin PIN (4-6 หลัก)</div>
        <input type="password" class="form-control" id="new-admin-pin" placeholder="••••" maxlength="6" onkeypress="if(event.key==='Enter'){setAdminPin();event.preventDefault()}">
      </div>
      <div class="form-group">
        <div class="form-label">ยืนยัน PIN</div>
        <input type="password" class="form-control" id="confirm-admin-pin" placeholder="••••" maxlength="6" onkeypress="if(event.key==='Enter'){setAdminPin();event.preventDefault()}">
      </div>
      <div id="set-pin-error" style="font-size:12px;color:var(--danger);display:none;margin-bottom:10px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="setAdminPin()">✓ ตั้ง PIN</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}
function setAdminPin(){
  const newPin=String(document.getElementById('new-admin-pin')?.value||'').trim();
  const confirmPin=String(document.getElementById('confirm-admin-pin')?.value||'').trim();
  const errorEl=document.getElementById('set-pin-error');

  if(newPin.length<4){
    if(errorEl){errorEl.textContent='PIN ต้องมีอย่างน้อย 4 หลัก';errorEl.style.display='block'}
    return;
  }
  if(newPin!==confirmPin){
    if(errorEl){errorEl.textContent='PIN ไม่ตรงกัน';errorEl.style.display='block'}
    return;
  }

  settings.adminPin=newPin;
  adminAuthenticatedAt=Date.now();
  saveSettings(settings);

  const tempModal=document.getElementById('modal-set-admin-pin-temp');
  if(tempModal)tempModal.remove();

  setTimeout(()=>{
    renderSettingsPage();
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-settings').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="showView('settings')"]`)?.classList.add('active');
    toast('✅ ตั้ง Admin PIN สำเร็จ','success');
  }, 500);
}
function verifyAdminPin(){
  const pin=String(document.getElementById('admin-pin-input')?.value||'').trim();
  const errorEl=document.getElementById('admin-pin-error');
  const storedPin=String(settings.adminPin||'').trim();

  if(pin!==storedPin){
    if(errorEl){errorEl.textContent='❌ PIN ไม่ถูกต้อง';errorEl.style.display='block'}
    console.error('PIN mismatch!');
    return;
  }

  adminAuthenticatedAt=Date.now();
  closeModal('modal-admin-pin');
  document.getElementById('admin-pin-input').value='';
  if(errorEl)errorEl.style.display='none';

  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-settings').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.nav-item[onclick="showView('settings')"]`)?.classList.add('active');
  renderSettingsPage();
}
function changeAdminPin(){
  const oldPin=String(document.getElementById('change-old-pin')?.value||'').trim();
  const storedPin=String(settings.adminPin||'').trim();
  const errorEl=document.getElementById('change-pin-error');
  const successEl=document.getElementById('change-pin-success');

  if(errorEl)errorEl.style.display='none';
  if(successEl)successEl.style.display='none';

  if(oldPin!==storedPin){
    if(errorEl){errorEl.textContent='❌ PIN ปัจจุบันไม่ถูกต้อง';errorEl.style.display='block'}
    return;
  }

  const modal=document.createElement('div');
  modal.className='overlay open';
  modal.id='modal-new-pin-temp';
  modal.innerHTML=`<div class="modal" style="max-width:400px">
    <div class="modal-header"><div class="modal-title">🔐 ตั้ง PIN ใหม่</div></div>
    <div class="modal-body">
      <div class="form-group">
        <div class="form-label">PIN ใหม่ (4-6 หลัก)</div>
        <input type="password" class="form-control" id="new-pin-input" placeholder="••••" maxlength="6">
      </div>
      <div class="form-group">
        <div class="form-label">ยืนยัน PIN</div>
        <input type="password" class="form-control" id="confirm-new-pin-input" placeholder="••••" maxlength="6" onkeypress="if(event.key==='Enter'){confirmNewPin();event.preventDefault()}">
      </div>
      <div id="new-pin-error" style="font-size:12px;color:var(--danger);display:none;margin-bottom:10px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('modal-new-pin-temp').remove()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="confirmNewPin()">✓ ตั้ง PIN ใหม่</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}
function confirmNewPin(){
  const newPin=String(document.getElementById('new-pin-input')?.value||'').trim();
  const confirmPin=String(document.getElementById('confirm-new-pin-input')?.value||'').trim();
  const errorEl=document.getElementById('new-pin-error');

  if(newPin.length<4){
    if(errorEl){errorEl.textContent='PIN ต้องมีอย่างน้อย 4 หลัก';errorEl.style.display='block'}
    return;
  }
  if(newPin!==confirmPin){
    if(errorEl){errorEl.textContent='PIN ไม่ตรงกัน';errorEl.style.display='block'}
    return;
  }

  settings.adminPin=newPin;
  adminAuthenticatedAt=Date.now();
  saveSettings(settings);

  const tempModal=document.getElementById('modal-new-pin-temp');
  if(tempModal)tempModal.remove();

  const oldPinInput=document.getElementById('change-old-pin');
  if(oldPinInput)oldPinInput.value='';

  setTimeout(()=>{
    const successEl=document.getElementById('change-pin-success');
    if(successEl){successEl.textContent='✅ เปลี่ยน PIN สำเร็จ';successEl.style.display='block'}

    setTimeout(()=>{
      if(successEl)successEl.style.display='none';
    },3000);

    toast('✅ เปลี่ยน Admin PIN สำเร็จ','success');
  }, 500);
}

function showView(name){
  if(name==='settings'&&!isSettingsAdmin()){
    openModal('modal-admin-login-confirm');
    return;
  }
  if(name==='settings'){
    if(!settings.adminPin){
      openSetAdminPinModal();
      return;
    }
    if(!isAdminAuthenticated()){
      openModal('modal-admin-pin');
      return;
    }
  }

  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.nav-item[onclick="showView('${name}')"]`)?.classList.add('active');
  if(name==='dashboard') renderDashboard();
  if(name==='pm') renderPMGrid();
  if(name==='issues') renderIssuesTable();
  if(name==='analytics') renderAnalytics();
  if(name==='history'){populateHistoryMachineFilter();renderHistory()}
  if(name==='settings') renderSettingsPage();
}
async function confirmSettingsLogin(){
  const button=document.querySelector('#modal-admin-login-confirm .modal-footer .btn-primary');
  if(button){button.disabled=true;button.textContent='กำลังเข้าสู่ระบบ...'}
  try{
    const email=await signInSettingsAdmin();
    if(!email)return;
    await loadProtectedSettings();
    closeModal('modal-admin-login-confirm');
    showView('settings');
  }catch(error){
    console.error('Settings sign-in failed:',error);
    toast(`เข้าสู่หน้าตั้งค่าไม่สำเร็จ: ${error.message}`,'error');
  }finally{
    if(button){button.disabled=false;button.textContent='เข้าสู่ระบบแอดมิน'}
  }
}

function selectShift(s){
  selectedShift=s;
  document.getElementById('opt-day').className='shift-opt'+(s==='day'?' sel-day':'');
  document.getElementById('opt-night').className='shift-opt'+(s==='night'?' sel-night':'');
}

function selectBatchShift(s){
  batchShift=s;
  document.getElementById('batch-opt-day').className='shift-opt'+(s==='day'?' sel-day':'');
  document.getElementById('batch-opt-night').className='shift-opt'+(s==='night'?' sel-night':'');
}

function escapeHtml(str){return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function openModal(id){document.getElementById(id).classList.add('open')}
function closeModal(id){document.getElementById(id).classList.remove('open')}
