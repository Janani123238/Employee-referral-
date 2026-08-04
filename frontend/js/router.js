/* ------------------------------- Bind view-specific handlers after render ------------------------------- */
function bindViewSpecific(){
  drawCharts();
  if(state.view==='refer') bindReferView();
  if(state.view==='match') bindMatchView();
  if(state.view==='jobs') bindOpenPositions();
  if(state.view==='tracking') bindTrackingView();
  if(state.view==='manageJobs') bindManageJobs();
  if(state.view==='allReferrals') bindAllReferrals();
  if(state.view==='shortlist') bindAiShortlist();
  if(state.view==='reports') bindReportsView();
  if(state.view==='employees') bindEmployeesView();
  if(state.view==='policy') bindPolicyView();
  if(state.view==='adminSettings') bindAdminSettings();
  if(state.view==='aiSettings') bindAiSettings();
  if(state.view==='userManagement') bindUserManagement();
  if(state.view==='resumeAnalysis') bindResumeAnalysis();
  if(state.view==='bulkImport') bindBulkImport();
  if(state.view==='interviews') bindInterviewsView();
  if(state.view==='profile') bindProfileView();
  if(state.view==='editProfile') bindEditProfileView();
  if(state.view==='emailTemplates') bindEmailTemplatesView();
  if(state.view==='auditLogs') bindAuditLogsView();
  if(state.view==='emailCenter') bindEmailCenterView();
}

function bindProfileView(){
  document.querySelectorAll('[data-nav="editProfile"]').forEach(el=>el.addEventListener('click',()=>nav('editProfile')));
}

function bindEditProfileView(){
  const btn = document.getElementById('saveProfileBtn');
  if(btn) btn.addEventListener('click', async ()=>{
    btn.disabled=true; btn.textContent='Saving…';
    const name = document.getElementById('editProfileName').value.trim();
    const dept = document.getElementById('editProfileDept').value.trim();
    const designation = document.getElementById('editProfileDesig').value.trim();
    const phone = document.getElementById('editProfilePhone').value.trim();
    const location = document.getElementById('editProfileLocation').value.trim();
    if(!name){ toast('Name is required','amber'); btn.disabled=false; btn.textContent='Save Changes'; return; }
    try{
      await api('/api/employees/me/profile',{method:'PATCH',body:{name,dept,designation,phone,location}});
      state.user.name = name;
      const idx = state.employees.findIndex(e=>e.id===state.user.employeeId);
      if(idx>-1){ state.employees[idx].name=name; state.employees[idx].dept=dept; state.employees[idx].designation=designation; state.employees[idx].phone=phone; state.employees[idx].location=location; }
      toast('Profile updated','success');
      nav('profile');
    }catch(e){ toast('Could not update: '+e.message,'error'); btn.disabled=false; btn.textContent='Save Changes'; }
  });
}

async function bindResumeAnalysis(){
  const btn = document.getElementById('loadAnalysisBtn');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    const jobId = document.getElementById('analysisJobSelect').value;
    const results = document.getElementById('analysisResults');
    let candidates = state.referrals;
    if(jobId) candidates = candidates.filter(r=>r.jobId===jobId);
    if(candidates.length===0){ results.innerHTML='<div class="glass" style="padding:30px;text-align:center;color:var(--ink-soft);">No candidates found for the selected criteria.</div>'; return; }
    results.innerHTML=`<div class="glass" style="padding:20px;"><div class="shimmer" style="height:60px;border-radius:12px;"></div><div style="font-size:12px;color:var(--ink-soft);margin-top:8px;text-align:center;">AI is analyzing ${candidates.length} candidate(s)…</div></div>`;
    btn.disabled=true;
    try{
      const analyzed = candidates.map(r=>{
        const job = jobById(r.jobId);
        const score = r.aiScore?.overall||50;
        const match = r.matchPercent||50;
        const blend = Math.round((score+match)/2);
        let rank = 'Low';
        if(blend>=95) rank='Exceptional';
        else if(blend>=80) rank='Strong';
        else if(blend>=40) rank='Medium';
        return {...r, resumeScore:score, atsScore:r.atsScore||score, skillMatchPct:match, rank};
      });
      analyzed.sort((a,b)=>b.resumeScore-a.resumeScore);
      results.innerHTML=`
      <div class="glass" style="padding:6px;overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>Rank</th><th>Candidate</th><th>Job</th><th>Resume Score</th><th>ATS Score</th><th>Skill Match</th><th>AI Score</th><th>Strengths</th><th>Weaknesses</th><th>Recommendation</th><th>Rating</th></tr></thead>
          <tbody>
            ${analyzed.map((r,i)=>{
              const job = jobById(r.jobId);
              const rankColor = r.rank==='Exceptional'||r.rank==='Strong'?'#059669':r.rank==='Medium'?'#D97706':'#DC2626';
              return `<tr>
                <td class="mono" style="font-weight:700;">#${i+1}</td>
                <td><strong>${r.candidateName}</strong></td>
                <td>${job?job.title:'—'}</td>
                <td class="mono" style="font-weight:700;color:var(--primary);">${r.resumeScore}</td>
                <td class="mono">${r.atsScore}</td>
                <td>${r.skillMatchPct}%</td>
                <td class="mono" style="font-weight:700;">${r.aiScore?.overall||'—'}</td>
                <td style="font-size:11px;max-width:150px;">${(r.strengths||[]).join(', ')||'—'}</td>
                <td style="font-size:11px;max-width:150px;">${(r.weaknesses||[]).join(', ')||'—'}</td>
                <td style="font-size:11px;max-width:120px;">${r.recommendation||'—'}</td>
                <td><span class="chip" style="background:${rankColor}22;color:${rankColor};">${r.rank}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    }catch(e){ toast('Analysis failed: '+e.message,'error'); results.innerHTML=''; }
    btn.disabled=false;
  });
}

async function bindInterviewsView(){
  const container = document.getElementById('interviewTabContent');
  if(!container) return;
  
  let activeTab = 'list';
  
  function switchTab(tab){
    activeTab = tab;
    document.querySelectorAll('[data-ivtab]').forEach(b=>{
      b.classList.remove('active'); b.style.background=''; b.style.color='';
    });
    document.querySelector(`[data-ivtab="${tab}"]`)?.classList.add('active');
    const btn = document.querySelector(`[data-ivtab="${tab}"]`);
    if(btn){ btn.style.background='linear-gradient(120deg,var(--primary),var(--indigo))'; btn.style.color='#fff'; }
    renderTab();
  }
  
  document.querySelectorAll('[data-ivtab]').forEach(b=>{
    b.addEventListener('click', ()=>switchTab(b.dataset.ivtab));
  });
  switchTab('list');
  
  async function renderTab(){
    if(activeTab === 'list') await renderCandidateList();
    else if(activeTab === 'calendar') await renderCalendar();
    else if(activeTab === 'timeline') await renderTimelineView();
  }
  
  async function renderCandidateList(){
    container.innerHTML = `<div class="glass" style="padding:20px;"><div class="shimmer" style="height:60px;border-radius:12px;"></div></div>`;
    try{
      const referrals = await api('/api/referrals');
      const interviews = await api('/api/interviews');
      
      let search = '', statusFilter = '';
      const statuses = ['Applied','Resume Screening','Shortlisted','Interview Scheduled','Interview Completed','Selected','Rejected','Offer Released','Joined'];
      const filterOptions = ['Auto Rejected','Rejected','Screening','Shortlisted','Interview Scheduled','Selected'];
      
      function statusMatches(r, f){
        if(!f) return true;
        if(f==='Auto Rejected') return r.autoRejected && r.status==='Rejected';
        if(f==='Rejected') return !r.autoRejected && r.status==='Rejected';
        if(f==='Screening') return r.status==='Resume Screening';
        return r.status===f;
      }
      
      function drawTable(list){
        const filtered = list.filter(r=>{
          if(search && !(r.candidateName||'').toLowerCase().includes(search.toLowerCase())) return false;
          if(!statusMatches(r, statusFilter)) return false;
          return true;
        });
        
        let html = `
        <div class="glass search-bar" style="padding:14px;margin-bottom:14px;">
          <div class="search-row">
            <div style="flex:1;min-width:200px;position:relative;"><label class="field-label">Search Candidates</label><input class="input" id="ivSearch" placeholder="Type a name, email or skill…" value="${search}"/></div>
            <div style="min-width:170px;"><label class="field-label">Status</label>
              <select class="input" id="ivStatusFilter"><option value="">All</option>${filterOptions.concat(statuses.filter(s=>!filterOptions.includes(s))).map(s=>`<option ${statusFilter===s?'selected':''}>${s}</option>`).join('')}</select>
            </div>
            <div style="display:flex;align-items:end;gap:8px;">
              <div class="glass" style="padding:8px 14px;font-size:12px;color:var(--ink-soft);white-space:nowrap;"><strong class="mono" style="color:var(--primary);">${filtered.length}</strong> / ${list.length} shown</div>
            </div>
          </div>
        </div>
        <div class="glass" style="padding:6px;overflow-x:auto;">
          <table class="data-table">
            <thead><tr><th>Candidate</th><th>Applied Job</th><th>Referred By</th><th>Resume</th><th>AI Score</th><th>Match</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${filtered.map(r=>{
                const job = jobById(r.jobId);
                const emp = employeeById(r.referredBy);
                const score = r.aiScore?.overall || 0;
                const scoreColor = score >= 75 ? '#059669' : score >= 50 ? '#D97706' : '#DC2626';
                const isRejected = r.status==='Rejected';
                return `<tr style="${isRejected?'opacity:0.85;':''}">
                  <td><strong>${r.candidateName}</strong><div style="font-size:11px;color:var(--ink-soft);">${r.email||''}</div>
                    ${r.autoRejected?`<div style="font-size:10.5px;color:#DC2626;margin-top:2px;display:flex;align-items:center;gap:4px;">${icon('zap',11)} Auto-rejected · orig match ${r.originalMatch||'—'}%</div>`:''}
                  </td>
                  <td style="font-size:12.5px;">${job?job.title:'—'}</td>
                  <td style="font-size:12.5px;">${emp?emp.name:'—'}</td>
                  <td>${r.resumeFileUrl?`<a href="${r.resumeFileUrl}" target="_blank" style="color:var(--primary);font-size:12px;">View</a>`:'<span style="color:var(--ink-soft);font-size:12px;">None</span>'}</td>
                  <td><div style="display:flex;align-items:center;gap:6px;"><div style="width:50px;height:6px;border-radius:3px;background:rgba(226,232,240,0.12);overflow:hidden;"><div style="width:${score}%;height:100%;background:${scoreColor};border-radius:3px;"></div></div><span class="mono" style="font-size:12px;font-weight:700;color:${scoreColor};">${score}</span></div></td>
                  <td class="mono" style="font-weight:700;color:${isRejected?'var(--coral)':'var(--primary)'};">${r.matchPercent||'—'}%</td>
                  <td><select class="input iv-status-select" data-ref-id="${r.id}" style="padding:4px 8px;font-size:11px;min-width:130px;${isRejected?'color:#DC2626;':''}">
                    ${statuses.map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
                  </select></td>
                  <td><div style="display:flex;gap:4px;flex-wrap:wrap;">
                    <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px;" data-schedule-iv='${JSON.stringify({id:r.id,name:r.candidateName,jobId:r.jobId})}'>Schedule</button>
                    ${isRejected?`<button class="btn" style="font-size:11px;padding:3px 8px;background:rgba(5,150,105,0.14);color:#059669;" data-iv-reopen="${r.id}">Reopen</button>`:''}
                    ${isRejected?`<button class="btn btn-ghost" style="font-size:11px;padding:3px 8px;color:#D97706;" data-iv-reanalyze="${r.id}">Re-evaluate</button>`:''}
                    <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px;color:var(--primary);" data-iv-override="${r.id}">Override</button>
                    <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px;" data-view-timeline='${r.id}'>Timeline</button>
                  </div></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:10px;font-size:12px;color:var(--ink-soft);">Showing ${filtered.length} of ${list.length} candidates · auto-rejected candidates are visible here for HR review</div>`;
        
        container.innerHTML = html;
        
        document.getElementById('ivSearch')?.addEventListener('input', (e)=>{ search=e.target.value; drawTable(list); });
        document.getElementById('ivStatusFilter')?.addEventListener('change', (e)=>{ statusFilter=e.target.value; drawTable(list); });
        
        document.querySelectorAll('.iv-status-select').forEach(sel=>{
          sel.addEventListener('change', async ()=>{
            try{
              const updated = await api(`/api/referrals/${sel.dataset.refId}/status`, {method:'PATCH', body:{status:sel.value}});
              toast('Status updated to '+sel.value, 'success');
              const r = list.find(x=>x.id===sel.dataset.refId);
              if(r) Object.assign(r, updated);
              drawTable(list);
            }catch(e){ toast('Failed: '+e.message, 'error'); renderCandidateList(); }
          });
        });
        
        document.querySelectorAll('[data-schedule-iv]').forEach(btn=>{
          btn.addEventListener('click', ()=>openScheduleModal(JSON.parse(btn.dataset.scheduleIv)));
        });

        document.querySelectorAll('[data-iv-reopen]').forEach(btn=>{
          btn.addEventListener('click', async ()=>{
            if(!confirm('Reopen this candidate to "Resume Screening"?')) return;
            try{
              await api(`/api/referrals/${btn.dataset.ivReopen}/status`, {method:'PATCH', body:{status:'Resume Screening'}});
              toast('Candidate reopened for screening', 'success');
              renderCandidateList();
            }catch(e){ toast('Failed: '+e.message, 'error'); }
          });
        });

        document.querySelectorAll('[data-iv-reanalyze]').forEach(btn=>{
          btn.addEventListener('click', async ()=>{
            btn.disabled=true; btn.textContent='Re-evaluating…';
            try{
              const res = await api(`/api/referrals/${btn.dataset.ivReanalyze}/reanalyze`, {method:'POST'});
              toast(res.reopened
                ? `Re-evaluation cleared the bar — ${res.referral.matchPercent}% (${res.verdict.category}), reopened`
                : `Re-evaluated — match ${res.referral.matchPercent}% (${res.verdict.category})`, 'success');
              renderCandidateList();
            }catch(e){ toast('Re-evaluation failed: '+e.message, 'error'); btn.disabled=false; btn.textContent='Re-evaluate'; }
          });
        });

        document.querySelectorAll('[data-iv-override]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const r = list.find(x=>x.id===btn.dataset.ivOverride);
            if(r) openOverrideModal(r, ()=>renderCandidateList());
          });
        });
        
        document.querySelectorAll('[data-view-timeline]').forEach(btn=>{
          btn.addEventListener('click', async ()=>{
            const refId = btn.dataset.viewTimeline;
            await renderCandidateTimeline(refId);
          });
        });
      }
      
      drawTable(referrals);
      
      async function openScheduleModal(cand){
        const modal = document.getElementById('scheduleModal');
        const rounds = ['HR Screening','Technical Round 1','Technical Round 2','Manager Round','Director Round','HR Final Discussion'];
        modal.innerHTML = `
        <div class="modal-overlay" id="scheduleOverlay">
          <div class="glass-strong pop-in" style="max-width:560px;width:100%;padding:26px;max-height:85vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <h3 style="margin:0;font-size:16px;">Schedule Interview — ${cand.name}</h3>
              <button class="btn btn-ghost" onclick="document.getElementById('scheduleOverlay').remove()" style="padding:6px;">${icon('x',16)}</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div><label class="field-label">Interview Round</label><select class="input" id="schRound">${rounds.map(r=>`<option>${r}</option>`).join('')}</select></div>
              <div><label class="field-label">Interview Type</label><select class="input" id="schType"><option>Online</option><option>Offline</option><option>Phone</option></select></div>
              <div><label class="field-label">Date</label><input class="input" id="schDate" type="date"/></div>
              <div><label class="field-label">Start Time</label><input class="input" id="schStart" type="time"/></div>
              <div><label class="field-label">End Time</label><input class="input" id="schEnd" type="time"/></div>
              <div><label class="field-label">Interviewer(s)</label><input class="input" id="schInterviewer" placeholder="Comma-separated names"/></div>
              <div style="grid-column:1/-1;"><label class="field-label">Meeting Link</label><input class="input" id="schMeetingLink" placeholder="https://teams.microsoft.com/..."/></div>
              <div style="grid-column:1/-1;"><label class="field-label">Location (for offline)</label><input class="input" id="schLocation" placeholder="Room / Office address"/></div>
              <div style="grid-column:1/-1;"><label class="field-label">Additional Notes</label><textarea class="input" id="schNotes" rows="3"></textarea></div>
            </div>
            <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
              <button class="btn btn-primary" id="saveSchBtn">Save Interview</button>
              <button class="btn btn-outline" id="sendInviteBtn">Send Invitation</button>
              <button class="btn btn-outline" id="teamsBtn" title="Create a Microsoft Teams online meeting for this interview">Teams Meeting</button>
              <button class="btn btn-ghost" onclick="document.getElementById('scheduleOverlay').remove()">Cancel</button>
            </div>
            <div id="schResult" style="margin-top:12px;"></div>
          </div>
        </div>`;
        
        const saveInterview = async (sendInvite=false, closeAfter=true)=>{
          const btn = sendInvite ? document.getElementById('sendInviteBtn') : document.getElementById('saveSchBtn');
          btn.disabled=true; btn.textContent='Saving...';
          try{
            const iv = await api('/api/interviews', {method:'POST', body:{
              referralId: cand.id, jobId: cand.jobId, candidateName: cand.name,
              roundName: document.getElementById('schRound').value,
              interviewType: document.getElementById('schType').value,
              interviewDate: document.getElementById('schDate').value,
              startTime: document.getElementById('schStart').value,
              endTime: document.getElementById('schEnd').value,
              interviewer: document.getElementById('schInterviewer').value,
              meetingLink: document.getElementById('schMeetingLink').value,
              location: document.getElementById('schLocation').value,
              notes: document.getElementById('schNotes').value,
            }});
            createdId = iv.id;
            if(sendInvite && iv.id){
              try{
                const invResult = await api(`/api/interviews/${iv.id}/send-invitation`, {method:'POST'});
                toast(invResult.message || 'Invitation sent', 'success');
              }catch(e){ toast('Interview saved but invitation failed: '+e.message, 'amber'); }
            } else if(!sendInvite && closeAfter){
              toast('Interview scheduled', 'success');
            }
            if(closeAfter){
              document.getElementById('scheduleOverlay').remove();
              await api(`/api/referrals/${cand.id}/status`, {method:'PATCH', body:{status:'Interview Scheduled'}});
              renderTab();
            }
            return iv;
          }catch(e){ toast('Failed: '+e.message, 'error'); }
          btn.disabled=false; btn.textContent = sendInvite?'Send Invitation':'Save Interview';
          return null;
        };

        let createdId = null;
        document.getElementById('saveSchBtn').addEventListener('click', ()=>saveInterview(false, true));
        document.getElementById('sendInviteBtn').addEventListener('click', ()=>saveInterview(true, true));
        document.getElementById('teamsBtn').addEventListener('click', async ()=>{
          const teamsBtn = document.getElementById('teamsBtn');
          const resultEl = document.getElementById('schResult');
          teamsBtn.disabled=true; teamsBtn.textContent='Creating Teams meeting…';
          try{
            let iv = null;
            if(createdId){
              iv = await api(`/api/interviews/${createdId}/create-teams-meeting`, {method:'POST'});
            } else {
              iv = await saveInterview(false, false);
              if(iv && iv.id){
                iv = await api(`/api/interviews/${iv.id}/create-teams-meeting`, {method:'POST'});
              }
            }
            if(iv && iv.meetingLink){
              document.getElementById('schMeetingLink').value = iv.meetingLink;
              resultEl.innerHTML = `<div class="glass" style="padding:12px 14px;font-size:12.5px;border:1px solid rgba(5,150,105,0.3);">
                <strong style="color:#059669;">✓ Teams meeting created</strong><br/>
                <a href="${iv.meetingLink}" target="_blank" style="color:var(--primary);word-break:break-all;">${iv.meetingLink}</a>
              </div>`;
              toast('Teams meeting created', 'success');
            } else {
              resultEl.innerHTML = `<div style="font-size:12.5px;color:var(--coral);">${(iv && iv.detail) || 'Teams meeting could not be created.'}</div>`;
              toast('Teams meeting could not be created', 'error');
            }
          }catch(e){
            resultEl.innerHTML = `<div style="font-size:12.5px;color:var(--coral);">${e.message}</div>`;
            toast('Teams failed: '+e.message, 'error');
          }
          teamsBtn.disabled=false; teamsBtn.textContent='Teams Meeting';
        });
        document.getElementById('scheduleOverlay').addEventListener('click',(e)=>{ if(e.target.id==='scheduleOverlay') e.target.remove(); });
      }
    }catch(e){ container.innerHTML='<div class="glass" style="padding:20px;color:var(--coral);">Failed to load: '+e.message+'</div>'; }
  }
  
  async function renderCalendar(){
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth()+1;
    try{
      const interviews = await api(`/api/interviews/calendar?year=${year}&month=${month}`);
      const monthName = now.toLocaleString('default',{month:'long'});
      const daysInMonth = new Date(year, month, 0).getDate();
      const firstDay = new Date(year, month-1, 1).getDay();
      
      let calDays = '';
      for(let i=0;i<firstDay;i++) calDays += '<div class="cal-day-cell" style="background:rgba(226,232,240,0.03);border:none;"></div>';
      for(let d=1;d<=daysInMonth;d++){
        const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dayInterviews = interviews.filter(iv=>iv.interviewDate===dateStr);
        const isToday = d===now.getDate();
        calDays += `
        <div class="cal-day-cell${isToday?' today':''}">
          <div style="font-size:12px;font-weight:700;${isToday?'color:var(--primary);':''}">${d}</div>
          <div style="flex:1;min-height:0;overflow:hidden;">
            ${dayInterviews.slice(0,3).map(iv=>{
              const color = iv.status==='Completed'?'#059669':iv.status==='Cancelled'?'#DC2626':iv.status==='Rescheduled'?'#D97706':'#2563EB';
              return `<div class="cal-day-card" style="background:${color}15;color:${color};" data-cal-iv='${JSON.stringify(iv)}'>${iv.candidateName} — ${iv.roundName}</div>`;
            }).join('')}
            ${dayInterviews.length>3?`<div class="cal-more">+${dayInterviews.length-3} more</div>`:''}
          </div>
        </div>`;
      }
      
      container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h3 style="margin:0;font-size:16px;">${monthName} ${year}</h3>
        <div style="display:flex;gap:8px;font-size:11px;">
          <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:#2563EB;"></span>Scheduled</span>
          <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:#059669;"></span>Completed</span>
          <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:#D97706;"></span>Rescheduled</span>
          <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:2px;background:#DC2626;"></span>Cancelled</span>
        </div>
      </div>
      <div class="glass" style="padding:12px;">
        <div class="cal-scroll">
          <div class="cal-grid">
            ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div style="text-align:center;font-size:11px;font-weight:700;color:var(--ink-soft);padding:4px;">${d}</div>`).join('')}
            ${calDays}
          </div>
        </div>
      </div>`;
      
      document.querySelectorAll('[data-cal-iv]').forEach(el=>{
        el.addEventListener('click', ()=>{
          const iv = JSON.parse(el.dataset.calIv);
          openScheduleModal({id:iv.referralId, name:iv.candidateName, jobId:iv.jobId});
        });
      });
    }catch(e){ container.innerHTML='<div class="glass" style="padding:20px;color:var(--coral);">Calendar failed: '+e.message+'</div>'; }
  }
  
  async function renderTimelineView(){
    try{
      const referrals = await api('/api/referrals');
      container.innerHTML = `
      <div class="glass" style="padding:14px;margin-bottom:14px;">
        <label class="field-label">Select Candidate</label>
        <select class="input" id="timelineSelect" style="max-width:400px;">
          <option value="">Choose a candidate...</option>
          ${referrals.map(r=>`<option value="${r.id}">${r.candidateName} — ${r.status}</option>`).join('')}
        </select>
      </div>
      <div id="timelineResult"></div>`;
      
      document.getElementById('timelineSelect').addEventListener('change', async (e)=>{
        if(e.target.value) await renderCandidateTimeline(e.target.value);
      });
    }catch(e){ container.innerHTML='<div class="glass" style="padding:20px;color:var(--coral);">'+e.message+'</div>'; }
  }
  
  async function renderCandidateTimeline(refId){
    const result = document.getElementById('timelineResult') || document.getElementById('interviewTabContent');
    if(!result) return;
    result.innerHTML = `<div class="glass" style="padding:20px;"><div class="shimmer" style="height:40px;border-radius:12px;"></div></div>`;
    try{
      const data = await api(`/api/activity/timeline/${refId}`);
      if(!data.timeline || !data.timeline.length){
        result.innerHTML = `<div class="glass" style="padding:30px;text-align:center;color:var(--ink-soft);">No timeline events found.</div>`;
        return;
      }
      result.innerHTML = `
      <div class="glass" style="padding:18px;">
        <div style="margin-bottom:14px;"><h3 style="margin:0 0 4px;font-size:15px;">${data.candidateName} — Hiring Timeline</h3>
        <span class="chip" style="background:rgba(37,99,235,0.12);color:var(--primary);">Current: ${data.currentStatus}</span></div>
        <div style="border-left:3px solid rgba(37,99,235,0.15);padding-left:18px;">
          ${data.timeline.map((t,i)=>{
            const color = t.type==='interview'?'#2563EB':t.type==='activity'?'#1D4ED8':'#059669';
            return `<div style="margin-bottom:14px;position:relative;">
              <div style="width:12px;height:12px;border-radius:50%;background:${color};position:absolute;left:-25px;top:3px;border:2px solid #fff;box-shadow:0 0 0 2px ${color}33;"></div>
              <div style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;">${icon('fileText',14)} ${t.title}</div>
              <div style="font-size:12px;color:var(--ink-soft);margin-top:2px;">${t.description}</div>
              <div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">${t.performedBy?'By '+t.performedBy+' · ':''}${t.date?new Date(t.date).toLocaleString():''}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }catch(e){ result.innerHTML='<div class="glass" style="padding:20px;color:var(--coral);">'+e.message+'</div>'; }
  }
}

async function bindUserManagement(){
  const container = document.getElementById('usersList');
  if(!container) return;
  container.innerHTML=`<div class="glass" style="padding:20px;"><div class="shimmer" style="height:60px;border-radius:12px;"></div></div>`;
  try{
    const users = await api('/api/admin/users');
    container.innerHTML=`
    <div class="glass" style="padding:6px;overflow-x:auto;">
      <table class="data-table">
        <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
        <tbody>
          ${users.map(u=>`<tr>
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td><select class="input" style="padding:6px 10px;font-size:12px;" data-user-role="${u.id}">
              ${['employee','manager','hr','hr_manager','chro','vp','cto','ceo','system_admin','admin'].map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${roleLabel(r)}</option>`).join('')}
            </select></td>
            <td>${u.isActive?'<span class="chip" style="background:rgba(5,150,105,0.15);color:#059669;">Active</span>':'<span class="chip" style="background:rgba(220,38,38,0.15);color:var(--coral);">Inactive</span>'}</td>
            <td style="font-size:12px;color:var(--ink-soft);">${fmtRelative(u.created_at)}</td>
            <td></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
    document.querySelectorAll('[data-user-role]').forEach(sel=>{
      sel.addEventListener('change', async ()=>{
        try{
          await api(`/api/admin/users/${sel.dataset.userRole}/role?role=${sel.value}`,{method:'PATCH'});
          toast('Role updated','success');
        }catch(e){ toast('Could not update role: '+e.message,'error'); render(); }
      });
    });
    document.getElementById('refreshUsersBtn')?.addEventListener('click',()=>bindUserManagement());
  }catch(e){ container.innerHTML='<div class="glass" style="padding:20px;color:var(--coral);">Could not load users: '+e.message+'</div>'; }
}

/* ------------------------------- Polling (real-time sync against the backend) ------------------------------- */
let pollTimer=null;
function startPolling(){
  if(pollTimer) return;
  pollTimer = setInterval(async ()=>{
    if(!state.user || !state.role) return;
    try{
      const canSeeTeam = isHrRole(state.role) || state.role==='manager';
      const [referrals, notifications] = await Promise.allSettled([
        api(canSeeTeam ? '/api/referrals' : '/api/referrals/mine'),
        api('/api/notifications'),
      ]);
      if(referrals.status==='fulfilled' && Array.isArray(referrals.value) && JSON.stringify(referrals.value)!==JSON.stringify(state.referrals)){
        state.referrals = referrals.value;
        if(['dashboard','tracking','allReferrals','reports','leaderboard','rewards'].includes(state.view)) render();
      }
      if(notifications.status==='fulfilled' && Array.isArray(notifications.value)){
        const newCount = notifications.value.filter(n=>n&&!n.isRead).length;
        if(newCount !== state.unreadCount){
          state.notifications = notifications.value;
          state.unreadCount = newCount;
          render();
        }
      }
    }catch(e){ /* stay quiet on transient poll failures */ }
  }, 9000);
}

/* ------------------------------- Init ------------------------------- */
(async function init(){
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get('reset_token');
  if(resetToken){
    state.resetToken = resetToken;
    state.loginMode = 'reset';
    history.replaceState({}, '', window.location.pathname); // scrub token from the visible URL
    render();
    return;
  }

  // SSO return: the callback lands on /?sso_token=<jwt>. Persist it, scrub the
  // URL, then fall through to the normal authenticated-session path below
  // (loads /api/auth/me and renders the dashboard for the user's role).
  const ssoToken = params.get('sso_token');
  if(ssoToken){
    setToken(ssoToken);
    history.replaceState({}, '', window.location.pathname);
  }
  const ssoError = params.get('sso_error');
  if(ssoError){
    history.replaceState({}, '', window.location.pathname);
    render();
    setTimeout(()=> toast('SSO sign-in failed: '+decodeURIComponent(ssoError), 'error'), 200);
    return;
  }

  const token = getToken();
  if(!token){ render(); return; }
  try{
    const user = await api('/api/auth/me');
    state.user = user; state.role = user.role;
    if(state.role === 'candidate'){
      await loadCandidateData();
      render();
    } else {
      await loadAllData();
      state._loaded = true;
      render();
      startPolling();
    }
  }catch(e){
    clearToken();
    render();
  }
})();
