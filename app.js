
// ══════════════════════════════════════════
// PM CHECKLIST
// ══════════════════════════════════════════
const PM_CHECKLIST=[
  'ตรวจสอบและทำความสะอาดทั่วไป เช็ดฝุ่น-คราบน้ำมัน-สิ่งสกปรกต่างๆ',
  'ตรวจสอบระบบหล่อลื่น ฉีดน้ำมันหล่อลื่นอัดจาระบีรางสไลค์ ลูกปืน',
  'ตรวจสอบระบบโซ่ ขึ้นลงปกติหรือมีเสียงหรือไม่',
  'ตรวจสอบระบบไฟฟ้าและสายไฟ เช็คจุดย้ำสายไฟแน่นหรือไม่',
  'ตรวจสอบ Encoder motor ด้านหน้า Front ปกติหรือหลวมหรือไม่',
  'ตรวจสอบ Encoder motor ด้านหลัง Rear ปกติหรือหลวมหรือไม่',
  'ตรวจสอบ Limit Sensor ด้านหน้าปกติหรือไม่',
  'ตรวจสอบ Limit Sensor ด้านหลังปกติหรือไม่',
  'ตรวจสอบ Motor ลอกยก ด้านหน้า Front ปกติหรือไม่ ',
  'ตรวจสอบ Motor ลอกยก ด้านหลัง Rear ปกติหรือไม่ ',
  'ตรวจสอบ X-Bar มีการชำรุดหรือมีรอยฉีกขาดหรือไม่',
  'ตรวจสอบ X-Bar น็อตยึด X Bar ทั้งหมดแน่นไม่มีหลวม',
  'ตรวจสอบ X-Bar อัดจารบีหรือใช้น้ำมันหล่อลื่นตามข้อต่อหรือบูทต่างๆ',
  'ตรวจสอบล้อ Roller ลูกปืนแตกหรือน็อตหลวมหรือไม่',
  'ตรวจสอบล้อ Roller เพลาขับน็อตหลวมหรือไม่',
  'ตรวจสอบน็อตสกรู ต้องแน่นทุกจุดและมาร์คทุกครั้ง',
  'ตรวจวัดและปรับระยะรู Pin Hanger หน้าและหลังให้อยู่ในมาตรฐาน',
  'ทดสอบการทำงานก่อนปล่อยรับรถ เลื่อนขึ้น-ลง ต้องไม่มี Alarm'
];

// ══════════════════════════════════════════
// STATE / UI HELPERS
// Shared UI state and helper functions are provided by Hanger PM System  Desktop.ui.js.
// ══════════════════════════════════════════

// ══════════════════════════════════════════
// DAYS SINCE LAST PM
// ══════════════════════════════════════════
function daysSinceLastPM(machineId){
  const recs=pmRecords.filter(r=>r.machineId===machineId);
  if(!recs.length)return null;
  const last=recs.sort((a,b)=>b.date.localeCompare(a.date))[0];
  return Math.floor((parseLocalDate(today())-parseLocalDate(last.date))/864e5);
}
function daysSinceTag(machineId){
  const days=daysSinceLastPM(machineId);
  const cycle=pmCycles[machineId]||30;
  if(days===null)return`<span class="days-since days-over">ไม่มีประวัติ</span>`;
  if(days===0)return`<span class="days-since days-today">✓ วันนี้</span>`;
  const cls=days>=cycle?'days-over':(days>=cycle*0.8?'days-warn':'days-ok');
  return`<span class="days-since ${cls}">📅 ${days}วัน</span>`;
}
function isOverdue(machineId){
  const days=daysSinceLastPM(machineId);
  if(days===null)return true;
  return days>=(pmCycles[machineId]||30);
}

// ══════════════════════════════════════════
// MACHINES GRID
// ══════════════════════════════════════════
function getShiftRecordsForDate(machineId,date){return pmRecords.filter(r=>r.machineId===machineId&&r.date===date)}
function getMachineOpenIssues(machineId){return issues.filter(i=>i.machineId===machineId&&i.status!=='closed')}
function filterMachines(v){searchTerm=v.toLowerCase();renderPMGrid()}
function filterMachinesByStatus(){statusFilter=document.getElementById('filterStatus').value;renderPMGrid()}
function getMonthRecordsForMachine(machineId,yearMonth){return pmRecords.filter(r=>r.machineId===machineId&&r.date.startsWith(yearMonth))}

function renderPMGrid(){
  const grid=document.getElementById('machine-pm-grid');if(!grid)return;
  const d=document.getElementById('pm-date-input')?.value||today();
  const ym=document.getElementById('pm-month-filter')?.value||d.slice(0,7);
  const dispEl=document.getElementById('pm-date-display');
  if(dispEl) dispEl.textContent=thaiDate(new Date(d+'T12:00:00'));

  let dayCount=0,nightCount=0;
  MACHINES.forEach(m=>{
    const recs=getShiftRecordsForDate(m.id,d);
    if(recs.some(r=>r.shift==='day')) dayCount++;
    if(recs.some(r=>r.shift==='night')) nightCount++;
  });
  const dEl=document.getElementById('pm-day-count');const nEl=document.getElementById('pm-night-count');
  if(dEl) dEl.textContent=`🌅 กะเช้า ${dayCount}`;
  if(nEl) nEl.textContent=`🌙 กะดึก ${nightCount}`;
  renderPMPendingSummary(ym);

  const machines=MACHINES.filter(m=>{
    if(searchTerm&&!m.name.toLowerCase().includes(searchTerm)) return false;
    const recs=getShiftRecordsForDate(m.id,d);
    const hasDay=recs.some(r=>r.shift==='day'),hasNight=recs.some(r=>r.shift==='night');
    const hasBoth=hasDay&&hasNight,hasIssue=getMachineOpenIssues(m.id).length>0;
    if(statusFilter==='day'&&!hasDay) return false;
    if(statusFilter==='night'&&!hasNight) return false;
    if(statusFilter==='both'&&!hasBoth) return false;
    if(statusFilter==='pending'&&(hasDay||hasNight)) return false;
    if(statusFilter==='issue'&&!hasIssue) return false;
    if(statusFilter==='overdue'&&!isOverdue(m.id)) return false;
    return true;
  });

  grid.innerHTML=machines.map(m=>{
    const recs=getShiftRecordsForDate(m.id,d);
    const hasDay=recs.some(r=>r.shift==='day'),hasNight=recs.some(r=>r.shift==='night');
    const hasBoth=hasDay&&hasNight,openIssues=getMachineOpenIssues(m.id),hasIssue=openIssues.length>0;
    const monthRecs=getMonthRecordsForMachine(m.id,ym),pmThisMonth=monthRecs.length>0;
    const pmDoneToday=hasDay||hasNight,overdue=isOverdue(m.id)&&!pmDoneToday;
    let cls=hasBoth?'pm-both':(hasDay?'pm-day':(hasNight?'pm-night':(hasIssue?'has-issue':'')));
    if(overdue) cls+=' overdue-card';
    let tags='';
    if(hasDay) tags+=`<span class="mtag mtag-day">🌅 วันนี้</span>`;
    if(hasNight) tags+=`<span class="mtag mtag-night">🌙 วันนี้</span>`;
    if(!pmDoneToday){
      if(pmThisMonth) tags+=`<span class="mtag" style="background:rgba(200,169,110,.14);color:var(--accent3)">✓ เดือนนี้</span>`;
      else tags+=hasIssue?`<span class="mtag mtag-issue">⚠</span>`:`<span class="mtag mtag-pending">รอ PM</span>`;
    }
    const monthCount=monthRecs.length;
    const countTag=monthCount>0?`<span style="font-size:10px;color:var(--muted);font-family:var(--mono)">${monthCount}ครั้ง</span>`:'';
    const dsTag=daysSinceTag(m.id);
    let badge=hasIssue?`<div class="issue-badge">${openIssues.length}</div>`:'';
    if(overdue) badge+=`<div style="position:absolute;bottom:7px;right:7px;font-size:9px;background:rgba(239,68,68,.18);color:var(--danger);padding:1px 5px;border-radius:3px;font-weight:700">เกินรอบ</div>`;
    return`<div class="machine-card ${cls}" data-machine-id="${m.id}"
      onclick="batchMode?toggleBatchSelect(${m.id},this):openPMModal(${m.id})"
      oncontextmenu="openMachineDetail(${m.id});return false"
      title="${escapeHtml(m.name)} — คลิกขวาเพื่อดูรายละเอียด">
      ${badge}
      <input type="checkbox" class="batch-chk" onclick="event.stopPropagation();toggleBatchSelect(${m.id},this.closest('.machine-card'))">
      <div class="mnum">#${String(m.id).padStart(2,'0')} · ${escapeHtml(m.model)}</div>
      <div class="mname">${escapeHtml(m.name)}</div>
      <div class="mfooter">${tags}${countTag}<div class="msdot"></div></div>
      <div style="margin-top:5px">${dsTag}</div>
    </div>`;
  }).join('');
}

function onPMMonthFilter(ym){
  if(ym){const inp=document.getElementById('pm-date-input');if(inp)inp.value=ym+'-01'}
  renderPMGrid();
}

function renderOverviewGrid(){
  const grid=document.getElementById('machine-overview-grid');if(!grid)return;
  const ym=currentOverviewMonth||today().slice(0,7);
  const st=(document.getElementById('overview-search')?.value||'').toLowerCase();
  const fv=document.getElementById('overview-filter')?.value||'all';
  let dayCount=0,nightCount=0;
  MACHINES.forEach(m=>{
    const recs=getMonthRecordsForMachine(m.id,ym);
    if(recs.some(r=>r.shift==='day')) dayCount++;
    if(recs.some(r=>r.shift==='night')) nightCount++;
  });
  const ovDay=document.getElementById('ov-day-count');const ovNight=document.getElementById('ov-night-count');const ovTotal=document.getElementById('ov-total-count');
  if(ovDay) ovDay.textContent=`🌅 ${dayCount}`;
  if(ovNight) ovNight.textContent=`🌙 ${nightCount}`;
  const filtered=MACHINES.filter(m=>{
    if(st&&!m.name.toLowerCase().includes(st)) return false;
    const recs=getMonthRecordsForMachine(m.id,ym);
    const hasDay=recs.some(r=>r.shift==='day'),hasNight=recs.some(r=>r.shift==='night');
    const hasIssue=getMachineOpenIssues(m.id).length>0;
    if(fv==='day'&&!hasDay) return false;
    if(fv==='night'&&!hasNight) return false;
    if(fv==='both'&&!(hasDay&&hasNight)) return false;
    if(fv==='pending'&&(hasDay||hasNight)) return false;
    if(fv==='issue'&&!hasIssue) return false;
    return true;
  });
  if(ovTotal) ovTotal.textContent=`${filtered.length}/${MACHINES.length} เครื่อง`;
  grid.innerHTML=filtered.map(m=>{
    const recs=getMonthRecordsForMachine(m.id,ym);
    const hasDay=recs.some(r=>r.shift==='day'),hasNight=recs.some(r=>r.shift==='night');
    const hasBoth=hasDay&&hasNight,openIssues=getMachineOpenIssues(m.id),hasIssue=openIssues.length>0;
    const pmDone=hasDay||hasNight,overdue=isOverdue(m.id)&&!pmDone;
    let cls=hasBoth?'pm-both':(hasDay?'pm-day':(hasNight?'pm-night':(hasIssue?'has-issue':'')));
    if(overdue) cls+=' overdue-card';
    let tags='';
    if(hasDay) tags+=`<span class="mtag mtag-day">🌅 PM แล้ว</span>`;
    if(hasNight) tags+=`<span class="mtag mtag-night">🌙 PM แล้ว</span>`;
    if(!pmDone) tags+=hasIssue?`<span class="mtag mtag-issue">⚠</span>`:`<span class="mtag mtag-pending">รอ PM</span>`;
    const monthCount=recs.length;
    const countTag=monthCount>0?`<span style="font-size:10px;color:var(--muted);font-family:var(--mono)">${monthCount}ครั้ง</span>`:'';
    const lastRec=recs.sort((a,b)=>b.date.localeCompare(a.date))[0];
    const lastInfo=lastRec?`<div style="font-size:10px;color:var(--muted);margin-top:3px">📅 ${fmt(lastRec.date)} · ${escapeHtml(lastRec.tech||'—')}</div>`:'';
    let badge=hasIssue?`<div class="issue-badge">${openIssues.length}</div>`:'';
    if(overdue) badge+=`<div style="position:absolute;bottom:7px;right:7px;font-size:9px;background:rgba(239,68,68,.18);color:var(--danger);padding:1px 5px;border-radius:3px;font-weight:700">เกินรอบ</div>`;
    const dsTag=daysSinceTag(m.id);
    return`<div class="machine-card ${cls}" onclick="openMachineDetail(${m.id})" style="cursor:pointer">
      ${badge}
      <div class="mnum">#${String(m.id).padStart(2,'0')} · ${escapeHtml(m.model)}</div>
      <div class="mname">${escapeHtml(m.name)}</div>
      <div class="mfooter">${tags}${countTag}<div class="msdot"></div></div>
      ${lastInfo}<div style="margin-top:3px">${dsTag}</div>
    </div>`;
  }).join('');
  if(!filtered.length) grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><div class="empty-text">ไม่พบเครื่องที่ตรงกัน</div></div>`;
}

function changeOverviewMonth(ym){
  currentOverviewMonth=ym;
  const [y,m]=ym.split('-');
  const label=new Date(parseInt(y),parseInt(m)-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});
  const lbl=document.getElementById('overview-month-label');if(lbl)lbl.textContent=label;
  renderOverviewGrid();
}

// ══════════════════════════════════════════
// PM MODAL
// ══════════════════════════════════════════
const PM_TECH_OPTIONS={
  'Shift A':['Phet','Preem','Kran','Beer','Sleep','Game','Dilok','Aek','Book','Aem','Mic'],
  'Shift B':['Goft','Tee','Keng','Tor','Guitar','Kaet','Mon','S','Coil','Non']
};
function parseTechSelection(value){return String(value||'').split(',').map(v=>v.trim()).filter(Boolean)}
function renderTechPicker(containerId, hiddenInputId, defaultValue=''){
  const container=document.getElementById(containerId);
  const hidden=document.getElementById(hiddenInputId);
  if(!container||!hidden)return;
  const allowed=[...new Set(Object.values(PM_TECH_OPTIONS).flat())];
  const selected=parseTechSelection(defaultValue).filter(v=>allowed.includes(v));
  container.innerHTML=Object.entries(PM_TECH_OPTIONS).map(([shift,names])=>`<div class="tech-group">
    <div class="tech-group-title">${shift}</div>
    <div class="tech-options">${names.map(name=>`<label class="tech-option"><input type="checkbox" value="${name}" ${selected.includes(name)?'checked':''}>${name}</label>`).join('')}</div>
  </div>`).join('');
  const sync=()=>{
    const checked=[...container.querySelectorAll('input[type="checkbox"]:checked')].map(cb=>cb.value);
    hidden.value=checked.join(', ');
  };
  container.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.addEventListener('change',sync));
  sync();
}

function openPMModal(machineId){
  currentMachineId=machineId;
  const m=MACHINES.find(x=>x.id===machineId);
  document.getElementById('modal-pm-machine-name').textContent=m.name;
  const d=document.getElementById('pm-date-input')?.value||today();
  document.getElementById('pm-entry-date').value=d;
  renderTechPicker('pm-tech-picker','pm-entry-tech', '');
  document.getElementById('pm-entry-note').value='';
  document.getElementById('pm-entry-has-issue').value='no';
  document.getElementById('pm-issue-section').style.display='none';
  selectShift('day');
  const cl=document.getElementById('pm-checklist');
  cl.innerHTML=PM_CHECKLIST.map((item,i)=>`
    <label class="chk-item" id="chk-label-${i}">
      <input type="checkbox" id="chk-${i}" onchange="updateChkProgress()">
      ${item}
    </label>`).join('');
  updateChkProgress();
  openModal('modal-pm');
}

function updateChkProgress(){
  const checked=PM_CHECKLIST.filter((_,i)=>document.getElementById(`chk-${i}`)?.checked).length;
  const lbl=document.getElementById('chk-progress-label');
  if(lbl) lbl.textContent=`${checked}/${PM_CHECKLIST.length}`;
  PM_CHECKLIST.forEach((_,i)=>{
    const lel=document.getElementById(`chk-label-${i}`);
    if(lel) lel.classList.toggle('checked',!!document.getElementById(`chk-${i}`)?.checked);
  });
}

async function savePMEntry(){
  const machineId=currentMachineId;
  const date=document.getElementById('pm-entry-date').value;
  const tech=document.getElementById('pm-entry-tech').value.trim()||'ไม่ระบุ';
  const note=document.getElementById('pm-entry-note').value.trim();
  const shift=selectedShift;
  const checkedItems=PM_CHECKLIST.filter((_,i)=>document.getElementById(`chk-${i}`)?.checked);
  const hasIssue=document.getElementById('pm-entry-has-issue').value==='yes';
  if(!date){toast('กรุณาระบุวันที่','error');return}
  const ym=date.slice(0,7);
  const monthRecs=getMonthRecordsForMachine(machineId,ym);
  const sameShiftThisMonth=monthRecs.filter(r=>r.shift===shift&&r.date!==date);
  if(sameShiftThisMonth.length>0){
    const lastDate=sameShiftThisMonth.sort((a,b)=>b.date.localeCompare(a.date))[0];
    const mName=MACHINES.find(m=>m.id===machineId)?.name;
    if(!confirm(`⚠️ ${mName} ทำ PM ${shiftLabel(shift)} ไปแล้วเดือนนี้\n(${fmt(lastDate.date)} โดย ${lastDate.tech})\n\nยืนยันบันทึกซ้ำ?`)) return;
  }
  const existIdx=pmRecords.findIndex(r=>r.machineId===machineId&&r.date===date&&r.shift===shift);
  const record={
    id:existIdx>=0?pmRecords[existIdx].id:uid(),
    machineId,date,shift,tech,note,
    checklist:checkedItems,checkedCount:checkedItems.length,totalItems:PM_CHECKLIST.length,ts:Date.now()
  };
  if(existIdx>=0) pmRecords[existIdx]=record; else pmRecords.push(record);
  void savePMRecord(record);
  if(hasIssue){
    const iss={
      id:uid(),machineId,machineName:MACHINES.find(m=>m.id===machineId).name,
      type:document.getElementById('pm-issue-type').value,
      severity:parseInt(document.getElementById('pm-issue-severity').value),
      desc:document.getElementById('pm-issue-desc').value.trim()||'พบปัญหาจากการทำ PM',
      status:'open',date,assignee:tech,shift,ts:Date.now(),reportedAt:new Date().toISOString()
    };
    issues.push(iss);
    void saveIssueRecord(iss).catch(e=>console.error('saveIssueRecord failed',e));
    void notifyCriticalIssue(iss).catch(e=>console.error('notifyCriticalIssue failed',e));
  }
  closeModal('modal-pm');
  renderPMGrid();updateBadges();updateSidebarStats();
  toast(`บันทึก PM ${MACHINES.find(m=>m.id===machineId).name} ${shiftLabel(shift)} สำเร็จ`);
}

// ══════════════════════════════════════════
// DELETE PM
// ══════════════════════════════════════════
function promptDeletePM(pmId){
  const rec=pmRecords.find(r=>r.id===pmId);if(!rec)return;
  pendingDeleteId=pmId;
  const m=MACHINES.find(x=>x.id===rec.machineId);
  document.getElementById('delete-pm-details').innerHTML=`
    <div>เครื่อง: <strong>${m?.name}</strong></div>
    <div>วันที่: <strong>${fmt(rec.date)}</strong></div>
    <div>กะ: <strong>${shiftLabel(rec.shift||'day')}</strong></div>
    <div>ช่าง: <strong>${rec.tech}</strong></div>`;
  openModal('modal-delete-pm');
}
function executeDeletePM(){
  if(!pendingDeleteId)return;
  deletePMRecord(pendingDeleteId);
  pmRecords=pmRecords.filter(r=>r.id!==pendingDeleteId);
  pendingDeleteId=null;
  closeModal('modal-delete-pm');
  renderHistory();renderPMGrid();updateBadges();updateSidebarStats();
  toast('ลบบันทึก PM แล้ว');
}

// ══════════════════════════════════════════
// ISSUES
// ══════════════════════════════════════════
function openIssueModal(machineId=null){
  editIssueId=null;
  document.getElementById('modal-issue-title').textContent='➕ เพิ่มปัญหา';
  const sel=document.getElementById('issue-machine');
  sel.innerHTML=machineOptions();
  if(machineId) sel.value=machineId;
  document.getElementById('issue-date').value=today();
  document.getElementById('issue-desc').value='';
  document.getElementById('issue-status-select').value='open';
  document.getElementById('issue-assignee').value='';
  openModal('modal-issue');
}
function openIssueEditModal(issueId){
  editIssueId=issueId;
  const iss=issues.find(i=>i.id===issueId);if(!iss)return;
  document.getElementById('modal-issue-title').textContent='✏️ แก้ไขปัญหา';
  const sel=document.getElementById('issue-machine');
  sel.innerHTML=machineOptions();
  sel.value=iss.machineId;
  document.getElementById('issue-date').value=iss.date;
  document.getElementById('issue-type').value=iss.type;
  document.getElementById('issue-severity').value=iss.severity;
  document.getElementById('issue-desc').value=iss.desc;
  document.getElementById('issue-status-select').value=iss.status;
  document.getElementById('issue-assignee').value=iss.assignee||'';
  openModal('modal-issue');
}
async function saveIssue(){
  const machineId=parseInt(document.getElementById('issue-machine').value);
  const m=MACHINES.find(x=>x.id===machineId);
  let reportedAt=new Date().toISOString();
  let previousClosedAt;
  if(editIssueId){
    const prev=issues.find(i=>i.id===editIssueId);
    if(prev){
      reportedAt=prev.reportedAt||new Date(prev.ts||Date.now()).toISOString();
      previousClosedAt=prev.closedAt;
    }
  }
  const iss={
    id:editIssueId||uid(),machineId,machineName:m.name,
    type:document.getElementById('issue-type').value,
    severity:parseInt(document.getElementById('issue-severity').value),
    desc:document.getElementById('issue-desc').value.trim(),
    status:document.getElementById('issue-status-select').value,
    date:document.getElementById('issue-date').value,
    assignee:document.getElementById('issue-assignee').value.trim(),
    ts:Date.now(),reportedAt,
  };
  if(iss.status==='closed'){
    iss.closedAt=previousClosedAt||new Date().toISOString();
  }
  if(!iss.desc){toast('กรุณากรอกรายละเอียดปัญหา','error');return}
  let wasClosed=false;
  let prevIssue=null;
  if(editIssueId){
    const idx=issues.findIndex(i=>i.id===editIssueId);
    if(idx>=0){
      prevIssue=issues[idx];
      wasClosed = prevIssue.status==='closed';
      issues[idx]=iss;
    } else {
      // editIssueId ไม่พบใน array (อาจถูกลบไปแล้ว) → เพิ่มใหม่แทน
      issues.push(iss);
    }
  } else {
    issues.push(iss);
  }
  void saveIssueRecord(iss).catch(e=>console.error('saveIssueRecord failed',e));
  const isClosingIssue = iss.status==='closed' && !wasClosed;
  const shouldNotifyCreate = !editIssueId || (prevIssue && prevIssue.status==='closed' && iss.status!=='closed');
  if(shouldNotifyCreate){
    void notifyCriticalIssue(iss).catch(e=>console.error('notifyCriticalIssue failed',e));
  }
  if(isClosingIssue){
    void notifyIssueResolved(iss).catch(e=>console.error('notifyIssueResolved failed',e));
  }
  closeModal('modal-issue');renderIssuesTable();updateBadges();updateSidebarStats();
  const toastMsg=editIssueId?'อัพเดทปัญหาแล้ว':'บันทึกปัญหาใหม่แล้ว';
  toast(toastMsg);
}
function quickSetIssueStatus(id,status){
  if(status==='closed'){
    const iss=issues.find(i=>i.id===id);if(!iss)return;
    const sev=parseSeverity(iss.severity);
    const sevLabel=['','เล็กน้อย','ปานกลาง','รุนแรง','วิกฤต'];
    const sevColor=['','var(--success)','var(--warn)','#f97316','var(--danger)'];
    document.getElementById('cc-machine').textContent=iss.machineName;
    document.getElementById('cc-type').textContent=iss.type;
    document.getElementById('cc-severity').innerHTML=`<span style="color:${sevColor[sev]};font-weight:700">ระดับ ${sev} — ${sevLabel[sev]}</span>`;
    document.getElementById('cc-desc').textContent=iss.desc||'—';
    document.getElementById('cc-confirm-btn').onclick=function(){
      const idx=issues.findIndex(i=>i.id===id);if(idx<0)return;
      issues[idx].status='closed';
      issues[idx].closedAt=new Date().toISOString();
      void saveIssueRecord(issues[idx]).catch(e=>console.error('saveIssueRecord failed',e));
      void notifyIssueResolved(issues[idx]).catch(e=>console.error('notifyIssueResolved failed',e));
      closeModal('modal-confirm-close');
      renderIssuesTable();renderRecentIssues();updateBadges();updateSidebarStats();renderCriticalBanner();
      toast('✅ ปิดปัญหาเรียบร้อยแล้ว');
    };
    openModal('modal-confirm-close');
    return;
  }
  const idx=issues.findIndex(i=>i.id===id);if(idx<0)return;
  issues[idx].status=status;
  saveIssueRecord(issues[idx]);
  renderIssuesTable();updateBadges();updateSidebarStats();
  toast(`อัพเดทสถานะเป็น "${status==='open'?'เปิดอยู่':'กำลังแก้'}" แล้ว`);
}
function deleteIssue(id){
  if(!confirm('ยืนยันลบรายการปัญหานี้?'))return;
  deleteIssueRecord(id);issues=issues.filter(i=>i.id!==id);
  renderIssuesTable();updateBadges();updateSidebarStats();toast('ลบรายการแล้ว');
}
function renderIssuesTable(){
  const tbody=document.getElementById('issues-tbody');if(!tbody)return;
  const mf=document.getElementById('issue-machine-filter');
  if(mf){const cur=mf.value;mf.innerHTML='<option value="all">ทุกเครื่อง</option>'+machineOptions();mf.value=cur}
  const mfv=document.getElementById('issue-machine-filter')?.value||'all';
  let filtered=issues.filter(i=>{
    if(issueFilterStatus!=='all'&&i.status!==issueFilterStatus) return false;
    if(mfv!=='all'&&i.machineId!==parseInt(mfv)) return false;
    return true;
  }).sort((a,b)=>b.ts-a.ts);
  const sevLabel=['','เล็กน้อย','ปานกลาง','รุนแรง','วิกฤต'];
  const sevColor=['','var(--success)','var(--warn)','#f97316','var(--danger)'];
  if(!filtered.length){tbody.innerHTML=`<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-text">ไม่พบรายการปัญหา</div></div></td></tr>`;return}
  tbody.innerHTML=filtered.map(i=>{
    const sev=parseSeverity(i.severity);
    const statMap={open:{lbl:'เปิดอยู่',cls:'badge-danger'},
      'in-progress':{lbl:'กำลังแก้',cls:'badge-warn'},
      closed:{lbl:'แก้แล้ว',cls:'badge-success'}};
    const st=statMap[i.status]||{lbl:i.status,cls:'badge-muted'};
    return`<tr>
      <td style="font-weight:700">${escapeHtml(i.machineName)}</td>
      <td><div style="max-width:260px">${escapeHtml(i.desc)}</div><div class="td-muted">${escapeHtml(i.type)}</div></td>
      <td><span style="color:${sevColor[sev]};font-weight:700;display:flex;align-items:center"><span class="sev-dot sev-${sev}"></span>${sevLabel[sev]}</span></td>
      <td class="td-muted">${fmt(i.date)}</td>
      <td class="td-muted">${escapeHtml(i.assignee||'—')}</td>
      <td><span class="badge ${st.cls}">${st.lbl}</span></td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-xs btn-secondary" onclick="openIssueEditModal('${i.id}')" title="แก้ไข">✏️</button>
        ${i.status!=='closed'?`<button class="btn btn-xs btn-success" onclick="quickSetIssueStatus('${i.id}','closed')" title="ทำเครื่องหมายว่าแก้แล้ว" style="padding:3px 8px">✅ แก้แล้ว</button>`:''}
        <button class="btn btn-xs btn-danger" onclick="deleteIssue('${i.id}')" title="ลบ">🗑</button>
      </div></td>
    </tr>`;
  }).join('');
}
function filterIssues(s,btn){
  issueFilterStatus=s;
  document.querySelectorAll('#issue-filter-tabs .tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');renderIssuesTable();
}
function populateIssueMachineFilter(){
  const sel=document.getElementById('issue-machine-filter');if(!sel)return;
  const cur=sel.value;
  sel.innerHTML='<option value="all">ทุกเครื่อง</option>'+machineOptions();
  sel.value=cur;
}

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════
function renderDashboard(){
  const d=today(),ym=d.slice(0,7);
  const todayRecs=pmRecords.filter(r=>r.date===d);
  const uniqueMachinesDay=new Set(todayRecs.filter(r=>r.shift==='day').map(r=>r.machineId)).size;
  const uniqueMachinesNight=new Set(todayRecs.filter(r=>r.shift==='night').map(r=>r.machineId)).size;
  const uniqueTotal=new Set(todayRecs.map(r=>r.machineId)).size;
  const openIssues=issues.filter(i=>i.status!=='closed');
  const overdueCount=MACHINES.filter(m=>isOverdue(m.id)).length;
  const techsToday=[...new Set(todayRecs.map(r=>r.tech).filter(Boolean))];

  document.getElementById('stat-today').textContent=uniqueTotal;
  document.getElementById('stat-today-pct').textContent=`วันนี้ ${Math.round(uniqueTotal/MACHINES.length*100)}%`;
  document.getElementById('stat-day-shift').textContent=uniqueMachinesDay;
  document.getElementById('stat-night-shift').textContent=uniqueMachinesNight;
  document.getElementById('stat-overdue').textContent=overdueCount;
  document.getElementById('stat-techs').textContent=techsToday.length;
  document.getElementById('stat-techs-names').textContent=techsToday.length?techsToday.join(', '):'ยังไม่มีข้อมูล';

  const pmBtn=document.getElementById('dash-pm-btn');
  if(pmBtn){
    const rem=MACHINES.length-uniqueTotal;
    pmBtn.textContent=rem>0?`➕ บันทึก PM (${uniqueTotal}/${MACHINES.length})`:`✅ PM ครบวันนี้แล้ว`;
    pmBtn.className=rem===0?'btn btn-success':'btn btn-primary';
  }
  document.getElementById('dash-date-display').textContent=thaiDate();
  document.getElementById('footer-date').textContent=thaiDate();

  const sel=document.getElementById('overview-month-select');
  if(sel&&!currentOverviewMonth){currentOverviewMonth=ym;sel.value=ym}

  renderDashboardShiftBadge();
  renderCriticalBanner();
  renderMonthProgress(ym);
  renderPendingAlert(ym,'pending-alert-wrap');
  renderDashboardPendingMachines(ym);
  renderDashboardSummary();
  renderDashboardPriorityIssues();
  renderOverviewGrid();
  renderWeeklyChart();
  renderIssueTypeChart();
  renderRecentIssues();
  updateBadges();
  updateSidebarStats();
}

function renderDashboardShiftBadge(){
  const now=new Date();
  const h=now.getHours(),m=now.getMinutes(),total=h*60+m;
  const isDay=total>=510&&total<1230;
  const badge=document.getElementById('dash-shift-badge');
  const remain=document.getElementById('dash-shift-remain');
  if(badge){badge.textContent=isDay?'🌅 กะเช้า':'🌙 กะดึก';badge.className=isDay?'shift-day':'shift-night';badge.style.fontSize='11px';badge.style.padding='2px 8px'}
  if(remain){let mins=isDay?(1230-total):(total>=1230?24*60-total+510:510-total);const rh=Math.floor(mins/60),rm=mins%60;remain.textContent=`สิ้นกะใน ${rh}ชม. ${String(rm).padStart(2,'0')}นาที`}
}

function renderDashboardPendingMachines(ym){
  const wrap=document.getElementById('dash-pending-machines-wrap');
  const label=document.getElementById('dash-pending-count-label');if(!wrap)return;
  const doneMachines=new Set(pmRecords.filter(r=>r.date.startsWith(ym)).map(r=>r.machineId));
  const pending=MACHINES.filter(m=>!doneMachines.has(m.id));
  if(label) label.textContent=pending.length>0?`${pending.length} เครื่อง`:'';
  if(!pending.length){wrap.innerHTML=`<div class="empty-state" style="width:100%;padding:12px 0"><div class="empty-icon" style="font-size:24px">✅</div><div class="empty-text">PM ครบทุกเครื่องแล้ว</div></div>`;return}
  wrap.innerHTML=pending.map(m=>{
    const ov=isOverdue(m.id),hasIssue=getMachineOpenIssues(m.id).length>0;
    const style=ov?'background:rgba(239,68,68,.1);color:var(--danger);border-color:rgba(239,68,68,.28)':hasIssue?'background:rgba(239,68,68,.06);color:var(--danger);border-color:rgba(239,68,68,.18)':'';
    return`<span class="pending-chip" style="${style}" onclick="showView('pm')" title="${m.model}${ov?' · เกินรอบ':''}">${ov?'⏰ ':hasIssue?'⚠️ ':''}${m.name}</span>`;
  }).join('');
}

function renderDashboardSummary(){
  const wrap=document.getElementById('dash-summary-wrap');if(!wrap)return;
  const d=today();
  const todayRecs=pmRecords.filter(r=>r.date===d);
  const todayCount=new Set(todayRecs.map(r=>r.machineId)).size;
  const openIssues=issues.filter(i=>i.status!=='closed').length;
  const overdueCount=MACHINES.filter(m=>isOverdue(m.id)).length;
  wrap.innerHTML=`
    <div style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface2)">
      <div style="font-size:12px;color:var(--muted)">วันนี้ทำ PM แล้ว</div>
      <div style="font-size:20px;font-weight:700;color:var(--accent)">${todayCount}/${MACHINES.length} เครื่อง</div>
    </div>
    <div style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface2)">
      <div style="font-size:12px;color:var(--muted)">ปัญหาค้างอยู่</div>
      <div style="font-size:18px;font-weight:700;color:${openIssues>0?'var(--danger)':'var(--success)'}">${openIssues} รายการ</div>
    </div>
    <div style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface2)">
      <div style="font-size:12px;color:var(--muted)">เครื่องเกินรอบ</div>
      <div style="font-size:18px;font-weight:700;color:${overdueCount>0?'var(--danger)':'var(--success)'}">${overdueCount} เครื่อง</div>
    </div>`;
}

function renderDashboardPriorityIssues(){
  const wrap=document.getElementById('dash-priority-issues-wrap');if(!wrap)return;
  const open=issues.filter(i=>i.status!=='closed').sort((a,b)=>parseSeverity(b.severity)-parseSeverity(a.severity)||b.ts-a.ts).slice(0,4);
  if(!open.length){wrap.innerHTML=`<div class="empty-state" style="padding:12px 0"><div class="empty-icon" style="font-size:24px">🎉</div><div class="empty-text">ไม่มีปัญหาค้างอยู่</div></div>`;return}
  wrap.innerHTML=open.map(i=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
    <div>
      <div style="font-size:13px;font-weight:700">${i.machineName}</div>
      <div style="font-size:12px;color:var(--muted)">${i.desc}</div>
    </div>
    <span style="font-size:11px;padding:3px 7px;border-radius:999px;background:rgba(239,68,68,.12);color:var(--danger);white-space:nowrap">${parseSeverity(i.severity)>=3?'เร่งด่วน':'ต้องตรวจ'}</span>
  </div>`).join('');
}

function renderWeeklyChart(){
  const labels=[],dayData=[],nightData=[];
  for(let i=6;i>=0;i--){
    const dt=new Date();dt.setDate(dt.getDate()-i);
    const k=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    labels.push(dt.toLocaleDateString('th-TH',{weekday:'short',day:'numeric'}));
    dayData.push(new Set(pmRecords.filter(r=>r.date===k&&r.shift==='day').map(r=>r.machineId)).size);
    nightData.push(new Set(pmRecords.filter(r=>r.date===k&&r.shift==='night').map(r=>r.machineId)).size);
  }
  const mc=chartMuted(),gc=chartGrid();
  destroyChart('chartWeekly');
  const ctx=document.getElementById('chartWeekly');if(!ctx)return;
  charts['chartWeekly']=new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[
      {label:'กะเช้า',data:dayData,backgroundColor:'rgba(251,191,36,.75)',borderRadius:4},
      {label:'กะดึก',data:nightData,backgroundColor:'rgba(129,140,248,.65)',borderRadius:4}
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:mc,font:{size:11}}}},
      scales:{x:{ticks:{color:mc},grid:{display:false}},y:{ticks:{color:mc,stepSize:1},grid:{color:gc}}}}
  });
}

function renderIssueTypeChart(){
  const wrap=document.getElementById('chartIssueTypeWrap');if(!wrap)return;
  const types={};issues.filter(i=>i.status!=='closed').forEach(i=>{types[i.type]=(types[i.type]||0)+1});
  if(!Object.keys(types).length){wrap.innerHTML=`<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">ไม่มีปัญหาค้าง</div></div>`;return}
  wrap.innerHTML='<canvas id="chartIssueType"></canvas>';
  const mc=chartMuted();
  destroyChart('chartIssueType');
  charts['chartIssueType']=new Chart(document.getElementById('chartIssueType'),{
    type:'doughnut',
    data:{labels:Object.keys(types),datasets:[{data:Object.values(types),backgroundColor:['#f5a623','#ef4444','#818cf8','#22c55e','#f97316','#a78bfa'],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:mc,font:{size:11}}}}}
  });
}

function renderRecentIssues(){
  const el=document.getElementById('recent-issues-list');if(!el)return;
  const open=issues.filter(i=>i.status!=='closed').sort((a,b)=>parseSeverity(b.severity)-parseSeverity(a.severity)||b.ts-a.ts).slice(0,5);
  if(!open.length){el.innerHTML=`<div class="empty-state" style="padding:16px"><div class="empty-icon" style="font-size:24px">🎉</div><div class="empty-text">ไม่มีปัญหาค้างอยู่</div></div>`;return}
  const sevColor=['','var(--success)','var(--warn)','#f97316','var(--danger)'];
  const sevLabel=['','เล็กน้อย','ปานกลาง','รุนแรง','วิกฤต'];
  el.innerHTML=open.map(i=>{const sev=parseSeverity(i.severity);return`<div style="display:flex;align-items:flex-start;gap:9px;padding:8px 0;border-bottom:1px solid var(--border)">
    <span class="sev-dot sev-${sev}" style="margin-top:5px;flex-shrink:0"></span>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:700">${i.machineName}</div>
      <div style="font-size:12px;color:${sevColor[sev]};font-weight:600">${sevLabel[sev]}</div>
      <div style="font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.desc}</div>
      <div style="font-size:11px;color:var(--muted)">${fmt(i.date)} · ${i.type}</div>
    </div>
    <button class="btn btn-xs btn-success" onclick="quickSetIssueStatus('${i.id}','closed')" title="คลิกเพือแก้ไขปัญหา">แก้ไข</button>
  </div>`}).join('');
}

function renderMonthProgress(ym){
  const total=MACHINES.length;
  const monthRecs=pmRecords.filter(r=>r.date.startsWith(ym));
  const done=new Set(monthRecs.map(r=>r.machineId)).size;
  const pct=Math.round(done/total*100);
  const fill=document.getElementById('month-progress-fill');
  const text=document.getElementById('month-progress-text');
  const doneEl=document.getElementById('month-progress-done');
  const leftEl=document.getElementById('month-progress-left');
  if(fill) fill.style.width=pct+'%';
  if(text) text.textContent=`${done}/${total} (${pct}%)`;
  if(doneEl) doneEl.textContent=`PM แล้ว ${done} เครื่อง`;
  if(leftEl){const left=total-done;leftEl.textContent=left>0?`เหลืออีก ${left} เครื่อง`:'✅ ครบทุกเครื่องแล้ว';leftEl.style.color=left>0?'var(--danger)':'var(--success)'}
}

function renderCriticalBanner(){
  const wrap=document.getElementById('critical-banner-wrap');if(!wrap)return;
  const criticals=issues.filter(i=>parseSeverity(i.severity)===4&&i.status!=='closed');
  if(!criticals.length){wrap.innerHTML='';return}
  wrap.innerHTML=`<div class="critical-banner">
    <div>
      <div class="critical-banner-title">🔴 ปัญหาวิกฤต ${criticals.length} รายการ — ต้องแก้ไขทันที!</div>
      <div class="critical-banner-list">${criticals.map(i=>`<span class="critical-tag" onclick="showView('issues')" title="${i.desc}">${i.machineName}: ${i.desc.slice(0,30)}${i.desc.length>30?'…':''}</span>`).join('')}</div>
    </div>
  </div>`;
}

function renderPendingAlert(ym,containerId){
  const el=document.getElementById(containerId);if(!el)return;
  const doneMachines=new Set(pmRecords.filter(r=>r.date.startsWith(ym)).map(r=>r.machineId));
  const pending=MACHINES.filter(m=>!doneMachines.has(m.id));
  if(!pending.length){el.innerHTML=`<div class="pending-alert"><div class="pending-alert-title">✅ PM ครบทุกเครื่องในเดือนนี้แล้ว</div></div>`;return}
  el.innerHTML=`<div class="pending-alert">
    <div class="pending-alert-title">⏳ ยังไม่ได้ PM เดือนนี้ — เหลืออีก ${pending.length} เครื่อง</div>
    <div class="pending-chips">${pending.map(m=>`<span class="pending-chip" onclick="showView('pm')">${m.name}</span>`).join('')}</div>
  </div>`;
}

function renderPMPendingSummary(ym){
  const wrap=document.getElementById('pm-pending-list-wrap');
  const countEl=document.getElementById('pm-pending-count');if(!wrap)return;
  const doneMachines=new Set(pmRecords.filter(r=>r.date.startsWith(ym)).map(r=>r.machineId));
  const pending=MACHINES.filter(m=>!doneMachines.has(m.id));
  if(countEl) countEl.textContent=pending.length>0?`⏳ ยังไม่ PM ${pending.length} เครื่อง`:'';
  if(!pending.length){wrap.innerHTML='';return}
  wrap.innerHTML=`<div class="pending-alert">
    <div class="pending-alert-title">⏳ เดือนนี้ยังไม่ได้ PM (${pending.length} เครื่อง)</div>
    <div class="pending-chips">${pending.map(m=>`<span class="pending-chip" onclick="openPMModal(${m.id})">${m.name}</span>`).join('')}</div>
  </div>`;
}

function updateBadges(){
  const openCount=issues.filter(i=>i.status!=='closed').length;
  const badge=document.getElementById('issue-badge');
  if(badge){badge.textContent=openCount;badge.style.display=openCount>0?'':'none'}
}

function updateSidebarStats(){
  const d=today(),ym=d.slice(0,7);
  const todayDone=new Set(pmRecords.filter(r=>r.date===d).map(r=>r.machineId)).size;
  const monthDone=new Set(pmRecords.filter(r=>r.date.startsWith(ym)).map(r=>r.machineId)).size;
  const overdueCount=MACHINES.filter(m=>isOverdue(m.id)).length;
  const openIssues=issues.filter(i=>i.status!=='closed').length;
  const t=MACHINES.length;
  const sbToday=document.getElementById('sb-today');
  const sbMonth=document.getElementById('sb-month');
  const sbOverdue=document.getElementById('sb-overdue');
  const sbIssues=document.getElementById('sb-issues');
  if(sbToday){sbToday.textContent=`${todayDone}/${t}`;sbToday.className=`ss-val ${todayDone===t?'ok':todayDone>0?'':'bad'}`}
  if(sbMonth){sbMonth.textContent=`${monthDone}/${t}`;sbMonth.className=`ss-val ${monthDone===t?'ok':monthDone>=t*0.8?'warn':'bad'}`}
  if(sbOverdue){sbOverdue.textContent=overdueCount;sbOverdue.className=`ss-val ${overdueCount===0?'ok':overdueCount>=3?'bad':'warn'}`}
  if(sbIssues){sbIssues.textContent=openIssues;sbIssues.className=`ss-val ${openIssues===0?'ok':openIssues>=3?'bad':'warn'}`}
}

// ══════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════
function renderAnalytics(){
  const pv=document.getElementById('analytics-period')?.value||'30';
  const cutoff=pv==='all'?null:(()=>{const c=new Date(Date.now()-parseInt(pv)*864e5);return`${c.getFullYear()}-${String(c.getMonth()+1).padStart(2,'0')}-${String(c.getDate()).padStart(2,'0')}`})();
  const fRecs=cutoff?pmRecords.filter(r=>r.date>=cutoff):pmRecords;
  const fIssues=cutoff?issues.filter(i=>i.date>=cutoff):issues;
  const days=new Set(fRecs.map(r=>r.date)).size||1;
  const avgPm=(fRecs.length/days).toFixed(1);
  document.getElementById('ana-avg').textContent=`${avgPm} รายการ`;
  const mi={};fIssues.forEach(i=>{mi[i.machineId]=(mi[i.machineId]||0)+1});
  const ti=Object.entries(mi).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('ana-top-issue').textContent=ti?`${MACHINES.find(m=>m.id==ti[0])?.name || '—'} (${ti[1]} ปัญหา)`:'—';
  const mp={};fRecs.forEach(r=>{mp[r.machineId]=(mp[r.machineId]||0)+1});
  const tp=Object.entries(mp).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('ana-top-pm').textContent=tp?`${MACHINES.find(m=>m.id==tp[0])?.name || '—'} (${tp[1]} ครั้ง)`:'—';
  const mc=chartMuted(),gc=chartGrid();
  const pmCounts=MACHINES.map(m=>fRecs.filter(r=>r.machineId===m.id).length);
  destroyChart('chartMachineBar');
  charts['chartMachineBar']=new Chart(document.getElementById('chartMachineBar'),{
    type:'bar',data:{labels:MACHINES.map(m=>`#${String(m.id).padStart(2,'0')}`),datasets:[{label:'PM ครั้ง',data:pmCounts,backgroundColor:'rgba(245,166,35,.75)',borderRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${MACHINES[c.dataIndex]?.name}: ${c.parsed.x} ครั้ง PM`}}},scales:{x:{ticks:{color:mc,stepSize:1},grid:{color:gc}},y:{ticks:{color:mc,font:{size:10}},grid:{display:false}}}}
  });
  const ic=MACHINES.map(m=>fIssues.filter(i=>i.machineId===m.id).length);
  destroyChart('chartIssueBar');
  charts['chartIssueBar']=new Chart(document.getElementById('chartIssueBar'),{
    type:'bar',data:{labels:MACHINES.map(m=>`#${String(m.id).padStart(2,'0')}`),datasets:[{label:'ปัญหา',data:ic,backgroundColor:'rgba(239,68,68,.6)',borderRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${MACHINES[c.dataIndex]?.name}: ${c.parsed.x} ปัญหา`}}},scales:{x:{ticks:{color:mc,stepSize:1},grid:{color:gc}},y:{ticks:{color:mc,font:{size:10}},grid:{display:false}}}}
  });
  const monthMap={day:{},night:{}};
  fRecs.forEach(r=>{const m=r.date.slice(0,7);const s=r.shift||'day';monthMap[s][m]=(monthMap[s][m]||0)+1});
  const allMonths=[...new Set([...Object.keys(monthMap.day),...Object.keys(monthMap.night)])].sort().slice(-12);
  destroyChart('chartMonthly');
  charts['chartMonthly']=new Chart(document.getElementById('chartMonthly'),{
    type:'line',
    data:{labels:allMonths.map(m=>{const p=m.split('-');return`${p[1]}/${p[0].slice(2)}`}),
      datasets:[
        {label:'กะเช้า',data:allMonths.map(m=>monthMap.day[m]||0),borderColor:'#fbbf24',backgroundColor:'rgba(251,191,36,.1)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#fbbf24'},
        {label:'กะดึก',data:allMonths.map(m=>monthMap.night[m]||0),borderColor:'#818cf8',backgroundColor:'rgba(129,140,248,.08)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#818cf8'}
      ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:mc,font:{size:11}}}},scales:{x:{ticks:{color:mc},grid:{display:false}},y:{ticks:{color:mc,stepSize:1},grid:{color:gc}}}}
  });
  const sc=[0,0,0,0];fIssues.forEach(i=>{const s=parseSeverity(i.severity);if(s>=1&&s<=4)sc[s-1]++});
  destroyChart('chartSeverity');
  charts['chartSeverity']=new Chart(document.getElementById('chartSeverity'),{
    type:'doughnut',
    data:{labels:['เล็กน้อย','ปานกลาง','รุนแรง','วิกฤต'],datasets:[{data:sc,backgroundColor:['#22c55e','#fbbf24','#f97316','#ef4444'],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:mc,font:{size:11}}}}}
  });
  const total=fRecs.length||1;
  document.getElementById('machine-completion-bars').innerHTML=MACHINES.map(m=>{
    const cnt=fRecs.filter(r=>r.machineId===m.id).length;
    const pct=Math.round(cnt/total*100);
    return`<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <div style="width:88px;font-size:11px;color:var(--muted);text-align:right;flex-shrink:0">${m.name}</div>
      <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${pct}%;background:${cnt>0?'var(--accent)':'var(--surface3)'}"></div></div>
      <div style="width:24px;font-size:11px;font-family:var(--mono);color:var(--text);text-align:right">${cnt}</div>
    </div>`;
  }).join('');
  renderComplianceChart(fRecs);
}

function renderComplianceChart(fRecs){
  const total=MACHINES.length;
  const monthMap={};
  fRecs.forEach(r=>{const m=r.date.slice(0,7);if(!monthMap[m])monthMap[m]=new Set();monthMap[m].add(r.machineId)});
  const months=Object.keys(monthMap).sort().slice(-12);
  if(!months.length){destroyChart('chartCompliance');return}
  const rates=months.map(m=>Math.round(monthMap[m].size/total*100));
  const mc=chartMuted(),gc=chartGrid();
  destroyChart('chartCompliance');
  const ctx=document.getElementById('chartCompliance');if(!ctx)return;
  charts['chartCompliance']=new Chart(ctx,{
    type:'line',
    data:{labels:months.map(m=>{const p=m.split('-');return`${p[1]}/${p[0].slice(2)}`}),
      datasets:[{label:'Compliance %',data:rates,borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,.1)',fill:true,tension:.4,pointRadius:5,pointBackgroundColor:'#22c55e',pointBorderColor:'#fff',pointBorderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.parsed.y}% (${monthMap[months[c.dataIndex]]?.size||0}/${total})`}}},
      scales:{x:{ticks:{color:mc},grid:{display:false}},y:{min:0,max:100,ticks:{color:mc,callback:v=>v+'%'},grid:{color:gc}}}}
  });
}

// ══════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════
function renderHistory(records){
  const tbody=document.getElementById('history-tbody');
  const empty=document.getElementById('history-empty');
  if(!tbody)return;
  let data=records||(pmRecords.slice().sort((a,b)=>{const dc=b.date.localeCompare(a.date);return dc!==0?dc:b.ts-a.ts}));
  if(!data.length){tbody.innerHTML='';if(empty)empty.style.display='';return}
  if(empty) empty.style.display='none';
  const countEl=document.getElementById('hist-count');
  if(countEl) countEl.textContent=`${data.length} รายการ`;
  tbody.innerHTML=data.map(r=>{
    const m=MACHINES.find(x=>x.id===r.machineId);
    const sb=r.shift==='night'?'<span class="badge badge-night">🌙 กะดึก</span>':'<span class="badge badge-day">🌅 กะเช้า</span>';
    const checklist=(r.checklist?.length?r.checklist:PM_CHECKLIST);
    const summaryItems=checklist.slice(0,2);
    const summaryText=summaryItems.join(' · ')+(checklist.length>2?' •••':'');
    const note=escapeHtml(r.note||'');
    const detailItems=checklist.map(item=>`<div class="history-detail-item">${escapeHtml(item)}</div>`).join('');
    return`<tr>
      <td class="td-muted">${fmt(r.date)}</td>
      <td>${sb}</td>
      <td style="font-weight:700">${m?.name||'?'}</td>
      <td>${escapeHtml(r.tech||'—')}</td>
      <td style="max-width:280px">
        <div class="history-summary">
          <div class="history-summary-text">${escapeHtml(summaryText||'—')}</div>
          <button type="button" class="history-expand-btn" onclick="toggleHistoryRow('${r.id}')" aria-expanded="false" aria-controls="history-detail-${r.id}">ดูรายละเอียด ▾</button>
          ${note?`<div class="history-note">📝 ${note}</div>`:''}
        </div>
      </td>
      <td><button type="button" class="btn btn-xs btn-danger" onclick="promptDeletePM('${r.id}')" aria-label="ลบรายการ PM">🗑</button></td>
    </tr>
    <tr class="history-detail-row" id="history-detail-${r.id}" style="display:none">
      <td colspan="6">
        <div class="history-detail-card">
          <div class="history-detail-label">รายการ PM / หมายเหตุ</div>
          <div class="history-detail-list">${detailItems||'<div class="history-detail-item">—</div>'}</div>
          ${note?`<div class="history-detail-label" style="margin-top:4px">หมายเหตุ</div><div class="history-note">📝 ${note}</div>`:''}
        </div>
      </td>
    </tr>`;
  }).join('');
}
function toggleHistoryRow(id){
  const row=document.getElementById(`history-detail-${id}`);
  if(!row)return;
  const btn=row.previousElementSibling?.querySelector('.history-expand-btn');
  const isOpen=getComputedStyle(row).display !== 'none';
  document.querySelectorAll('.history-detail-row').forEach(el=>{
    el.style.display='none';
    const otherBtn=el.previousElementSibling?.querySelector('.history-expand-btn');
    if(otherBtn){
      otherBtn.innerHTML='ดูรายละเอียด ▾';
      otherBtn.setAttribute('aria-expanded','false');
    }
  });
  if(isOpen){
    row.style.display='none';
    if(btn){
      btn.innerHTML='ดูรายละเอียด ▾';
      btn.setAttribute('aria-expanded','false');
    }
  }else{
    row.style.display='';
    if(btn){
      btn.innerHTML='ซ่อนรายละเอียด ▴';
      btn.setAttribute('aria-expanded','true');
    }
  }
}
function filterHistory(){
  const from=document.getElementById('hist-from').value;
  const to=document.getElementById('hist-to').value;
  const search=(document.getElementById('hist-search')?.value||'').toLowerCase().trim();
  const machineFilter=document.getElementById('hist-machine')?.value||'all';
  let data=pmRecords.slice().sort((a,b)=>{const dc=b.date.localeCompare(a.date);return dc!==0?dc:b.ts-a.ts});
  if(from) data=data.filter(r=>r.date>=from);
  if(to) data=data.filter(r=>r.date<=to);
  if(machineFilter!=='all') data=data.filter(r=>r.machineId===parseInt(machineFilter));
  if(search) data=data.filter(r=>{
    const m=MACHINES.find(x=>x.id===r.machineId);
    return(m?.name||'').toLowerCase().includes(search)||(r.tech||'').toLowerCase().includes(search)||(r.note||'').toLowerCase().includes(search);
  });
  renderHistory(data);
}
function clearHistoryFilter(){
  const s=document.getElementById('hist-search');if(s)s.value='';
  const m=document.getElementById('hist-machine');if(m)m.value='all';
  document.getElementById('hist-from').value='';
  document.getElementById('hist-to').value='';
  renderHistory();
}
function populateHistoryMachineFilter(){
  const sel=document.getElementById('hist-machine');if(!sel)return;
  const cur=sel.value;
  sel.innerHTML='<option value="all">ทุกเครื่อง</option>'+machineOptions();
  sel.value=cur;
}

// ══════════════════════════════════════════
// MACHINE DETAIL
// ══════════════════════════════════════════
function openMachineDetail(machineId){
  currentMachineId=machineId;
  const m=MACHINES.find(x=>x.id===machineId);
  document.getElementById('modal-machine-title').textContent=`⚙️ ${m.name} · ${m.model}`;
  renderMachineTab('pm');
  document.getElementById('machine-tab-pm').style.display='block';
  document.getElementById('machine-tab-issues').style.display='none';
  document.querySelectorAll('#modal-machine .tab-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  openModal('modal-machine');
}
function switchMachineTab(tab,btn){
  document.querySelectorAll('#modal-machine .tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('machine-tab-pm').style.display=tab==='pm'?'block':'none';
  document.getElementById('machine-tab-issues').style.display=tab==='issues'?'block':'none';
  renderMachineTab(tab);
}
function renderMachineTab(tab){
  const id=currentMachineId;
  if(tab==='pm'){
    const recs=pmRecords.filter(r=>r.machineId===id).sort((a,b)=>b.ts-a.ts).slice(0,15);
    const el=document.getElementById('machine-tab-pm');
    if(!recs.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">🔧</div><div class="empty-text">ยังไม่มีประวัติ PM</div></div>';return}
    const sc=r=>r.shift==='night'?'var(--night-color)':'var(--day-color)';
    el.innerHTML=`<div class="timeline">${recs.map(r=>`
      <div class="tl-item">
        <div class="tl-dot" style="border-color:${sc(r)};color:${sc(r)}">${r.shift==='night'?'🌙':'🌅'}</div>
        <div class="tl-body">
          <div class="tl-title">${fmt(r.date)} — ${r.tech}</div>
          <div class="tl-meta">${shiftLabel(r.shift||'day')} · ${r.checkedCount||0}/${r.totalItems||10} รายการ</div>
          ${r.note?`<div class="tl-note">${r.note}</div>`:''}
        </div>
      </div>`).join('')}</div>`;
  } else {
    const mIss=issues.filter(i=>i.machineId===id).sort((a,b)=>b.ts-a.ts);
    const el=document.getElementById('machine-tab-issues');
    if(!mIss.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">ไม่มีปัญหาบันทึก</div></div>';return}
    const sl={open:'⭕','in-progress':'🔄',closed:'✅'};
    const sevLabel=['','เล็กน้อย','ปานกลาง','รุนแรง','วิกฤต'];
    const sevColor=['','var(--success)','var(--warn)','#f97316','var(--danger)'];
    el.innerHTML=`<div class="timeline">${mIss.map(i=>{const sev=parseSeverity(i.severity);return`
      <div class="tl-item">
        <div class="tl-dot">${sl[i.status]||'?'}</div>
        <div class="tl-body">
          <div class="tl-title" style="color:${sevColor[sev]}">${i.type} · ระดับ ${sev} — ${sevLabel[sev]}</div>
          <div class="tl-meta">${fmt(i.date)}</div>
          <div class="tl-note">${i.desc}</div>
        </div>
      </div>`}).join('')}</div>`;
  }
}
function openPMFromDetail(){closeModal('modal-machine');openPMModal(currentMachineId)}
function openIssueFromDetail(){closeModal('modal-machine');openIssueModal(currentMachineId)}

// ══════════════════════════════════════════
// BATCH MODE
// ══════════════════════════════════════════
function toggleBatchMode(){
  batchMode=!batchMode;batchSelected.clear();
  const bar=document.getElementById('batch-bar');const grid=document.getElementById('machine-pm-grid');
  if(bar) bar.classList.toggle('show',batchMode);
  if(grid) grid.classList.toggle('batch-mode',batchMode);
  const btn=document.getElementById('batch-toggle-btn');
  if(btn) btn.textContent=batchMode?'✕ ยกเลิก':'☑️ เลือกหลายเครื่อง';
  if(batchMode) btn.className='btn btn-secondary active-btn';
  else btn.className='btn btn-secondary';
  updateBatchCount();
}
function toggleBatchSelect(machineId,cardEl){
  if(batchSelected.has(machineId)){batchSelected.delete(machineId);cardEl.classList.remove('batch-selected');const chk=cardEl.querySelector('.batch-chk');if(chk)chk.checked=false}
  else{batchSelected.add(machineId);cardEl.classList.add('batch-selected');const chk=cardEl.querySelector('.batch-chk');if(chk)chk.checked=true}
  updateBatchCount();
}
function updateBatchCount(){const lbl=document.getElementById('batch-count-label');if(lbl)lbl.textContent=`เลือก ${batchSelected.size} เครื่อง`}
function batchSelectAll(){
  const grid=document.getElementById('machine-pm-grid');if(!grid)return;
  grid.querySelectorAll('.machine-card').forEach(card=>{
    const id=parseInt(card.getAttribute('data-machine-id'));if(!id)return;
    batchSelected.add(id);card.classList.add('batch-selected');const chk=card.querySelector('.batch-chk');if(chk)chk.checked=true;
  });updateBatchCount();
}
function batchClear(){
  const grid=document.getElementById('machine-pm-grid');if(!grid)return;
  grid.querySelectorAll('.machine-card').forEach(card=>{card.classList.remove('batch-selected');const chk=card.querySelector('.batch-chk');if(chk)chk.checked=false});
  batchSelected.clear();updateBatchCount();
}
function openBatchPMModal(){
  if(!batchSelected.size){toast('กรุณาเลือกเครื่องก่อน','error');return}
  const names=MACHINES.filter(m=>batchSelected.has(m.id)).map(m=>m.name).join(', ');
  document.getElementById('batch-machine-list').textContent=names;
  document.getElementById('batch-date').value=document.getElementById('pm-date-input')?.value||today();
  renderTechPicker('batch-tech-picker','batch-tech', '');
  document.getElementById('batch-note').value='';
  selectBatchShift('day');
  openModal('modal-batch-pm');
}
function saveBatchPM(){
  const date=document.getElementById('batch-date').value;
  const tech=document.getElementById('batch-tech').value.trim()||'ไม่ระบุ';
  const note=document.getElementById('batch-note').value.trim();
  if(!date){toast('กรุณาระบุวันที่','error');return}
  let count=0;
  batchSelected.forEach(machineId=>{
    const existIdx=pmRecords.findIndex(r=>r.machineId===machineId&&r.date===date&&r.shift===batchShift);
    const rec={id:existIdx>=0?pmRecords[existIdx].id:uid(),machineId,date,shift:batchShift,tech,note,checklist:[],checkedCount:0,totalItems:PM_CHECKLIST.length,ts:Date.now()};
    if(existIdx>=0)pmRecords[existIdx]=rec;else pmRecords.push(rec);
    savePMRecord(rec);count++;
  });
  closeModal('modal-batch-pm');toggleBatchMode();
  renderPMGrid();updateBadges();updateSidebarStats();
  toast(`บันทึก PM ${count} เครื่อง (${shiftLabel(batchShift)}) สำเร็จ`);
}

// ══════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════
function toggleExpMonthPicker(v){const wrap=document.getElementById('exp-month-wrap');if(wrap)wrap.style.display=v==='month'?'flex':'none'}
function getExpMonth(){return document.getElementById('exp-month')?.value||today().slice(0,7)}
function getPeriodFilter(p){
  const d=today();
  if(p==='today')return r=>r.date===d;
  if(p==='week'){const wd=new Date(Date.now()-7*864e5);const w=`${wd.getFullYear()}-${String(wd.getMonth()+1).padStart(2,'0')}-${String(wd.getDate()).padStart(2,'0')}`;return r=>r.date>=w}
  if(p==='month')return r=>r.date.startsWith(getExpMonth());
  return()=>true;
}
function toCSV(rows,headers,thaiHeaders){
  return'\uFEFF'+(thaiHeaders||headers).join(',')+'\n'+rows.map(r=>headers.map(k=>`"${String(r[k]||'').replace(/"/g,'""')}"`).join(',')).join('\n');
}
function download(content,filename,type){
  const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},100);
}
function exportCSV(type){
  const sevLabel=['','เล็กน้อย','ปานกลาง','รุนแรง','วิกฤต'];
  const statusLabel={open:'เปิดอยู่','in-progress':'กำลังแก้ไข',closed:'แก้ไขแล้ว'};
  if(type==='pm'){
    const p=document.getElementById('exp-period')?.value||'all';
    const data=pmRecords.filter(getPeriodFilter(p)).map(r=>({
      date:r.date,shift:r.shift==='night'?'กะดึก':'กะเช้า',
      machine:MACHINES.find(m=>m.id===r.machineId)?.name||r.machineId,
      tech:r.tech,checklist:r.checklist?.join(' | ')||'',note:r.note||''
    }));
    const keys=['date','shift','machine','tech','checklist','note'];
    const thaiKeys=['วันที่','กะ','เครื่อง','ช่าง','รายการ PM','หมายเหตุ'];
    download(toCSV(data,keys,thaiKeys),`pm-records-${today()}.csv`,'text/csv;charset=utf-8');
  } else {
    const st=document.getElementById('exp-issue-status')?.value||'all';
    const data=(st==='all'?issues:issues.filter(i=>i.status===st)).map(i=>({
      date:i.date,machine:i.machineName,type:i.type,severity:sevLabel[parseSeverity(i.severity)]||i.severity,
      desc:i.desc,status:statusLabel[i.status]||i.status,assignee:i.assignee||''
    }));
    const keys=['date','machine','type','severity','desc','status','assignee'];
    const thaiKeys=['วันที่พบ','เครื่อง','ประเภทปัญหา','ความรุนแรง','รายละเอียด','สถานะ','ผู้รับผิดชอบ'];
    download(toCSV(data,keys,thaiKeys),`issues-${today()}.csv`,'text/csv;charset=utf-8');
  }
  toast('ส่งออก CSV สำเร็จ');
}
function exportJSON(type){
  if(type==='pm'){const p=document.getElementById('exp-period')?.value||'all';download(JSON.stringify(pmRecords.filter(getPeriodFilter(p)),null,2),`pm-records-${today()}.json`,'application/json')}
  else{const st=document.getElementById('exp-issue-status')?.value||'all';download(JSON.stringify(st==='all'?issues:issues.filter(i=>i.status===st),null,2),`issues-${today()}.json`,'application/json')}
  toast('ส่งออก JSON สำเร็จ');
}
function exportHTMLReport(){
  const d=today();const tp=pmRecords.filter(r=>r.date===d);const oi=issues.filter(i=>i.status!=='closed');
  const html=`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>PM Report ${fmt(d)}</title>
<style>body{font-family:'Sarabun',sans-serif;padding:28px;color:#1a1a1a;background:#f9f9f9}h1{margin-bottom:4px}h2{margin:20px 0 8px;border-bottom:2px solid #eee;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:16px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:13px}th{background:#f5f5f5;font-weight:600}.day{background:#fef9c3;color:#854d0e}.night{background:#ede9fe;color:#4c1d95}</style>
</head><body>
<h1>รายงาน PM Hanger</h1><p style="color:#666">${thaiDate(new Date(d+'T12:00:00'))} | สร้างเมื่อ ${new Date().toLocaleString('th-TH')}</p>
<h2>สรุปวันนี้</h2>
<p>PM รวม: ${new Set(tp.map(r=>r.machineId)).size}/${MACHINES.length} | กะเช้า: ${new Set(tp.filter(r=>r.shift==='day').map(r=>r.machineId)).size} | กะดึก: ${new Set(tp.filter(r=>r.shift==='night').map(r=>r.machineId)).size} | ปัญหาค้าง: ${oi.length}</p>
<h2>PM วันนี้</h2>
<table><tr><th>เครื่อง</th><th>กะ</th><th>ช่าง</th><th>รายการ</th><th>หมายเหตุ</th></tr>
${tp.map(r=>`<tr><td>${MACHINES.find(m=>m.id===r.machineId)?.name}</td><td class="${r.shift||'day'}">${r.shift==='night'?'🌙 กะดึก':'🌅 กะเช้า'}</td><td>${r.tech}</td><td>${r.checkedCount||0}/${r.totalItems||10}</td><td>${r.note||'—'}</td></tr>`).join('')}
</table><h2>ปัญหาค้าง</h2>
<table><tr><th>เครื่อง</th><th>ปัญหา</th><th>ระดับ</th><th>วันที่พบ</th><th>สถานะ</th></tr>
${oi.map(i=>{const sev=parseSeverity(i.severity);const sl=['','เล็กน้อย','ปานกลาง','รุนแรง','วิกฤต'];return`<tr><td>${i.machineName}</td><td>${i.desc}</td><td>${sl[sev]}</td><td>${fmt(i.date)}</td><td>${i.status}</td></tr>`}).join('')}
</table></body></html>`;
  download(html,`pm-report-${d}.html`,'text/html');toast('ส่งออก HTML Report สำเร็จ');
}

// ══════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════
function renderSettingsPage(){
  const tbody=document.getElementById('settings-machines-tbody');if(!tbody)return;
  const ym=today().slice(0,7);
  tbody.innerHTML=MACHINES.map(m=>{
    const monthCount=pmRecords.filter(r=>r.machineId===m.id&&r.date.startsWith(ym)).length;
    const badge=monthCount>0?`<span class="badge badge-success">${monthCount} ครั้ง</span>`:`<span class="badge badge-muted">ยังไม่ PM</span>`;
    const lastRec=pmRecords.filter(r=>r.machineId===m.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
    const lastDate=lastRec?`<span style="font-size:11px;color:var(--muted)">${fmt(lastRec.date)}</span>`:`<span style="font-size:11px;color:var(--danger)">ไม่มีข้อมูล</span>`;
    const ov=isOverdue(m.id)?`<span style="font-size:10px;background:rgba(239,68,68,.13);color:var(--danger);padding:1px 5px;border-radius:3px;margin-left:4px">เกินรอบ</span>`:'';
    return`<tr>
      <td style="color:var(--muted);font-family:var(--mono)">#${String(m.id).padStart(2,'0')}</td>
      <td style="font-weight:700">${m.name}</td>
      <td style="color:var(--muted)">${m.model}</td>
      <td>${badge}</td>
      <td>${lastDate}${ov}</td>
      <td style="text-align:center;font-family:var(--mono);font-weight:700">${pmCycles[m.id]||30} วัน</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-xs btn-secondary" onclick="openEditMachineModal(${m.id})">✏️</button>
        ${MACHINES.length>1?`<button class="btn btn-xs btn-danger" onclick="deleteMachine(${m.id})">🗑</button>`:''}
      </div></td>
    </tr>`;
  }).join('');
  renderPMCycleSettings();
  const critical=document.getElementById('email-critical-toggle');if(critical)critical.checked=settings.emailCritical==='true'||settings.emailCritical===true;
  const overdue=document.getElementById('email-overdue-toggle');if(overdue)overdue.checked=settings.emailOverdue==='true'||settings.emailOverdue===true;
  const daily=document.getElementById('email-daily-toggle');if(daily)daily.checked=settings.emailDaily==='true'||settings.emailDaily===true;
  const newEmailInput=document.getElementById('email-new-input');if(newEmailInput)newEmailInput.value='';
  renderEmailRecipientList();
  // LINE settings
  const lineTokenEl = document.getElementById('line-channel-token'); if(lineTokenEl) lineTokenEl.value = settings.lineChannelToken || '';
  const lineNewGroupInput=document.getElementById('line-new-group'); if(lineNewGroupInput) lineNewGroupInput.value='';
  renderLineGroupList();
}
function renderPMCycleSettings(){
  const grid=document.getElementById('pm-cycle-settings-grid');if(!grid)return;
  grid.innerHTML=MACHINES.map(m=>`
    <div class="pm-cycle-row">
      <span>#${String(m.id).padStart(2,'0')} ${m.name}</span>
      <input type="number" class="form-control" style="width:65px;padding:4px 7px;font-size:12px" min="1" max="365"
        value="${pmCycles[m.id]||30}" onchange="setPMCycle(${m.id},this.value)">
      <span style="font-size:11px;color:var(--muted)">วัน</span>
    </div>`).join('');
}
function setPMCycle(machineId,val){pmCycles[machineId]=Math.max(1,Math.min(365,parseInt(val)||30));savePMCycles()}
function applyGlobalCycle(){
  const val=parseInt(document.getElementById('global-cycle-input').value)||30;
  MACHINES.forEach(m=>{pmCycles[m.id]=val});savePMCycles();renderPMCycleSettings();
  toast(`ตั้งรอบ PM ${val} วัน ให้ทุกเครื่องแล้ว`);
}
function openEditMachineModal(machineId){
  const m=MACHINES.find(x=>x.id===machineId);if(!m)return;
  document.getElementById('modal-edit-machine-title').textContent=`✏️ แก้ไข — ${m.name}`;
  document.getElementById('edit-machine-id').value=machineId;
  document.getElementById('edit-machine-name').value=m.name;
  document.getElementById('edit-machine-model').value=m.model;
  openModal('modal-edit-machine');
}
function openAddMachineModal(){
  document.getElementById('modal-edit-machine-title').textContent='➕ เพิ่มเครื่องใหม่';
  document.getElementById('edit-machine-id').value='new';
  document.getElementById('edit-machine-name').value='';
  document.getElementById('edit-machine-model').value='';
  openModal('modal-edit-machine');
}
function saveMachineEdit(){
  const idVal=document.getElementById('edit-machine-id').value;
  const name=document.getElementById('edit-machine-name').value.trim();
  const model=document.getElementById('edit-machine-model').value.trim();
  if(!name){toast('กรุณากรอกชื่อเครื่อง','error');return}
  if(idVal==='new'){
    const newId=Math.max(...MACHINES.map(m=>m.id),0)+1;
    MACHINES.push({id:newId,name,model:model||`HNG-${newId*5}`});
    saveMachines();closeModal('modal-edit-machine');renderSettingsPage();toast(`เพิ่มเครื่อง "${name}" แล้ว`);
  } else {
    const id=parseInt(idVal),idx=MACHINES.findIndex(m=>m.id===id);if(idx<0)return;
    MACHINES[idx]={...MACHINES[idx],name,model:model||MACHINES[idx].model};
    issues.forEach(iss=>{if(iss.machineId===id){iss.machineName=name;saveIssueRecord(iss)}});
    saveMachines();closeModal('modal-edit-machine');renderSettingsPage();toast(`อัพเดทชื่อเป็น "${name}" แล้ว`);
  }
}
function deleteMachine(machineId){
  const m=MACHINES.find(x=>x.id===machineId);if(!m)return;
  const pmCount=pmRecords.filter(r=>r.machineId===machineId).length;
  const issCount=issues.filter(i=>i.machineId===machineId).length;
  let msg=`ลบเครื่อง "${m.name}"?`;
  if(pmCount||issCount) msg+=`\n⚠️ มีข้อมูล PM ${pmCount} รายการ ปัญหา ${issCount} รายการ`;
  if(!confirm(msg))return;
  MACHINES=MACHINES.filter(x=>x.id!==machineId);saveMachines();renderSettingsPage();toast(`ลบเครื่อง "${m.name}" แล้ว`);
}
function resetMachinesToDefault(){
  if(!confirm('รีเซ็ตชื่อเครื่องทั้งหมดกลับเป็นค่าเริ่มต้น?'))return;
  MACHINES=DEFAULT_MACHINES.map(m=>({...m}));MACHINES.forEach(m=>{pmCycles[m.id]=30});
  saveMachines();renderSettingsPage();toast('รีเซ็ตเป็น Hanger 01–20 แล้ว');
}
function validEmailRecipients(value){
  const recipients=value.split(',').map(v=>v.trim()).filter(Boolean);
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
  const statusText=type==='issueResolved' ? 'แก้ไขแล้ว' : 'กำลังเกิดปัญหา';
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

// ══════════════════════════════════════════
// CSV IMPORT
// ══════════════════════════════════════════
function parseCSVLine(line){
  const result=[];let cur='';let inQ=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++}else inQ=!inQ}
    else if(c===','&&!inQ){result.push(cur.trim());cur=''}else cur+=c;
  }result.push(cur.trim());return result;
}
function parseCSV(text){
  const clean=text.replace(/^\uFEFF/,'');const lines=clean.split(/\r?\n/).filter(l=>l.trim());
  if(lines.length<2)return{headers:[],rows:[]};
  const headers=parseCSVLine(lines[0]).map(h=>h.toLowerCase().trim());
  return{headers,rows:lines.slice(1).map(l=>parseCSVLine(l))};
}
function downloadCSVTemplate(){
  const type=document.getElementById('csv-import-type')?.value||'pm';
  if(type==='pm'){download('\uFEFF'+'วันที่,กะ,เครื่อง,ช่าง,หมายเหตุ\n2026-05-30,กะเช้า,Hanger 01,สมชาย,ทุกอย่างปกติ','pm-template.csv','text/csv;charset=utf-8')}
  else{download('\uFEFF'+'วันที่พบ,เครื่อง,ประเภทปัญหา,ความรุนแรง,รายละเอียด,สถานะ,ผู้รับผิดชอบ\n2026-05-30,Hanger 01,ระบบไฟฟ้า,2,สายไฟหลวม,เปิดอยู่,สมชาย','issues-template.csv','text/csv;charset=utf-8')}
  toast('ดาวน์โหลด Template แล้ว');
}
function importCSV(input){
  const file=input.files[0];if(!file)return;
  const type=document.getElementById('csv-import-type')?.value||'pm';
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const {headers,rows}=parseCSV(e.target.result);
      if(!headers.length){toast('ไฟล์ CSV ว่างหรือรูปแบบไม่ถูกต้อง','error');return}
      let imported=0,skipped=0,errors=[];
      if(type==='pm'){
        const cm={date:headers.findIndex(h=>['วันที่','date'].includes(h)),shift:headers.findIndex(h=>['กะ','shift'].includes(h)),machine:headers.findIndex(h=>['เครื่อง','machine'].includes(h)),tech:headers.findIndex(h=>['ช่าง','tech'].includes(h)),note:headers.findIndex(h=>['หมายเหตุ','note'].includes(h))};
        if(cm.date<0||cm.machine<0){toast('ไม่พบคอลัมน์ "วันที่" หรือ "เครื่อง"','error');return}
        rows.forEach((row,ri)=>{
          try{
            const dateRaw=(row[cm.date]||'').trim();
            let date=dateRaw;
            if(/^\d{2}\/\d{2}\/\d{4}$/.test(dateRaw)){const p=dateRaw.split('/');date=`${p[2]}-${p[1]}-${p[0]}`}
            if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)){errors.push(`แถว ${ri+2}: วันที่ไม่ถูกต้อง`);skipped++;return}
            const machineName=(row[cm.machine]||'').trim();
            const m=MACHINES.find(x=>x.name.toLowerCase()===machineName.toLowerCase()||x.id===parseInt(machineName));
            if(!m){errors.push(`แถว ${ri+2}: ไม่พบเครื่อง "${machineName}"`);skipped++;return}
            const shiftRaw=(cm.shift>=0?row[cm.shift]:'').trim().toLowerCase();
            const shift=shiftRaw.includes('ดึก')||shiftRaw.includes('night')?'night':'day';
            const tech=(cm.tech>=0?row[cm.tech]:'').trim()||'นำเข้า CSV';
            const note=(cm.note>=0?row[cm.note]:'').trim();
            if(pmRecords.find(r=>r.machineId===m.id&&r.date===date&&r.shift===shift)){skipped++;return}
            const rec={id:uid(),machineId:m.id,date,shift,tech,note,checklist:[],checkedCount:0,totalItems:PM_CHECKLIST.length,ts:Date.now()};
            pmRecords.push(rec);savePMRecord(rec);imported++;
          }catch(err){errors.push(`แถว ${ri+2}: ${err.message}`);skipped++}
        });
      }
      const resultEl=document.getElementById('csv-import-result');
      if(resultEl){
        resultEl.style.display='block';
        resultEl.innerHTML=`<div style="background:${imported>0?'rgba(34,197,94,.1)':'rgba(239,68,68,.1)'};border:1px solid ${imported>0?'rgba(34,197,94,.25)':'rgba(239,68,68,.25)'};border-radius:7px;padding:11px;font-size:12px">
          <div style="font-weight:700;color:${imported>0?'var(--success)':'var(--danger)'}">✅ นำเข้าสำเร็จ ${imported} รายการ${skipped?` · ข้าม ${skipped}`:''}</div>
          ${errors.slice(0,5).map(e=>`<div style="color:var(--danger);margin-top:3px">• ${e}</div>`).join('')}
        </div>`;
      }
      updateBadges();toast(`นำเข้า ${imported} รายการ${skipped?` (ข้าม ${skipped})`:''}`);
    }catch(err){toast('เกิดข้อผิดพลาด: '+err.message,'error')}
  };
  reader.readAsText(file,'UTF-8');input.value='';
}

// ══════════════════════════════════════════
// MONTHLY REPORT EXPORT (simplified inline)
// ══════════════════════════════════════════
function exportMonthlyReport(){
  const ym=getExpMonth();
  const [y,m]=ym.split('-');
  const monthLabel=new Date(parseInt(y),parseInt(m)-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});
  const monthRecs=pmRecords.filter(r=>r.date.startsWith(ym));
  const doneMachines=new Set(monthRecs.map(r=>r.machineId));
  const pendingMachines=MACHINES.filter(mx=>!doneMachines.has(mx.id));
  const openIssues=issues.filter(i=>i.status!=='closed');
  const criticals=issues.filter(i=>parseSeverity(i.severity)===4&&i.status!=='closed');
  const compliancePct=Math.round(doneMachines.size/MACHINES.length*100);
  const dayMachines=new Set(monthRecs.filter(r=>r.shift==='day').map(r=>r.machineId)).size;
  const nightMachines=new Set(monthRecs.filter(r=>r.shift==='night').map(r=>r.machineId)).size;
  const sevLabel=['','เล็กน้อย','ปานกลาง','รุนแรง','วิกฤต'];
  const statusLabel={open:'เปิดอยู่','in-progress':'กำลังแก้ไข',closed:'แก้ไขแล้ว'};
  const techCounts={};monthRecs.forEach(r=>{if(r.tech)techCounts[r.tech]=(techCounts[r.tech]||0)+1});
  const topTechs=Object.entries(techCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const html=`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">
<title>รายงาน PM · ${monthLabel}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Sarabun',sans-serif;background:#f5f7fa;color:#0f1923;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cover{background:#0f1923;color:#fff;padding:48px 56px;position:relative}
.cover-eyebrow{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#c8922a;margin-bottom:12px;font-family:'IBM Plex Mono',monospace}
.cover-title{font-size:40px;font-weight:800;margin-bottom:8px}.cover-title span{color:#c8922a}
.cover-sub{font-size:16px;color:rgba(255,255,255,.5);margin-bottom:32px}
.cover-stamp{font-size:72px;font-weight:800;color:#c8922a;position:absolute;right:56px;top:48px;font-family:'IBM Plex Mono',monospace}
.cover-stamp-lbl{font-size:11px;color:rgba(255,255,255,.4);text-align:right;text-transform:uppercase;letter-spacing:.1em}
.page{padding:36px 48px;max-width:1000px;margin:0 auto}
.section-title{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#6b7f90;font-family:'IBM Plex Mono',monospace;margin-bottom:14px;display:flex;align-items:center;gap:10px;margin-top:32px}
.section-title::after{content:'';flex:1;height:1px;background:#dde4ea}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}
.kpi{background:#fff;border:1px solid #dde4ea;border-radius:10px;padding:18px 20px;position:relative;overflow:hidden}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.kpi.g::before{background:#0f7a4a}.kpi.r::before{background:#c0392b}.kpi.o::before{background:#c45e1a}.kpi.b::before{background:#1a5fa8}
.kpi-label{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6b7f90;margin-bottom:5px;font-family:'IBM Plex Mono',monospace}
.kpi-value{font-size:34px;font-weight:800;line-height:1;font-family:'IBM Plex Mono',monospace}
.kpi.g .kpi-value{color:#0f7a4a}.kpi.r .kpi-value{color:#c0392b}.kpi.o .kpi-value{color:#c45e1a}.kpi.b .kpi-value{color:#1a5fa8}
table{width:100%;border-collapse:collapse;margin-top:12px}th{text-align:left;padding:8px 12px;font-size:10px;color:#6b7f90;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #dde4ea;font-weight:700;background:#f5f7fa}td{padding:9px 12px;border-bottom:1px solid #eee;font-size:13px}
.badge{padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700}
.open{background:#fdecea;color:#c0392b}.ip{background:#fef3dc;color:#a05c00}.closed{background:#dcf5eb;color:#157a35}
@media print{.page-break{page-break-after:always}}
</style></head><body>
<div class="cover">
  <div class="cover-eyebrow">HANGER PM SYSTEM — รายงานประจำเดือน</div>
  <div class="cover-title">PM Maintenance<br><span>${monthLabel}</span></div>
  <div class="cover-sub">สรุปผลการบำรุงรักษาเชิงป้องกัน</div>
  <div class="cover-stamp">${compliancePct}%<div class="cover-stamp-lbl">Compliance</div></div>
</div>
<div class="page">
  <div class="section-title">KPI สรุปเดือน</div>
  <div class="kpi-grid">
    <div class="kpi g"><div class="kpi-label">เครื่องที่ PM แล้ว</div><div class="kpi-value">${doneMachines.size}/${MACHINES.length}</div></div>
    <div class="kpi ${criticals.length>0?'r':'g'}"><div class="kpi-label">ปัญหาวิกฤต</div><div class="kpi-value">${criticals.length}</div></div>
    <div class="kpi o"><div class="kpi-label">กะเช้า / กะดึก</div><div class="kpi-value" style="font-size:22px">${dayMachines} / ${nightMachines}</div></div>
    <div class="kpi b"><div class="kpi-label">ปัญหาค้าง</div><div class="kpi-value">${openIssues.length}</div></div>
  </div>
  ${topTechs.length?`
  <div class="section-title">ช่างที่ทำ PM มากที่สุด</div>
  <table><tr>${topTechs.map(([t,c])=>`<td style="text-align:center;padding:12px"><div style="font-size:20px;font-weight:800;color:#c8922a">${c}</div><div style="font-size:12px;color:#6b7f90">${t}</div></td>`).join('')}</tr></table>`:''}
  ${pendingMachines.length?`
  <div class="section-title">⚠️ เครื่องที่ยังไม่ได้ PM (${pendingMachines.length} เครื่อง)</div>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${pendingMachines.map(m=>`<span style="background:#fdecea;color:#c0392b;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700">${m.name}</span>`).join('')}</div>`:''}
  <div class="section-title">ประวัติ PM ทั้งหมด (${monthRecs.length} รายการ)</div>
  <table><tr><th>วันที่</th><th>กะ</th><th>เครื่อง</th><th>ช่าง</th><th>หมายเหตุ</th></tr>
  ${monthRecs.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr>
    <td>${fmt(r.date)}</td>
    <td><span style="background:${r.shift==='night'?'#ede9fe':'#fef9c3'};color:${r.shift==='night'?'#4c1d95':'#854d0e'};padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700">${r.shift==='night'?'🌙 กะดึก':'🌅 กะเช้า'}</span></td>
    <td style="font-weight:700">${MACHINES.find(m=>m.id===r.machineId)?.name||'?'}</td>
    <td>${r.tech||'—'}</td>
    <td style="color:#6b7f90;font-size:12px">${r.note||'—'}</td>
  </tr>`).join('')}
  </table>
  ${openIssues.length?`
  <div class="section-title">ปัญหาค้าง (${openIssues.length} รายการ)</div>
  <table><tr><th>เครื่อง</th><th>ปัญหา</th><th>ระดับ</th><th>วันที่พบ</th><th>สถานะ</th></tr>
  ${openIssues.sort((a,b)=>parseSeverity(b.severity)-parseSeverity(a.severity)).map(i=>{const sev=parseSeverity(i.severity);return`<tr>
    <td style="font-weight:700">${i.machineName}</td>
    <td>${i.desc}</td>
    <td style="color:${['','#157a35','#a05c00','#c45e1a','#c0392b'][sev]||'#666'};font-weight:700">${sevLabel[sev]||sev}</td>
    <td style="color:#6b7f90">${fmt(i.date)}</td>
    <td><span class="badge ${i.status==='open'?'open':i.status==='in-progress'?'ip':'closed'}">${statusLabel[i.status]||i.status}</span></td>
  </tr>`}).join('')}
  </table>`:''}
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #dde4ea;display:flex;justify-content:space-between;font-size:11px;color:#6b7f90">
    <span>สร้างโดย Hanger PM System V10 · ${new Date().toLocaleString('th-TH')}</span>
    <span>รายงาน ${monthLabel}</span>
  </div>
</div></body></html>`;
  download(html,`pm-report-${ym}.html`,'text/html');toast('ส่งออกรายงานประจำเดือนสำเร็จ ✨');
}

// ══════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════
document.querySelectorAll('.overlay').forEach(o=>{o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open')})});

// ══════════════════════════════════════════
// LIVE CLOCK + STATUS BAR
// ══════════════════════════════════════════
(function startClock(){
  function getShiftInfo(now){
    const total=now.getHours()*60+now.getMinutes();
    const dayStart=8*60+30,dayEnd=20*60+30;
    if(total>=dayStart&&total<dayEnd){return{shift:'day',remain:dayEnd-total,label:'🌅 กะเช้า',cls:'sb-shift-day'}}
    else{const remain=total>=dayEnd?(24*60-total+dayStart):(dayStart-total);return{shift:'night',remain,label:'🌙 กะดึก',cls:'sb-shift-night'}}
  }
  function pad(n){return String(n).padStart(2,'0')}
  function tick(){
    const now=new Date();
    // status bar
    const sbClk=document.getElementById('sb-clock-time');
    const sbShift=document.getElementById('sb-shift-badge');
    const sbRemain=document.getElementById('sb-remain');
    const sbDate=document.getElementById('sb-date-str');
    const sbWarn=document.getElementById('sb-warn');
    if(sbClk) sbClk.textContent=`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const si=getShiftInfo(now);
    if(sbShift){sbShift.textContent=si.label;sbShift.className=`sb-shift ${si.cls}`}
    const rh=Math.floor(si.remain/60),rm=si.remain%60;
    if(sbRemain) sbRemain.textContent=`${rh}ชม. ${pad(rm)}นาที`;
    if(sbDate) sbDate.textContent=now.toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    // PM view clock
    const clkTime=document.getElementById('clock-time');const clkDate=document.getElementById('clock-date');
    const clkBadge=document.getElementById('clock-shift-badge');const clkRemain=document.getElementById('clock-remain');
    const clkWarn=document.getElementById('clock-warn');
    if(clkTime) clkTime.textContent=`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    if(clkDate) clkDate.textContent=now.toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    if(clkBadge){clkBadge.textContent=si.label;clkBadge.className=`sb-shift ${si.cls}`}
    if(clkRemain) clkRemain.textContent=`${rh}ชม. ${pad(rm)}นาที`;
    // Dashboard shift badge sync
    const dashBadge=document.getElementById('dash-shift-badge');const dashRemain=document.getElementById('dash-shift-remain');
    if(dashBadge){dashBadge.textContent=si.label;dashBadge.className=si.shift==='day'?'shift-day':'shift-night';dashBadge.style.fontSize='11px';dashBadge.style.padding='2px 8px'}
    if(dashRemain) dashRemain.textContent=`สิ้นกะใน ${rh}ชม. ${pad(rm)}นาที`;
    // Warning
    if(si.remain<=60){
      const d=document.getElementById('pm-date-input')?.value||today();
      const pending=MACHINES.filter(m2=>!getShiftRecordsForDate(m2.id,d).some(r=>r.shift===si.shift)).length;
      if(pending>0){
        const warnMsg=`ใกล้สิ้น${si.label} — ยังไม่ PM อีก ${pending} เครื่อง!`;
        if(sbWarn){sbWarn.textContent='⚠️ '+warnMsg;sbWarn.classList.add('show')}
        if(clkWarn){clkWarn.querySelector('#clock-warn-text').textContent=warnMsg;clkWarn.classList.add('show')}
      } else {
        if(sbWarn) sbWarn.classList.remove('show');
        if(clkWarn) clkWarn.classList.remove('show');
      }
    } else {
      if(sbWarn) sbWarn.classList.remove('show');
      if(clkWarn) clkWarn.classList.remove('show');
    }
  }
  tick();setInterval(tick,1000);
})();

// ══════════════════════════════════════════
// PM CARD TOOLTIP
// ══════════════════════════════════════════
(function(){
  const tip=document.getElementById('pm-card-tooltip');
  let tipTimeout=null;
  function getMachineTooltipHTML(machineId){
    const m=MACHINES.find(x=>x.id===machineId);if(!m)return'';
    const recs=pmRecords.filter(r=>r.machineId===machineId).sort((a,b)=>{const dc=b.date.localeCompare(a.date);return dc!==0?dc:b.ts-a.ts}).slice(0,5);
    const title=`<div class="pm-tooltip-title">⚙️ ${m.name} <span style="color:var(--muted);font-size:11px">· ${m.model}</span></div>`;
    if(!recs.length) return title+`<div class="pm-tooltip-none">❌ ยังไม่ได้ทำ PM</div>`;
    const days=daysSinceLastPM(machineId);
    const cycle=pmCycles[machineId]||30;
    const overdueTxt=days!==null&&days>=cycle?`<div style="color:var(--danger);font-size:11px;margin-bottom:5px">⏰ เกินรอบ PM (${days}/${cycle} วัน)</div>`:'';
    const rows=recs.map(r=>{
      const icon=r.shift==='night'?'🌙':'🌅';
      const shiftTxt=r.shift==='night'?'กะดึก':'กะเช้า';
      return`<div class="pm-tooltip-row">${icon} <span>${fmt(r.date)}</span> ${shiftTxt} <span style="color:var(--accent3)">${r.tech||''}</span>${r.note?`<span style="color:var(--muted)"> · ${r.note.slice(0,25)}…</span>`:''}</div>`;
    }).join('');
    const more=pmRecords.filter(r=>r.machineId===machineId).length>5?`<div style="color:var(--muted);font-size:11px;margin-top:3px">...${pmRecords.filter(r=>r.machineId===machineId).length-5} รายการก่อนหน้า</div>`:'';
    return title+overdueTxt+rows+more;
  }
  document.addEventListener('mouseover',e=>{
    const card=e.target.closest('#machine-pm-grid .machine-card');if(!card)return;
    const mid=parseInt(card.getAttribute('data-machine-id'));if(!mid)return;
    clearTimeout(tipTimeout);tipTimeout=setTimeout(()=>{tip.innerHTML=getMachineTooltipHTML(mid);tip.classList.add('show')},100);
  });
  document.addEventListener('mousemove',e=>{
    const card=e.target.closest('#machine-pm-grid .machine-card');
    if(!card){tip.classList.remove('show');clearTimeout(tipTimeout);return}
    const vw=window.innerWidth,vh=window.innerHeight,tw=tip.offsetWidth||280,th=tip.offsetHeight||120;
    let x=e.clientX+14,y=e.clientY+14;
    if(x+tw>vw-8) x=e.clientX-tw-10;if(y+th>vh-8) y=e.clientY-th-10;
    tip.style.left=x+'px';tip.style.top=y+'px';
  });
  document.addEventListener('mouseout',e=>{
    const card=e.target.closest('#machine-pm-grid .machine-card');
    if(card&&!card.contains(e.relatedTarget)){tip.classList.remove('show');clearTimeout(tipTimeout)}
  });
})();

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
async function initData(){
  const inSettings=document.getElementById('view-settings')?.classList.contains('active');
  if(!inSettings) adminAuthenticatedAt=0;

  const syncBtn=document.getElementById('sync-btn');
  if(syncBtn){
    syncBtn.classList.add('spinning');
    syncBtn.innerHTML='<span class="si">⚙️</span> กำลัง Sync...';
  }

  const cached=readDataCache();
  const hasFreshCache=Boolean(cached && (Date.now()-cached.savedAt < DATA_CACHE_TTL_MS));

  if(hasFreshCache){
    applyCachedData(cached);
  }

  const loadEl=document.createElement('div');
  loadEl.style.cssText='position:fixed;inset:0;background:rgba(20,17,14,.94);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#f0e8dc;font-family:Sarabun,sans-serif';
  loadEl.innerHTML=`<div style="font-size:36px;animation:spin .7s linear infinite;display:inline-block">⚙️</div>
    <div style="font-size:16px;font-weight:700">${hasFreshCache ? 'กำลังอัปเดตข้อมูลจาก Google Sheets' : 'กำลังโหลดข้อมูลจาก Google Server'}</div>
    <div style="font-size:12px;color:#9e8f7e">กรุณารอสักครู่...</div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
  document.body.appendChild(loadEl);

  try{
    const [machineResult,settingResult,pmResult,issueResult]=await Promise.allSettled([
      gsGet('getMachines'),
      gsGet('getSettings'),
      gsGet('getPM'),
      gsGet('getIssues')
    ]);

    const machineData=machineResult.status==='fulfilled'?machineResult.value:[];
    const settingData=settingResult.status==='fulfilled'?settingResult.value:[];
    const pmData=pmResult.status==='fulfilled'?pmResult.value:[];
    const issueData=issueResult.status==='fulfilled'?issueResult.value:[];

    if(machineData&&machineData.length){
      MACHINES=machineData
        .map(m=>({
          id:Number(m.id)||0,
          name:String(m.name||m.machineName||`Hanger ${String(Number(m.id)).padStart(2,'0')}`).trim(),
          model:String(m.model||m.machineModel||`HNG-${(Number(m.id)||1)*5}`).trim()
        }))
        .filter(m=>m.id>0);
      if(!MACHINES.length) MACHINES=[...DEFAULT_MACHINES];
      machineData.forEach(m=>{pmCycles[Number(m.id)]=Number(m.pmCycleDays)||30});
    }

    if(settingData&&settingData.length){
      settings={};
      settingData.forEach(r=>{if(r.key) settings[r.key]=r.value});
    }

    pmRecords=(pmData||[]).map(r=>({
      ...r,
      machineId:Number(r.machineId),
      date:normalizeDate(r.date),
      checkedCount:Number(r.checkedCount)||0,
      totalItems:Number(r.totalItems)||10,
      ts:Number(r.ts)||0,
      checklist:r.checklist?String(r.checklist).split(',').filter(Boolean):[]
    }));

    issues=(issueData||[]).map(i=>({
      ...i,
      machineId:Number(i.machineId),
      date:normalizeDate(i.date),
      severity:parseSeverity(i.severity??i.saverity),
      ts:Number(i.ts)||0
    }));

    writeDataCache({machines:MACHINES,pmCycles,settings,pmRecords,issues});
    console.log(`✅ โหลดข้อมูลสำเร็จ: Machines ${MACHINES.length}, PM ${pmRecords.length}, Issues ${issues.length}`);
    toast(hasFreshCache?'อัปเดตข้อมูลจาก Google Sheets สำเร็จ':'โหลดข้อมูลสำเร็จ','success');
  }catch(e){
    console.error('initData failed:',e);
    if(!hasFreshCache){toast('โหลดข้อมูลไม่สำเร็จ','error');}
  }

  loadEl.remove();
  if(syncBtn){
    syncBtn.classList.remove('spinning');
    syncBtn.innerHTML='<span class="si">🔄</span> Sync ข้อมูล';
  }

  applyTheme();
  const inp=document.getElementById('pm-date-input');if(inp)inp.value=today();
  const expM=document.getElementById('exp-month');if(expM)expM.value=today().slice(0,7);
  const ym=today().slice(0,7);
  currentOverviewMonth=ym;
  const sel=document.getElementById('overview-month-select');
  if(sel){
    sel.value=ym;
    const [y,m]=ym.split('-');
    const lbl=document.getElementById('overview-month-label');
    if(lbl) lbl.textContent=new Date(parseInt(y),parseInt(m)-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});
  }
  const pmMonthFilter=document.getElementById('pm-month-filter');if(pmMonthFilter)pmMonthFilter.value=ym;
  populateIssueMachineFilter();
  renderDashboard();
  showView('dashboard');
}
window.addEventListener('DOMContentLoaded',initData);
</script>



</body>
</html>