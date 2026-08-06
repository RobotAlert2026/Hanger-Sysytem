const GS_URL='https://script.google.com/macros/s/AKfycbzdDUpDHE3wFSdxZEsxSX1IWuDkbGr9FS0sGfzcZYPGjDaOjGdvT5Zqn0DpQJ4E70lg/exec';
const DATA_CACHE_KEY='hanger-pm-cache-v1';
const DATA_CACHE_TTL_MS=5*60*1000;
const DEFAULT_FETCH_TIMEOUT_MS=15000;

function readDataCache(){
  try{
    const raw=localStorage.getItem(DATA_CACHE_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    return parsed && parsed.savedAt ? parsed : null;
  }catch(e){
    console.warn('readDataCache failed',e);
    return null;
  }
}
function writeDataCache(payload){
  try{
    localStorage.setItem(DATA_CACHE_KEY, JSON.stringify({...payload,savedAt:Date.now()}));
  }catch(e){
    console.warn('writeDataCache failed',e);
  }
}
function applyCachedData(cached){
  if(!cached) return false;
  if(Array.isArray(cached.machines) && cached.machines.length) MACHINES=cached.machines;
  if(cached.pmCycles) pmCycles={...cached.pmCycles};
  if(cached.settings) settings={...cached.settings};
  if(Array.isArray(cached.pmRecords)) pmRecords=cached.pmRecords;
  if(Array.isArray(cached.issues)) issues=cached.issues;
  return true;
}
function createFetchWithTimeout(url,options={},timeoutMs=DEFAULT_FETCH_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  return {
    promise: fetch(url,{...options,cache:'no-store',redirect:'follow',signal:controller.signal}),
    cancel: ()=>clearTimeout(timer)
  };
}
async function gsGet(action){
  const url=`${GS_URL}?action=${encodeURIComponent(action)}`;
  const req=createFetchWithTimeout(url,{},6000);
  try{
    const res=await req.promise;
    try{
      const data=await res.json();
      if(data && data.error){ console.error('gsGet error:',data.error); return [] }
      return Array.isArray(data)?data:(data.data||[]);
    }catch(e){
      console.error('gsGet parse/json failed:',e);
      return [];
    }
  }catch(e){
    if(e.name==='AbortError') console.error('gsGet timed out:',action);
    else console.error('gsGet failed:',e);
    if(window.location.protocol==='file:'){
      toast('⚠️ เปิดหน้าเว็บจากไฟล์ local (file://) ทำให้เรียก Google Apps Script ไม่ได้ กรุณาเปิดผ่านเว็บเซิร์ฟเวอร์ เช่น http://localhost:8000','error');
    }
    return [];
  } finally {
    req.cancel();
  }
}
async function gsPost(action,payload,options={}){
  const {showToast=true}=options;
  const body=JSON.stringify({action,payload});
  const attempts=[
    {headers:{'Content-Type':'application/json','Accept':'application/json'}, body},
    {headers:{'Content-Type':'text/plain;charset=UTF-8','Accept':'application/json'}, body}
  ];

  let lastError=null;
  for(const attempt of attempts){
    const req=createFetchWithTimeout(GS_URL,{method:'POST',headers:attempt.headers,body:attempt.body},6000);
    try{
      const res=await req.promise;
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
      lastError=e.name==='AbortError' ? `timed out: ${action}` : String(e);
      continue;
    } finally {
      req.cancel();
    }
  }

  if(lastError){
    console.error('gsPost error:',lastError);
    if(showToast){
      if(window.location.protocol==='file:'){
        toast('⚠️ เปิดหน้าเว็บจากไฟล์ local (file://) ทำให้เรียก Google Apps Script ไม่ได้ กรุณาเปิดผ่านเว็บเซิร์ฟเวอร์ เช่น http://localhost:8000','error');
      } else {
        toast('⚠️ ไม่สามารถเชื่อมต่อ Google Sheet ได้ กรุณาตรวจ URL Apps Script / Deployment / Permissions','error');
      }
    }
  }
  return false;
}

function loadData(){return[]}
function saveData(){}
function loadSettings(){return{}}

function savePMRecord(rec){
  rec.machineName=MACHINES.find(m=>m.id===rec.machineId)?.name||'';
  return gsPost('savePM',rec);
}
function deletePMRecord(id){return gsPost('deletePM',{id})}
function saveIssueRecord(iss){
  return gsPost('saveIssue',{...iss, saverity:iss.severity, severity:iss.severity},{showToast:false});
}
function deleteIssueRecord(id){return gsPost('deleteIssue',{id})}
function saveMachines(){
  const payload=MACHINES.map(m=>({...m,pmCycleDays:pmCycles[m.id]||30}));
  return gsPost('saveMachines',payload);
}
function saveSettings(s){return gsPost('saveSettings',s)}

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
  const lineOk=await gsPost('sendLineNotification', payload, {showToast:false});
  if(lineOk) return true;
  const fallbackPayload={
    type,
    message: payload.message||issue?.desc||'',
    groupIds: payload.groupIds||[],
    groupId: payload.groupId||''
  };
  return await gsPost('sendTestLine', fallbackPayload, {showToast:false});
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
  const ok=await gsPost('sendTestLine',{type:'test',message:'ทดสอบการแจ้งเตือนจาก Hanger PM',groupIds,groupId:groupIds[0]});
  if(status)status.textContent=ok?'✅ ส่งสำเร็จ':'❌ ส่งไม่สำเร็จ';
  setTimeout(()=>{if(status)status.textContent=''},3000);
  if(ok)toast('ส่งข้อความทดสอบ LINE แล้ว','success');
}
