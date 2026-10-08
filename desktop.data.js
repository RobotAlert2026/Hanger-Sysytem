const GS_URL=window.HANGER_GS_URL||'https://script.google.com/macros/s/AKfycbzdDUpDHE3wFSdxZEsxSX1IWuDkbGr9FS0sGfzcZYPGjDaOjGdvT5Zqn0DpQJ4E70lg/exec';
const FIREBASE_CONFIG={
  apiKey:'AIzaSyC69wikJ7pYXPiZZmcz785Mb-yW1RCu3Sg',
  authDomain:'hanger-system-b67f8.firebaseapp.com',
  projectId:'hanger-system-b67f8',
  storageBucket:'hanger-system-b67f8.firebasestorage.app',
  messagingSenderId:'574752234159',
  appId:'1:574752234159:web:0370fc98ce837718cf525a',
  measurementId:'G-71KQEQVECJ'
};
const FIREBASE_SETTINGS_ADMINS=['robotalert.notification2026@gmail.com'];
const PENDING_SETTINGS_SIGNIN_KEY='hanger-pending-settings-signin';
const DATA_CACHE_KEY='hanger-pm-cache-v1';
const DATA_CACHE_TTL_MS=5*60*1000;
let firebaseInstancePromise;
let firebaseAuth=null;
let firebaseAuthReadyPromise;

function getFirebase(){
  if(!firebaseInstancePromise){
    firebaseInstancePromise=Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
    ]).then(([appSdk,firestoreSdk,authSdk])=>{
      const app=appSdk.initializeApp(FIREBASE_CONFIG);
      firebaseAuth=authSdk.getAuth(app);
      firebaseAuthReadyPromise=new Promise((resolve,reject)=>{
        const unsubscribe=authSdk.onAuthStateChanged(firebaseAuth,user=>{
          unsubscribe();
          resolve(user);
        },error=>{
          unsubscribe();
          reject(error);
        });
      });
      return {db:firestoreSdk.getFirestore(app),auth:firebaseAuth,...firestoreSdk,...authSdk};
    }).catch(error=>{
      firebaseInstancePromise=null;
      throw new Error(`เริ่มต้น Firebase ไม่สำเร็จ: ${error.message}`);
    });
  }
  return firebaseInstancePromise;
}

function describeFirebaseError(error){
  const code=String(error?.code||'');
  if(code.includes('permission-denied')||code.includes('insufficient-permission')){
    return 'Firebase ปฏิเสธสิทธิ์ (permission-denied) กรุณา Publish firestore.rules เวอร์ชันล่าสุด และตรวจว่าเข้าสู่ระบบด้วย robotalert.notification2026@gmail.com';
  }
  if(code.includes('unauthenticated')){
    return 'Firebase ยังไม่ได้รับสถานะล็อกอินผู้ดูแล กรุณาออกจากระบบ Google แล้วล็อกอินใหม่';
  }
  if(code.includes('unavailable')||code.includes('network-request-failed')){
    return 'ติดต่อ Firebase ไม่ได้ กรุณาตรวจอินเทอร์เน็ตหรือการตั้งค่าเครือข่าย แล้วลองใหม่';
  }
  if(code.includes('failed-precondition')){
    return 'Firestore ยังตั้งค่าไม่ครบ กรุณาสร้าง Firestore Database ใน Firebase Console แล้วลองใหม่';
  }
  return `${code?`${code}: `:''}${error?.message||String(error)}`;
}

async function getFirebaseCollection(name){
  const {db,collection,getDocs}=await getFirebase();
  const snapshot=await getDocs(collection(db,name));
  return snapshot.docs.map(item=>({id:item.id,...item.data()}));
}
async function loadFirebaseData(){
  await getFirebase();
  await firebaseAuthReadyPromise;
  const [machines,settings,pmRecords,issues]=await Promise.all([
    getFirebaseCollection('machines'),
    isSettingsAdmin()?getFirebaseCollection('settings'):Promise.resolve([]),
    getFirebaseCollection('pmRecords'),
    getFirebaseCollection('issues')
  ]);
  return {machines,settings,pmRecords,issues};
}
async function completeGoogleRedirectSignIn(){
  const {auth,getRedirectResult,signOut}=await getFirebase();
  const hasPendingSignIn=sessionStorage.getItem(PENDING_SETTINGS_SIGNIN_KEY)==='true';
  let redirectResult;
  try{
    redirectResult=await getRedirectResult(auth);
  }catch(error){
    sessionStorage.removeItem(PENDING_SETTINGS_SIGNIN_KEY);
    throw new Error(`รับผลการเข้าสู่ระบบ Google ไม่สำเร็จ: ${describeFirebaseError(error)}`);
  }
  await firebaseAuthReadyPromise;
  const user=redirectResult?.user||auth.currentUser;
  if(hasPendingSignIn){
    sessionStorage.removeItem(PENDING_SETTINGS_SIGNIN_KEY);
    if(!user)return;
  }
  if(user&&!FIREBASE_SETTINGS_ADMINS.includes(String(user.email||'').toLowerCase())){
    await signOut(auth);
    throw new Error(`บัญชี ${user.email||'นี้'} ไม่มีสิทธิ์ผู้ดูแล`);
  }
}
function isSettingsAdmin(){
  const email=String(firebaseAuth?.currentUser?.email||'').toLowerCase();
  return FIREBASE_SETTINGS_ADMINS.includes(email);
}
async function signInSettingsAdmin(){
  const {auth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,signOut}=await getFirebase();
  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  sessionStorage.setItem(PENDING_SETTINGS_SIGNIN_KEY,'true');
  try{
    const credential=await signInWithPopup(auth,provider);
    const email=String(credential.user.email||'').toLowerCase();
    sessionStorage.removeItem(PENDING_SETTINGS_SIGNIN_KEY);
    if(!FIREBASE_SETTINGS_ADMINS.includes(email)){
      await signOut(auth);
      throw new Error(`บัญชี ${email||'นี้'} ไม่มีสิทธิ์ผู้ดูแล`);
    }
    return email;
  }catch(error){
    if(error.code==='auth/unauthorized-domain'){
      sessionStorage.removeItem(PENDING_SETTINGS_SIGNIN_KEY);
      throw new Error(`Firebase ยังไม่อนุญาตโดเมน "${window.location.hostname}" ให้เข้า Authentication กรุณาเพิ่มโดเมนนี้ที่ Firebase Console → Authentication → Settings → Authorized domains แล้วลองใหม่`);
    }
    if(error.code==='auth/operation-not-allowed'){
      sessionStorage.removeItem(PENDING_SETTINGS_SIGNIN_KEY);
      throw new Error('ยังไม่ได้เปิด Google Sign-in ใน Firebase Console → Authentication → Sign-in method');
    }
    if(error.code==='auth/popup-blocked'||error.code==='auth/popup-closed-by-user'){
      try{
        await signInWithRedirect(auth,provider);
        return;
      }catch(redirectError){
        sessionStorage.removeItem(PENDING_SETTINGS_SIGNIN_KEY);
        throw new Error(`ล็อกอิน Google ไม่สำเร็จ: ${describeFirebaseError(redirectError)}`);
      }
    }
    sessionStorage.removeItem(PENDING_SETTINGS_SIGNIN_KEY);
    throw error;
  }
}
async function signOutSettingsAdmin(){
  try{
    const {auth,signOut}=await getFirebase();
    await signOut(auth);
    settings={};
    adminAuthenticatedAt=0;
    showView('dashboard');
    await initData();
  }catch(error){
    console.error('Settings sign-out failed:',error);
    toast(`ออกจากระบบไม่สำเร็จ: ${error.message}`,'error');
  }
}
async function loadProtectedSettings(){
  if(!isSettingsAdmin()) throw new Error('ต้องเข้าสู่ระบบด้วยบัญชีผู้ดูแลก่อน');
  const rows=await getFirebaseCollection('settings');
  settings={};
  rows.forEach(row=>{if(row.key)settings[row.key]=row.value});
}
async function saveFirebaseDocument(collectionName,id,data){
  const {db,collection,doc,setDoc}=await getFirebase();
  await setDoc(doc(collection(db,collectionName),String(id)),data);
}
async function deleteFirebaseDocument(collectionName,id){
  const {db,collection,doc,deleteDoc}=await getFirebase();
  await deleteDoc(doc(collection(db,collectionName),String(id)));
}
async function writeFirebaseBatch(operations){
  const {db,collection,doc,writeBatch}=await getFirebase();
  for(let offset=0;offset<operations.length;offset+=450){
    const batch=writeBatch(db);
    operations.slice(offset,offset+450).forEach(operation=>{
      const reference=doc(collection(db,operation.collection),String(operation.id));
      if(operation.delete) batch.delete(reference);
      else batch.set(reference,operation.data);
    });
    await batch.commit();
  }
}

async function reportFirebaseWrite(operation){
  try{
    await operation();
    return true;
  }catch(error){
    console.error('Firebase write failed:',error);
    toast(`บันทึก Firebase ไม่สำเร็จ: ${error.message}`,'error');
    return false;
  }
}

function readDataCache(){
  try{
    const raw=localStorage.getItem(DATA_CACHE_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(Object.prototype.hasOwnProperty.call(parsed,'settings')){
      delete parsed.settings;
      try{localStorage.setItem(DATA_CACHE_KEY,JSON.stringify(parsed))}
      catch(error){console.warn('Could not remove private settings from cache',error)}
    }
    return parsed && parsed.savedAt ? parsed : null;
  }catch(e){
    console.warn('readDataCache failed',e);
    return null;
  }
}
function writeDataCache(payload){
  try{
    const cachePayload={...payload,savedAt:Date.now()};
    delete cachePayload.settings;
    localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(cachePayload));
  }catch(e){
    console.warn('writeDataCache failed',e);
  }
}
function applyCachedData(cached){
  if(!cached) return false;
  if(Array.isArray(cached.machines) && cached.machines.length){
    MACHINES=cached.machines;
    sortMachinesById();
  }
  if(cached.pmCycles) pmCycles={...cached.pmCycles};
  if(Array.isArray(cached.pmRecords)) pmRecords=cached.pmRecords;
  if(Array.isArray(cached.issues)) issues=cached.issues;
  return true;
}
async function gsPost(action,payload,options={}){
  const {showToast=true}=options;
  const body=JSON.stringify({action,payload});

  // attempt 1: POST text/plain (ไม่ trigger CORS preflight)
  // attempt 2: GET via query string (fallback สำหรับ CORS ที่แน่นมาก)
  const attempts=[
    {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=UTF-8'},
      body
    },
    {
      method:'GET',
      url:`${GS_URL}?action=${encodeURIComponent(action)}&payload=${encodeURIComponent(JSON.stringify(payload))}`
    }
  ];

  let lastError=null;
  for(const attempt of attempts){
    const url=attempt.url||GS_URL;
    const fetchOpts=attempt.method==='GET'
      ? {method:'GET', cache:'no-store', redirect:'follow'}
      : {method:'POST', headers:attempt.headers, body:attempt.body, cache:'no-store', redirect:'follow'};

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    try{
      const res=await fetch(url,{...fetchOpts,signal:controller.signal});
      clearTimeout(timer);
      const text=await res.text();
      if(!res.ok){
        lastError=`HTTP ${res.status}: ${text}`;
        continue;
      }
      if(!text){ return true; }
      const normalized=text.trim().toLowerCase();
      if(normalized==='ok'||normalized==='success'||normalized==='true'||normalized==='done'){ return true; }
      let result=null;
      try{ result=JSON.parse(text); }catch(e){
        if(/error|invalid|failed|forbidden|not found|unauthorized|requires|permission/i.test(text)){
          lastError=text;
          continue;
        }
        return true;
      }
      if(result?.error || result?.success===false){
        lastError=String(result?.error||result?.message||JSON.stringify(result));
        continue;
      }
      return true;
    }catch(e){
      clearTimeout(timer);
      lastError=e.name==='AbortError' ? `timed out: ${action}` : String(e);
      console.warn(`gsPost attempt failed (${attempt.method}):`, lastError);
      continue;
    }
  }

  if(lastError){
    console.error('gsPost error:',lastError);
    if(showToast){
      toast('⚠️ เชื่อมต่อ Google Apps Script สำหรับการแจ้งเตือนไม่สำเร็จ กรุณาตรวจ URL / Deployment / Permissions','error');
    }
  }
  return false;
}

function savePMRecord(rec){
  rec.machineName=MACHINES.find(m=>m.id===rec.machineId)?.name||'';
  return reportFirebaseWrite(()=>saveFirebaseDocument('pmRecords',rec.id,rec));
}
function deletePMRecord(id){return reportFirebaseWrite(()=>deleteFirebaseDocument('pmRecords',id))}
function saveIssueRecord(iss){
  return reportFirebaseWrite(()=>saveFirebaseDocument('issues',iss.id,{...iss,severity:iss.severity}));
}
function deleteIssueRecord(id){return reportFirebaseWrite(()=>deleteFirebaseDocument('issues',id))}
function saveMachines(){
  sortMachinesById();
  const payload=MACHINES.map(m=>({...m,pmCycleDays:pmCycles[m.id]||30}));
  return reportFirebaseWrite(async()=>{
    const existing=await getFirebaseCollection('machines');
    const operations=[
      ...payload.map(machine=>({collection:'machines',id:machine.id,data:machine})),
      ...existing.filter(machine=>!payload.some(item=>String(item.id)===String(machine.id)))
        .map(machine=>({collection:'machines',id:machine.id,delete:true}))
    ];
    await writeFirebaseBatch(operations);
  });
}
function saveSettings(s){
  return reportFirebaseWrite(async()=>{
    if(!isSettingsAdmin()) throw new Error('ต้องเข้าสู่ระบบด้วย Gmail ผู้ดูแลก่อนบันทึกการตั้งค่า');
    const existing=await getFirebaseCollection('settings');
    const operations=[
      ...Object.entries(s).map(([key,value])=>({collection:'settings',id:key,data:{key,value}})),
      ...existing.filter(item=>!Object.prototype.hasOwnProperty.call(s,item.key||item.id))
        .map(item=>({collection:'settings',id:item.id,delete:true}))
    ];
    await writeFirebaseBatch(operations);
  });
}

function parseSeverity(v){
  if(v===null||v===undefined||v==='')return 1;
  const s=String(v).trim();
  const n=parseInt(s);
  if(n>=1&&n<=4)return n;
  const lower=s.toLowerCase();
  if(lower.includes('วิกฤต')||lower.includes('critical')||lower.includes('4'))return 4;
  if(lower.includes('รุนแรง')||lower.includes('high')||lower.includes('3'))return 3;
  if(lower.includes('ปานกลาง')||lower.includes('medium')||lower.includes('2'))return 2;
  if(lower.includes('เล็กน้อย')||lower.includes('low')||lower.includes('1'))return 1;
  return 1;
}

function validEmailRecipients(value){
  const recipients=String(value||'').split(',').map(v=>v.trim()).filter(Boolean);
  const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return recipients.length&&recipients.every(v=>email.test(v))?recipients:null;
}
function isValidEmail(str){
  const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email.test(String(str).trim());
}
function addEmailNotification(){
  const input=document.getElementById('email-new-input');if(!input)return;
  const value=input.value.trim();
  if(!value){toast('กรุณากรอกอีเมล','error');return}
  if(!isValidEmail(value)){toast('รูปแบบอีเมลไม่ถูกต้อง','error');return}

  const existing=validEmailRecipients(String(settings.emailRecipients||''))||[];
  if(existing.includes(value)){toast('อีเมลนี้มีอยู่แล้ว','error');return}

  existing.push(value);
  settings.emailRecipients=existing.join(', ');
  saveSettings(settings);
  renderEmailRecipientList();
  input.value='';
  input.focus();
  toast('เพิ่มอีเมลแล้ว','success');
}
function saveEmailSettings(){
  const recipients=validEmailRecipients(String(settings.emailRecipients||''))||[];
  const critical=document.getElementById('email-critical-toggle').checked;
  const overdue=document.getElementById('email-overdue-toggle').checked;
  const daily=document.getElementById('email-daily-toggle').checked;

  if(!recipients.length&&(critical||overdue||daily)){toast('กรุณาเพิ่มอีเมลอย่างน้อยหนึ่งตัว หรือปิดการแจ้งเตือนทั้งหมด','error');return}

  settings.emailCritical=critical;
  settings.emailOverdue=overdue;
  settings.emailDaily=daily;
  saveSettings(settings);
  const status=document.getElementById('email-notification-status');
  if(status)status.textContent=recipients.length?'✅ บันทึกแล้ว':'✅ ปิดการแจ้งเตือน';
  setTimeout(()=>{if(status)status.textContent=''},3000);
  toast(recipients.length?'บันทึกการตั้งค่าแล้ว':'ปิดการแจ้งเตือนแล้ว','success');
}
async function sendTestEmail(){
  const recipients=validEmailRecipients(String(settings.emailRecipients||''))||[];
  if(!recipients.length){toast('กรุณาเพิ่มอีเมลก่อนส่งทดสอบ','error');return}

  const status=document.getElementById('email-notification-status');
  if(status)status.textContent='📨 กำลังส่ง...';
  const ok=await gsPost('sendTestEmail',{recipients,subject:'[Hanger PM] ทดสอบการแจ้งเตือน',message:'อีเมลนี้ยืนยันว่าการแจ้งเตือน Hanger PM พร้อมใช้งานแล้ว'});
  if(status)status.textContent=ok?'✅ ส่งสำเร็จ':'❌ ส่งไม่สำเร็จ';
  setTimeout(()=>{if(status)status.textContent=''},3000);
  if(ok)toast('ส่งอีเมลทดสอบแล้ว ตรวจสอบกล่องจดหมายของคุณ','success');
}
function renderEmailRecipientList(){
  const el=document.getElementById('email-recipient-list');if(!el)return;
  const recipients=validEmailRecipients(String(settings.emailRecipients||''))||[];

  if(!recipients.length){
    el.innerHTML='<span style="font-size:12px;color:var(--muted);padding:16px;text-align:center;width:100%">ยังไม่มีผู้รับการแจ้งเตือน</span>';
    return;
  }

  el.innerHTML=recipients.map(email=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;font-size:12px">
    <span style="font-family:var(--mono);color:var(--text)">${escapeHtml(email)}</span>
    <button type="button" onclick="removeEmailNotification('${email.replace(/'/g,"\\'")}',event)" title="ลบ" style="border:0;background:none;color:var(--danger);cursor:pointer;font-size:16px;padding:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center">✕</button>
  </div>`).join('');
}

function parseLineGroupIds(value){
  if(!value) return [];
  return String(value).split(/[\n,;]+/).map(v=>v.trim()).filter(Boolean);
}
function normalizeLineGroupId(value){
  return String(value||'').trim();
}
function getLineGroupIds(){
  const explicit=parseLineGroupIds(settings.lineGroupIds||'');
  if(explicit.length){
    return explicit;
  }
  const legacy=[settings.lineGroupId,settings.lineGroupId2].filter(Boolean).join(', ');
  return [...new Set(parseLineGroupIds(legacy))];
}
function saveLineGroupIds(groupIds){
  const normalized=[...new Set(parseLineGroupIds(Array.isArray(groupIds)?groupIds.join(', '):String(groupIds||'')))];
  settings.lineGroupIds=normalized.join(', ');
  if(normalized.length){
    settings.lineGroupId=normalized[0]||'';
    settings.lineGroupId2=normalized[1]||'';
  } else {
    delete settings.lineGroupId;
    delete settings.lineGroupId2;
  }
}
function renderLineGroupList(){
  const el=document.getElementById('line-group-list');if(!el)return;
  const groups=getLineGroupIds();
  if(!groups.length){
    el.innerHTML='<span style="font-size:12px;color:var(--muted);padding:16px;text-align:center;width:100%">ยังไม่มี Group LINE ที่ตั้งค่า</span>';
    return;
  }
  el.innerHTML=groups.map(g=>{
    const rawGroup=String(g);
    const safeGroup=rawGroup.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;font-size:12px">
      <span style="font-family:var(--mono);color:var(--text)">${escapeHtml(rawGroup)}</span>
      <button type="button" onclick="removeLineGroup('${safeGroup}',event)" title="ลบ" style="border:0;background:none;color:var(--danger);cursor:pointer;font-size:16px;padding:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center">✕</button>
    </div>`;
  }).join('');
}
function addLineGroup(){
  const input=document.getElementById('line-new-group'); if(!input)return;
  const value=normalizeLineGroupId(input.value);
  if(!value){toast('กรุณากรอก Group ID ก่อนเพิ่ม','error');return}
  const groups=getLineGroupIds();
  if(groups.some(g=>normalizeLineGroupId(g)===value)){toast('Group ID นี้มีอยู่แล้ว','error');return}
  groups.push(value);
  saveLineGroupIds(groups);
  saveSettings(settings);
  renderLineGroupList();
  input.value='';
  input.focus();
  toast('เพิ่ม Group LINE แล้ว','success');
}
function removeLineGroup(group,event){
  event?.preventDefault();
  const normalizedGroup=normalizeLineGroupId(group);
  if(!normalizedGroup)return;
  if(!confirm(`ลบ Group LINE ${normalizedGroup}?`))return;
  const groups=getLineGroupIds().filter(g=>normalizeLineGroupId(g)!==normalizedGroup);
  saveLineGroupIds(groups);
  saveSettings(settings);
  renderLineGroupList();
  toast(`ลบ Group LINE ${normalizedGroup} แล้ว`,'success');
}

function removeEmailNotification(email,event){
  event?.preventDefault();
  if(!confirm(`ลบการแจ้งเตือนสำหรับ ${email}?`))return;
  const recipients=(validEmailRecipients(String(settings.emailRecipients||''))||[]).filter(v=>v!==email);
  settings.emailRecipients=recipients.join(', ');
  saveSettings(settings);
  renderEmailRecipientList();
  toast(`ลบ ${email} แล้ว`,'success');
}
function buildEmailPayloadVariants({type='custom', recipients, subject, message}){
  const normalizedRecipients=validEmailRecipients(String(recipients||''))||[];
  if(!normalizedRecipients.length) return [];
  const variants=[
    {type, recipients:normalizedRecipients, subject, message},
    {type:'custom', recipients:normalizedRecipients, subject, message},
    {type:'custom', to:normalizedRecipients, subject, body:message},
    {type:'custom', to:normalizedRecipients.join(','), subject, body:message},
    {recipients:normalizedRecipients, subject, message}
  ];
  return variants;
}
async function sendEmailNotificationWithFallback({type='custom', recipients, subject, message}){
  const variants=buildEmailPayloadVariants({type, recipients, subject, message});
  if(!variants.length) return false;
  for(const payload of variants){
    const ok=await gsPost('sendEmailNotification', payload, {showToast:false});
    if(ok) return true;
  }
  return await gsPost('sendTestEmail', {recipients:validEmailRecipients(String(recipients||''))||[], subject, message}, {showToast:false});
}
function buildIssueNotificationPayload(type, issue){
  const normalizedIssue={...issue};
  const sev=parseSeverity(normalizedIssue.severity);
  const sevLabel=['','เล็กน้อย','ปานกลาง','รุนแรง','วิกฤต'];
  const shortStatusText=type==='issueResolved' ? 'แก้ไขเสร็จแล้ว' : 'เกิดปัญหา';
  const detectedAt=normalizedIssue.reportedAt||normalizedIssue.date||new Date(normalizedIssue.ts||Date.now()).toISOString();
  const resolvedAt=normalizedIssue.closedAt||normalizedIssue.resolvedAt||normalizedIssue.reportedAt||new Date(normalizedIssue.ts||Date.now()).toISOString();
  const detectedDateTime=formatDateTime(detectedAt);
  const resolvedDateTime=formatDateTime(resolvedAt);
  const message=[
    `สถานะ: ${shortStatusText}`,
    `เครื่อง: ${normalizedIssue.machineName||'—'}`,
    `ประเภท: ${normalizedIssue.type||'—'}`,
    `ระดับ: ${sevLabel[sev]||'—'}`,
    `รายละเอียด: ${normalizedIssue.desc||'—'}`,
    `ตรวจพบ: ${detectedDateTime}`,
    type==='issueResolved' ? `แก้ไขแล้ว: ${resolvedDateTime}` : ''
  ].filter(Boolean).join('\n');
  return {
    subject:`[Hanger PM] ${shortStatusText} - ${normalizedIssue.machineName||'ระบบ'}`,
    message
  };
}
function getLineNotificationPayload(type, issue, groupIds, extra={}){
  const normalized=[...new Set(parseLineGroupIds(Array.isArray(groupIds)?groupIds.join(', '):String(groupIds||'')))];
  return {
    type,
    groupIds: normalized,
    subject: extra.subject||`[Hanger PM] ${type}`,
    message: extra.message||issue?.desc||'',
    groupId: normalized[0]||''
  };
}
async function sendLineNotificationWithFallback(type, issue, groupIds, extra={}){
  const payload=getLineNotificationPayload(type, issue, groupIds, extra);
  if(!payload.groupIds.length){
    console.warn('sendLineNotificationWithFallback: no groupIds found, skipping');
    return false;
  }

  console.log(`[LINE] Sending "${type}" to ${payload.groupIds.length} group(s):`, payload.groupIds);

  // ลองส่งทีละ group แยกกัน เพื่อให้แน่ใจว่าส่งครบทุก group
  const results = await Promise.allSettled(
    payload.groupIds.map(gid => {
      const singlePayload={...payload, groupIds:[gid], groupId:gid};
      console.log(`[LINE] → sending to group: ${gid}`);
      return gsPost('sendLineNotification', singlePayload, {showToast:false});
    })
  );

  const anyOk = results.some(r => r.status === 'fulfilled' && r.value === true);
  const allFailed = results.every(r => r.status !== 'fulfilled' || r.value !== true);

  console.log(`[LINE] Results:`, results.map((r,i)=>({group: payload.groupIds[i], ok: r.status==='fulfilled'&&r.value})));

  if(anyOk) return true;

  // fallback: ส่ง payload รวมทุก group ในครั้งเดียว
  if(allFailed){
    console.log('[LINE] All individual sends failed, trying bulk fallback...');
    const fallbackPayload={
      type,
      message: payload.message||issue?.desc||'',
      groupIds: payload.groupIds,
      groupId: payload.groupIds[0]||''
    };
    return await gsPost('sendTestLine', fallbackPayload, {showToast:false});
  }

  return false;
}
async function notifyCriticalIssue(issue){
  if(!issue.reportedAt) issue.reportedAt=new Date(issue.ts||Date.now()).toISOString();
  issue.reportedAtTime=formatTimeString(issue.reportedAt);
  issue.reportedAtDateTime=formatDateTime(issue.reportedAt);
  const enabled=settings.emailCritical==='true'||settings.emailCritical===true;
  const recipients=validEmailRecipients(String(settings.emailRecipients||''))||[];
  const notification=buildIssueNotificationPayload('criticalIssue', issue);
  const lineGroupIds=getLineGroupIds();
  const shouldSendEmail=enabled && recipients.length && parseSeverity(issue.severity)>=3;
  if(shouldSendEmail){
    await sendEmailNotificationWithFallback({type:'criticalIssue',recipients,subject:notification.subject,message:notification.message});
  }
  if(settings.lineChannelToken&&lineGroupIds.length){
    sendLineNotificationWithFallback('criticalIssue', issue, lineGroupIds, notification).catch(e=>console.error('LINE notify failed',e));
  }
}
function saveLineSettings(){
  const token=document.getElementById('line-channel-token')?.value.trim()||'';
  const enabled = token && getLineGroupIds().length;
  settings.lineChannelToken=token;
  saveLineGroupIds(getLineGroupIds());
  saveSettings(settings);
  const status=document.getElementById('line-notification-status'); if(status)status.textContent=enabled?'✅ บันทึกแล้ว':'✅ ปิดการแจ้งเตือน';
  setTimeout(()=>{if(status)status.textContent=''},3000);
  toast(enabled?'บันทึกการตั้งค่า LINE แล้ว':'ปิดการแจ้งเตือน LINE แล้ว','success');
}
async function notifyIssueResolved(issue){
  if(!issue.reportedAt) issue.reportedAt=new Date(issue.ts||Date.now()).toISOString();
  issue.reportedAtTime=formatTimeString(issue.reportedAt);
  issue.reportedAtDateTime=formatDateTime(issue.reportedAt);
  const resolvedAt=issue.closedAt||new Date().toISOString();
  issue.closedAt=issue.closedAt||resolvedAt;
  issue.resolvedAtTime=formatTimeString(resolvedAt);
  issue.resolvedAtDateTime=formatDateTime(resolvedAt);
  const recipients=validEmailRecipients(String(settings.emailRecipients||''))||[];
  const notification=buildIssueNotificationPayload('issueResolved', issue);
  const lineGroupIds=getLineGroupIds();
  if(recipients.length){
    await sendEmailNotificationWithFallback({type:'issueResolved',recipients,subject:notification.subject,message:notification.message});
  }
  if(settings.lineChannelToken&&lineGroupIds.length){
    sendLineNotificationWithFallback('issueResolved', issue, lineGroupIds, notification).catch(e=>console.error('LINE notify failed',e));
  }
}
async function sendTestLine(){
  const groupIds=getLineGroupIds();
  if(!settings.lineChannelToken||!groupIds.length){toast('กรุณากรอก Channel Token และ Group ID อย่างน้อยหนึ่งกลุ่มก่อนส่งทดสอบ','error');return}

  const status=document.getElementById('line-notification-status'); if(status)status.textContent='📨 กำลังส่ง...';

  console.log(`[LINE Test] Sending to ${groupIds.length} group(s):`, groupIds);

  // ส่งทีละ group พร้อมกัน (parallel) แล้วรอผลทุกกลุ่ม
  const results = await Promise.allSettled(
    groupIds.map(gid => {
      console.log(`[LINE Test] → group: ${gid}`);
      return gsPost('sendTestLine',{type:'test',message:'ทดสอบการแจ้งเตือนจาก Hanger',groupIds:[gid],groupId:gid});
    })
  );

  const successGroups = groupIds.filter((_,i) => results[i].status==='fulfilled' && results[i].value===true);
  const failGroups = groupIds.filter((_,i) => !(results[i].status==='fulfilled' && results[i].value===true));

  console.log('[LINE Test] Success:', successGroups);
  console.log('[LINE Test] Failed:', failGroups);

  const anyOk = successGroups.length > 0;
  const allOk = failGroups.length === 0;

  if(status){
    if(allOk) status.textContent=`✅ ส่งสำเร็จทั้ง ${groupIds.length} กลุ่ม`;
    else if(anyOk) status.textContent=`⚠️ ส่งสำเร็จ ${successGroups.length}/${groupIds.length} กลุ่ม`;
    else status.textContent='❌ ส่งไม่สำเร็จ';
  }
  setTimeout(()=>{if(status)status.textContent=''},4000);

  if(allOk) toast(`ส่งข้อความทดสอบ LINE แล้ว (${groupIds.length} กลุ่ม)`,'success');
  else if(anyOk) toast(`ส่งสำเร็จ ${successGroups.length}/${groupIds.length} กลุ่ม — ตรวจ Console สำหรับรายละเอียด`,'warn');
  else toast('ส่ง LINE ไม่สำเร็จ ตรวจ Console เพื่อดู error','error');
}
