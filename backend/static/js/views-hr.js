function manageJobsView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <div>
        <h1 class="display" style="font-size:24px;margin:0 0 4px;">Manage Jobs</h1>
        <div style="font-size:13px;color:var(--text-secondary);">${state.jobs.length} open position${state.jobs.length===1?'':'s'}</div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-outline" id="openNewJobForm">New Job</button>
        <button class="btn btn-primary" id="openJdGenerator">AI JD Generator</button>
      </div>
    </div>
    <div id="jdGeneratorPanel"></div>
    <div id="jobFormPanel"></div>
    ${state.jobs.length===0 ? `
    <div class="glass" style="padding:40px;text-align:center;">
      <div style="width:48px;height:48px;border-radius:12px;background:var(--primary-light);color:var(--primary);font-weight:700;font-size:22px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;">+</div>
      <h3 style="margin:0 0 6px;">No open roles yet</h3>
      <p style="color:var(--text-secondary);margin:0;">Post your first real job to start collecting referrals.</p>
    </div>` : `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">
      ${state.jobs.map(j=>{
        const refCount = state.referrals.filter(r=>r.jobId===j.id).length;
        return `
      <div class="glass job-card" style="padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;">${j.dept}</div>
          <span class="chip" style="background:${j.status==='Open'?'rgba(5,150,105,0.12)':'rgba(100,116,139,0.12)'};color:${j.status==='Open'?'#047857':'var(--text-secondary)'};">${j.status}</span>
        </div>
        <h3 style="font-size:16px;font-weight:700;margin:0 0 6px;">${j.title}</h3>
        <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:14px;">${j.exp} · ${j.location} · Posted ${fmtRelative(j.posted)}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin-bottom:12px;">
          <div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Salary</div><div style="font-size:13px;font-weight:600;color:var(--text-primary);">${j.salary}</div></div>
          <div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Bonus</div><div style="font-size:13px;font-weight:700;color:var(--teal);">₹${(j.bonus||0).toLocaleString('en-IN')}</div></div>
          <div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Referrals</div><div style="font-size:13px;font-weight:600;color:var(--text-primary);">${refCount}</div></div>
        </div>
        <div style="margin-bottom:14px;">${j.skills.slice(0,4).map((s,k)=>`<span class="skill-bubble" style="background:${skillTagColor(k)};animation:none;">${s}</span>`).join('')}</div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline" style="flex:1;" data-edit-job="${j.id}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Edit</button>
          <button class="btn btn-danger-ghost" data-delete-job="${j.id}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg> Delete</button>
        </div>
      </div>`}).join('')}
    </div>`}
  </div>`;
}
function jobFormHTML(job){
  const isEdit = !!job;
  return `
  <div class="glass pop-in" style="padding:22px;margin-bottom:18px;">
    <h3 style="margin:0 0 14px;font-size:14.5px;">${isEdit?'Edit Job':'New Job'}</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div style="grid-column:1/-1;"><label class="field-label">Title *</label><input class="input" id="jobTitle" value="${job?.title||''}"/></div>
      <div><label class="field-label">Department</label><input class="input" id="jobDept" value="${job?.dept||'General'}"/></div>
      <div><label class="field-label">Experience</label><input class="input" id="jobExp" value="${job?.exp||'0-2 yrs'}"/></div>
      <div><label class="field-label">Location</label><input class="input" id="jobLocation" value="${job?.location||'Bengaluru'}"/></div>
      <div><label class="field-label">Salary Range</label><input class="input" id="jobSalary" value="${job?.salary||'TBD'}"/></div>
      <div><label class="field-label">Referral Bonus (₹)</label><input class="input" type="number" id="jobBonus" value="${job?.bonus||50000}"/></div>
      <div><label class="field-label">Status</label>
        <select class="input" id="jobStatus"><option ${job?.status==='Open'?'selected':''}>Open</option><option ${job?.status==='Closed'?'selected':''}>Closed</option></select>
      </div>
      <div style="grid-column:1/-1;"><label class="field-label">Skills (comma-separated)</label><input class="input" id="jobSkills" value="${(job?.skills||[]).join(', ')}"/></div>
      <div style="grid-column:1/-1;"><label class="field-label">Description</label><textarea class="input" id="jobDescription" rows="4">${job?.description||''}</textarea></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px;">
      <button class="btn btn-primary" id="saveJobBtn">${isEdit?'Save Changes':'Post Job'}</button>
      <button class="btn btn-ghost" id="cancelJobForm">Cancel</button>
    </div>
  </div>`;
}
function readJobForm(){
  return {
    title: document.getElementById('jobTitle').value.trim(),
    dept: document.getElementById('jobDept').value.trim() || 'General',
    exp: document.getElementById('jobExp').value.trim() || '—',
    location: document.getElementById('jobLocation').value.trim() || 'Remote',
    salary: document.getElementById('jobSalary').value.trim() || 'TBD',
    bonus: parseInt(document.getElementById('jobBonus').value, 10) || 0,
    status: document.getElementById('jobStatus').value,
    skills: document.getElementById('jobSkills').value.split(',').map(s=>s.trim()).filter(Boolean),
    description: document.getElementById('jobDescription').value.trim(),
  };
}
function bindManageJobs(){
  const panel = document.getElementById('jobFormPanel');

  const newJobBtn = document.getElementById('openNewJobForm');
  if(newJobBtn) newJobBtn.addEventListener('click', ()=>{
    panel.innerHTML = jobFormHTML(null);
    document.getElementById('cancelJobForm').addEventListener('click', ()=> panel.innerHTML='');
    document.getElementById('saveJobBtn').addEventListener('click', async ()=>{
      const fields = readJobForm();
      if(!fields.title){ toast('Job title is required', 'amber'); return; }
      const saveBtn = document.getElementById('saveJobBtn');
      saveBtn.disabled = true; saveBtn.textContent = 'Posting…';
      try{
        const job = await createJobBackend(fields);
        state.jobs.unshift(job);
        toast('Job posted', 'success');
        nav('manageJobs');
      }catch(e){ toast('Could not post job: '+e.message, 'error'); saveBtn.disabled=false; saveBtn.textContent='Post Job'; }
    });
  });

  document.querySelectorAll('[data-edit-job]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const job = jobById(btn.dataset.editJob);
      panel.innerHTML = jobFormHTML(job);
      panel.scrollIntoView({behavior:'smooth', block:'center'});
      document.getElementById('cancelJobForm').addEventListener('click', ()=> panel.innerHTML='');
      document.getElementById('saveJobBtn').addEventListener('click', async ()=>{
        const fields = readJobForm();
        if(!fields.title){ toast('Job title is required', 'amber'); return; }
        const saveBtn = document.getElementById('saveJobBtn');
        saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
        try{
          const updated = await api(`/api/jobs/${job.id}`, {method:'PUT', body:fields});
          const idx = state.jobs.findIndex(j=>j.id===job.id);
          if(idx>-1) state.jobs[idx] = updated;
          toast('Job updated', 'success');
          nav('manageJobs');
        }catch(e){ toast('Could not save job: '+e.message, 'error'); saveBtn.disabled=false; saveBtn.textContent='Save Changes'; }
      });
    });
  });

  document.querySelectorAll('[data-delete-job]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const job = jobById(btn.dataset.deleteJob);
      if(!confirm(`Delete "${job.title}"? Existing referrals are retained for audit (soft delete).`)) return;
      try{
        await api(`/api/jobs/${job.id}`, {method:'DELETE'});
        state.jobs = state.jobs.filter(j=>j.id!==job.id);
        toast('Job deleted', 'success');
        render();
      }catch(e){ toast('Could not delete: '+e.message, 'error'); }
    });
  });

  const btn = document.getElementById('openJdGenerator');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    const jdPanel = document.getElementById('jdGeneratorPanel');
    jdPanel.innerHTML = `
    <div class="glass pop-in" style="padding:22px;margin-bottom:18px;">
      <h3 style="margin:0 0 10px;font-size:14.5px;">AI Job Description Generator</h3>
      <textarea class="input" id="jdBrief" rows="2" placeholder="e.g. Need a Python Developer, 3-5 yrs experience, Bangalore, strong in Django and AWS"></textarea>
      <div style="display:flex;gap:10px;margin-top:10px;">
        <button class="btn btn-cyan" id="generateJdBtn">Generate JD</button>
        <button class="btn btn-ghost" id="closeJdPanel">Cancel</button>
      </div>
      <div id="jdOutput" style="margin-top:14px;"></div>
    </div>`;
    document.getElementById('closeJdPanel').addEventListener('click', ()=> jdPanel.innerHTML='');
    document.getElementById('generateJdBtn').addEventListener('click', async ()=>{
      const brief = document.getElementById('jdBrief').value.trim();
      if(!brief){ toast('Describe the role first', 'amber'); return; }
      const gbtn = document.getElementById('generateJdBtn'); gbtn.disabled=true; gbtn.textContent='Generating…';
      try{
        const jd = await aiGenerateJD(brief);
        document.getElementById('jdOutput').innerHTML = `
          <div class="glass" style="padding:16px;font-size:12.5px;white-space:pre-wrap;line-height:1.65;max-height:320px;overflow-y:auto;">${jd}</div>
          <button class="btn btn-primary" id="publishJdBtn" style="margin-top:12px;">Publish as Open Role</button>`;
        document.getElementById('publishJdBtn').addEventListener('click', async ()=>{
          const publishBtn = document.getElementById('publishJdBtn');
          publishBtn.disabled = true; publishBtn.textContent = 'Publishing…';
          const titleGuess = brief.replace(/^need\s+a?n?\s*/i,'').split(',')[0];
          try{
            const job = await createJobBackend({
              title: titleGuess.slice(0,60), dept:'General', exp:'—', location:'Bengaluru', salary:'TBD', bonus:50000,
              skills: brief.split(/,| and /i).slice(1).map(s=>s.trim()).filter(Boolean).slice(0,6),
              status:'Open', description: jd,
            });
            state.jobs.unshift(job);
            toast('Job published', 'success');
            nav('manageJobs');
          }catch(e){ toast('Could not publish job: '+e.message, 'error'); publishBtn.disabled=false; publishBtn.textContent='Publish as Open Role'; }
        });
      }catch(e){ toast('AI generation failed', 'error'); }
      gbtn.disabled=false; gbtn.textContent='Generate JD';
    });
  });
}

let refFilter = { q:'', status:'' };
function refMatchesFilter(r){
  if(refFilter.q){
    const job = jobById(r.jobId);
    const hay = ((r.candidateName||'')+' '+(r.email||'')+' '+((r.skills||[]).join(' '))+' '+(job?job.title:'')+' '+((r.tags||[]).join(' '))).toLowerCase();
    if(!hay.includes(refFilter.q.toLowerCase())) return false;
  }
  const f = refFilter.status;
  if(!f) return true;
  if(f==='Auto Rejected') return r.autoRejected && r.status==='Rejected';
  if(f==='Rejected') return !r.autoRejected && r.status==='Rejected';
  if(f==='Screening') return r.status==='Resume Screening';
  return r.status===f;
}

function allReferralsView(){
  const statusOptions = ['Auto Rejected','Rejected','Screening','Shortlisted','Interview Scheduled','Interview Completed','Selected','Offer Released','Joined','Applied','Resume Screening'];
  const filtered = state.referrals.filter(refMatchesFilter);
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div>
        <h1 class="display" style="font-size:24px;margin:0;">Referral Management</h1>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">${state.referrals.length} candidate(s) · auto-rejected candidates stay visible for HR review</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" data-nav="bulkImport">⬆ Bulk Resume Import</button>
        <button class="btn btn-outline" id="compareModeBtn">Select 2 to Compare</button>
      </div>
    </div>
    <div class="glass search-bar" style="padding:14px;margin-bottom:14px;">
      <div class="search-row">
        <div style="flex:1;min-width:200px;position:relative;"><label class="field-label">Smart Search Candidates</label><input class="input" id="refSearchInput" placeholder="Type a name, email or skill…" value="${refFilter.q}"/></div>
        <div style="min-width:170px;"><label class="field-label">Status Filter</label>
          <select class="input" id="refStatusFilter"><option value="">All Statuses</option>${statusOptions.map(s=>`<option ${refFilter.status===s?'selected':''}>${s}</option>`).join('')}</select>
        </div>
        <div style="display:flex;align-items:end;">
          <div class="glass" style="padding:8px 14px;font-size:12px;color:var(--ink-soft);white-space:nowrap;"><strong class="mono" style="color:var(--primary);">${filtered.length}</strong> / ${state.referrals.length} shown</div>
        </div>
      </div>
    </div>
    <div class="glass" style="padding:6px;overflow-x:auto;">
      <table class="data-table">
        <thead><tr><th style="width:40px;"><input type="checkbox" id="compareSelectAll" style="display:none;"/></th><th>Candidate</th><th>Job</th><th>Referred By</th><th>AI Score</th><th>Match</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
        <tbody>
          ${filtered.map(r=>{
            const job = jobById(r.jobId); const emp = employeeById(r.referredBy);
            const isRejected = r.status==='Rejected';
            const score = r.aiScore?.overall||'—';
            return `<tr style="${isRejected?'opacity:0.85;':''}">
              <td><input type="checkbox" class="compare-check" data-id="${r.id}" style="display:none;"/></td>
              <td><strong>${r.candidateName}</strong>${r.fraudFlags&&r.fraudFlags.length?' <span title="Fraud flags present">🚩</span>':''}
                ${r.autoRejected?`<div style="font-size:10.5px;color:#DC2626;margin-top:2px;">⚡ Auto-rejected · orig ${r.originalMatch||'—'}%${r.evaluationHistory&&r.evaluationHistory.length?` · re-eval ${r.matchPercent||'—'}%`:''}</div>`:''}
                ${r.autoRejected&&r.rejectionReason?`<div style="font-size:10.5px;color:var(--ink-soft);margin-top:1px;">${r.rejectionReason}</div>`:''}
              </td>
              <td>${job?job.title:'—'}</td>
              <td>${emp?emp.name:'—'}</td>
              <td class="mono" style="font-weight:700;color:var(--primary);">${score}</td>
              <td class="mono" style="font-weight:700;color:${isRejected?'var(--coral)':'var(--primary)'};">${r.matchPercent||'—'}%</td>
              <td><select class="input" style="padding:6px 10px;font-size:12px;${isRejected?'color:#DC2626;':''}" data-status-select="${r.id}">
                ${PIPELINE_STAGES.concat('Rejected').map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
              </select></td>
              <td style="font-size:12px;color:var(--ink-soft);">${fmtRelative(r.submittedDate)}</td>
              <td><div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">
                ${isRejected?`<button class="btn" style="font-size:11px;padding:4px 8px;background:rgba(5,150,105,0.14);color:#059669;" data-reopen="${r.id}">Reopen</button>`:''}
                <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;" data-hr-view="${r.id}">Details</button>
                <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;color:var(--primary);" data-passport="${r.id}">AI Passport</button>
                ${isHrRole(state.role)?`<button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;color:var(--rose);" data-delete-ref="${r.id}">Delete</button>`:''}
              </div></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${filtered.length===0?`<div style="padding:30px;text-align:center;color:var(--ink-soft);font-size:13px;">No candidates match this filter.</div>`:''}
    </div>
    <div id="compareResultPanel"></div>
  </div>`;
}
function hrReferralModal(r){
  const job = jobById(r.jobId); const emp = employeeById(r.referredBy);
  const score = r.aiScore || {};
  return `
  <div class="modal-overlay" id="hrModalOverlay">
    <div class="glass-strong pop-in" style="max-width:640px;width:100%;padding:28px;max-height:88vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;">
        <div><h2 class="display" style="margin:0 0 2px;font-size:19px;">${r.candidateName}</h2>
        <div style="font-size:12.5px;color:var(--ink-soft);">${job?job.title:'—'} · Referred by ${emp?emp.name:'—'} (${r.relationship||'—'})</div></div>
        <button class="btn btn-ghost" id="closeHrModal" style="font-size:18px;">✕</button>
      </div>
      <div style="display:flex;gap:18px;align-items:center;margin:16px 0;">
        ${matchMeterSVG(r.matchPercent||0,70,7)}
        <div style="flex:1;font-size:12.5px;color:var(--ink-soft);">${r.aiSummary||'—'}</div>
      </div>
      ${r.autoRejected||r.status==='Rejected'?`
      <div style="padding:12px 14px;border-radius:12px;background:rgba(220,38,38,0.07);border:1px solid rgba(220,38,38,0.18);margin-bottom:14px;">
        <div style="font-weight:700;font-size:12.5px;color:var(--coral);margin-bottom:8px;">${r.autoRejected?'⚡ AI Auto-Rejected Candidate':'✕ Rejected Candidate'}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:8px;">
          ${passportStat('Original AI Match', (r.originalMatch||r.matchPercent||0)+'%')}
          ${passportStat('Re-Evaluation', (r.evaluationHistory&&r.evaluationHistory.length?r.matchPercent||'—':r.matchPercent||'—')+'%')}
          ${passportStat('Current Status', r.status)}
        </div>
        ${r.rejectionReason?`<div style="font-size:12px;color:var(--ink-soft);">Reason: ${r.rejectionReason}</div>`:''}
        <button class="btn btn-outline" style="font-size:12px;padding:6px 12px;color:#059669;margin-top:10px;" id="reopenBtn" data-reopen="${r.id}">↺ Reopen Candidate Profile</button>
      </div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
        <button class="btn btn-primary" style="font-size:12px;padding:6px 12px;" id="passportBtn" data-passport="${r.id}">AI Candidate Passport</button>
        <button class="btn btn-outline" style="font-size:12px;padding:6px 12px;" id="reanalyzeBtn" data-reanalyze="${r.id}">↻ Re-evaluate Resume</button>
        <button class="btn btn-outline" style="font-size:12px;padding:6px 12px;color:var(--primary);" id="overrideBtn" data-override="${r.id}">⚖ Override AI Decision</button>
        ${isHrRole(state.role)?`<button class="btn btn-ghost" style="font-size:12px;padding:6px 12px;color:var(--rose);margin-left:auto;" id="delRefBtn" data-delete-ref="${r.id}">Delete</button>`:''}
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px;">
        ${scoreBar('Resume Quality', score.resumeQuality||0)}${scoreBar('Skill Match', score.skillMatch||0)}
        ${scoreBar('Communication', score.communication||0)}${scoreBar('Experience Match', score.experienceMatch||0)}
      </div>
      <div style="padding:12px 14px;border-radius:12px;background:rgba(37,99,235,0.08);margin-bottom:14px;display:flex;justify-content:space-between;">
        <span style="font-size:13px;font-weight:700;">🎯 Interview Prediction</span>
        <span class="mono" style="font-weight:700;color:var(--primary);">${r.interviewPrediction?.chance||'—'}%</span>
      </div>
      <ul style="font-size:12.5px;color:var(--ink-soft);margin:0 0 14px;padding-left:18px;">${(r.interviewPrediction?.reasons||[]).map(x=>`<li>${x}</li>`).join('')}</ul>
      ${r.strengths&&r.strengths.length?`<div style="margin-bottom:10px;font-size:13px;font-weight:700;">💪 Strengths</div><div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:14px;">${r.strengths.join(' · ')}</div>`:''}
      ${r.weaknesses&&r.weaknesses.length?`<div style="margin-bottom:10px;font-size:13px;font-weight:700;">⚠️ Areas for Improvement</div><div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:14px;">${r.weaknesses.join(' · ')}</div>`:''}
      ${r.recommendation?`<div style="padding:10px 14px;border-radius:10px;background:rgba(5,150,105,0.08);margin-bottom:14px;font-size:12.5px;"><strong>Recommendation:</strong> ${r.recommendation}</div>`:''}
      <div style="margin-bottom:6px;font-size:13px;font-weight:700;">🚩 Fraud / Risk Check</div>
      <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:14px;">${r.fraudFlags&&r.fraudFlags.length? r.fraudFlags.join(' · ') : 'No risk flags detected.'}</div>
      ${(r.evaluationHistory||[]).length?`
      <div style="margin-bottom:6px;font-size:13px;font-weight:700;">🕓 AI Decision / Override History</div>
      <div style="border-left:2px solid rgba(217,119,6,0.25);padding-left:14px;margin-bottom:14px;">
        ${r.evaluationHistory.map(h=>`<div style="margin-bottom:10px;position:relative;">
          <div style="width:10px;height:10px;border-radius:50%;background:#D97706;position:absolute;left:-20px;top:4px;"></div>
          <div style="font-size:12px;font-weight:600;">${h.action}${h.verdict?` — <span style="color:var(--primary);">${h.verdict}</span>`:''}</div>
          <div style="font-size:11.5px;color:var(--ink-soft);">${h.fromStatus||'—'} → ${h.toStatus||'—'}${h.matchBefore!==undefined&&h.matchBefore!==null&&h.matchAfter!==undefined&&h.matchAfter!==null?` · match ${h.matchBefore}% → ${h.matchAfter}%`:''}</div>
          ${h.reason?`<div style="font-size:11.5px;color:var(--ink-soft);">${h.reason}</div>`:''}
          <div style="font-size:10.5px;color:var(--ink-soft);">${h.by||'System'} · ${h.at?new Date(h.at).toLocaleString():''}</div>
        </div>`).join('')}
      </div>`:''}
      <div id="activityTimeline-${r.id}" style="margin-top:14px;"></div>
      ${r.skills&&r.skills.length?`<div style="margin-bottom:6px;font-size:13px;font-weight:700;">Skills</div><div style="margin-bottom:14px;">${skillBubbles(r.skills)}</div>`:''}
      ${r.education?`<div style="margin-bottom:6px;font-size:13px;font-weight:700;">Education</div><div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:14px;">${r.education}</div>`:''}
      ${r.certifications&&r.certifications.length?`<div style="margin-bottom:6px;font-size:13px;font-weight:700;">Certifications</div><div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:14px;">${r.certifications.join(' · ')}</div>`:''}
      <div style="margin-bottom:6px;font-size:13px;font-weight:700;">Contact</div>
      <div style="font-size:12.5px;color:var(--ink-soft);">${r.email||'—'} · ${r.phone||'—'} · ${r.currentCompany||'—'} · ${r.currentDesignation||'—'}</div>
      <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">Experience: ${r.totalExperience||'—'} total, ${r.relevantExperience||'—'} relevant</div>
    </div>
  </div>`;
}
function bindAllReferrals(){
  const searchInput = document.getElementById('refSearchInput');
  if(searchInput){
    searchInput.addEventListener('input', (e)=>{ refFilter.q = e.target.value; render(); });
    searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') e.preventDefault(); });
  }
  const statusFilter = document.getElementById('refStatusFilter');
  if(statusFilter){
    statusFilter.addEventListener('change', (e)=>{ refFilter.status = e.target.value; render(); });
  }
  document.querySelectorAll('[data-status-select]').forEach(sel=>{
    sel.addEventListener('change', async ()=>{
      const r = state.referrals.find(x=>x.id===sel.dataset.statusSelect);
      const prevStatus = r.status;
      try{
        const updated = await updateReferralStatus(r.id, sel.value);
        r.status = updated.status;
        toast(`${r.candidateName} moved to ${sel.value}`, 'success');
      }catch(e){
        sel.value = prevStatus;
        toast('Could not update status: '+e.message, 'error');
      }
      render();
    });
  });
  document.querySelectorAll('[data-hr-view]').forEach(el=>{
    el.addEventListener('click', async ()=>{
      const r = state.referrals.find(x=>x.id===el.dataset.hrView);
      const wrap = document.createElement('div'); wrap.innerHTML = hrReferralModal(r);
      document.body.appendChild(wrap);
      document.getElementById('closeHrModal').addEventListener('click', ()=>wrap.remove());
      document.getElementById('hrModalOverlay').addEventListener('click',(e)=>{ if(e.target.id==='hrModalOverlay') wrap.remove(); });
      try{
        const activities = await api('/api/activity/'+r.id);
        const timeline = document.getElementById('activityTimeline-'+r.id);
        if(timeline && activities && activities.length){
          timeline.innerHTML = `
            <div style="margin-bottom:6px;font-size:13px;font-weight:700;">Activity Timeline</div>
            <div style="border-left:2px solid rgba(37,99,235,0.2);padding-left:14px;">
              ${activities.map(a=>`<div style="margin-bottom:10px;position:relative;">
                <div style="width:10px;height:10px;border-radius:50%;background:var(--primary);position:absolute;left:-20px;top:4px;"></div>
                <div style="font-size:12px;font-weight:600;">${a.action}</div>
                <div style="font-size:11.5px;color:var(--ink-soft);">${a.description}</div>
                <div style="font-size:10.5px;color:var(--ink-soft);">${fmtRelative(a.created_at)} · ${a.performedBy||'System'}</div>
              </div>`).join('')}
            </div>`;
        }
      }catch(e){ /* non-critical */ }
    });
  });
  document.querySelectorAll('[data-delete-ref]').forEach(el=>{
    el.addEventListener('click', async ()=>{
      const r = state.referrals.find(x=>x.id===el.dataset.deleteRef);
      if(!r) return;
      if(!confirm(`Delete the referral for "${r.candidateName}"? The record is soft-deleted and kept for audit.`)) return;
      try{
        await api(`/api/referrals/${r.id}`, {method:'DELETE'});
        toast(`Referral for ${r.candidateName} deleted`, 'success');
        document.getElementById('hrModalOverlay')?.remove();
        await refreshReferrals();
        render();
      }catch(e){ toast('Could not delete: '+e.message, 'error'); }
    });
  });

  document.querySelectorAll('[data-passport]').forEach(el=>{
    el.addEventListener('click', async ()=>{
      const r = state.referrals.find(x=>x.id===el.dataset.passport);
      if(r) await openPassportModal(r);
    });
  });

  document.querySelectorAll('[data-reanalyze]').forEach(el=>{
    el.addEventListener('click', async ()=>{
      const r = state.referrals.find(x=>x.id===el.dataset.reanalyze);
      if(!r) return;
      const btn = document.getElementById('reanalyzeBtn');
      if(btn){ btn.disabled=true; btn.textContent='Re-evaluating…'; }
      try{
        const res = await api(`/api/referrals/${r.id}/reanalyze`, {method:'POST'});
        const idx = state.referrals.findIndex(x=>x.id===r.id);
        if(idx>-1) state.referrals[idx] = res.referral;
        const statusMsg = res.reopened
          ? `${r.candidateName} reopened — new match ${res.referral.matchPercent}% (${res.verdict.category})`
          : `${r.candidateName} re-evaluated — match ${res.referral.matchPercent}% (${res.verdict.category})`;
        toast(statusMsg, res.reopened ? 'success' : 'primary');
        render();
      }catch(e){ toast('Re-evaluation failed: '+e.message, 'error'); }
      if(btn){ btn.disabled=false; btn.textContent='↻ Re-evaluate Resume'; }
    });
  });

  document.querySelectorAll('[data-reopen]').forEach(el=>{
    el.addEventListener('click', async ()=>{
      const r = state.referrals.find(x=>x.id===el.dataset.reopen);
      if(!r) return;
      if(!confirm(`Reopen "${r.candidateName}" and move them to "Resume Screening"?`)) return;
      try{
        await updateReferralStatus(r.id, 'Resume Screening');
        toast(`${r.candidateName} reopened for screening`, 'success');
        document.getElementById('hrModalOverlay')?.remove();
        render();
      }catch(e){ toast('Could not reopen: '+e.message, 'error'); }
    });
  });

  document.querySelectorAll('[data-override]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const r = state.referrals.find(x=>x.id===el.dataset.override);
      if(r) openOverrideModal(r, ()=>{ document.getElementById('hrModalOverlay')?.remove(); render(); });
    });
  });

  let compareMode = false;
  const compareBtn = document.getElementById('compareModeBtn');
  if(compareBtn) compareBtn.addEventListener('click', ()=>{
    compareMode = !compareMode;
    document.querySelectorAll('.compare-check').forEach(c=> c.style.display = compareMode?'inline-block':'none');
    if(compareMode){
      compareBtn.textContent = 'Run Comparison (select 2)';
      toast('Select exactly 2 candidates, then click again', 'primary');
      return;
    }
    const ids = [...document.querySelectorAll('.compare-check:checked')].map(c=>c.dataset.id);
    document.querySelectorAll('.compare-check:checked').forEach(c=> c.checked=false);
    if(ids.length<2){
      if(ids.length===0) toast('No candidates selected — select 2 to compare', 'amber');
      else toast('Select exactly 2 candidates to compare (you selected '+ids.length+')', 'amber');
      compareMode = true;
      document.querySelectorAll('.compare-check').forEach(c=> c.style.display='inline-block');
      compareBtn.textContent = 'Run Comparison (select 2)';
      return;
    }
    if(ids.length>2){
      toast('Only the first 2 selected candidates will be compared', 'amber');
    }
    runCompare(ids[0], ids[1]);
  });
}

function openOverrideModal(r, onDone){
  const overlay = document.createElement('div');
  overlay.innerHTML = `
  <div class="modal-overlay" id="overrideOverlay">
    <div class="glass-strong pop-in" style="max-width:480px;width:100%;padding:26px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <h2 class="display" style="margin:0;font-size:18px;">Override AI Decision</h2>
        <button class="btn btn-ghost" onclick="document.getElementById('overrideOverlay').remove()" style="font-size:18px;">✕</button>
      </div>
      <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:16px;">${r.candidateName} · current status <strong>${r.status}</strong> · AI match <strong class="mono">${r.matchPercent||'—'}%</strong></div>
      <div style="margin-bottom:14px;">
        <label class="field-label">Move candidate to</label>
        <select class="input" id="overrideTarget">
          <option value="Resume Screening">Resume Screening</option>
          <option value="Shortlisted">Shortlisted</option>
          <option value="Interview Scheduled">Interview</option>
          <option value="Interview Completed">Interview Completed</option>
          <option value="Offer Released">Offer Process</option>
          <option value="Selected">Selected</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
      <div style="margin-bottom:16px;">
        <label class="field-label">Reason for override (logged for audit)</label>
        <textarea class="input" id="overrideReason" rows="3" placeholder="e.g. Candidate has a strong portfolio despite the keyword gap — override to Shortlisted"></textarea>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" id="overrideConfirmBtn" style="flex:1;">Confirm Override</button>
        <button class="btn btn-ghost" onclick="document.getElementById('overrideOverlay').remove()">Cancel</button>
      </div>
      <div id="overrideResult" style="margin-top:12px;"></div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  document.getElementById('overrideOverlay').addEventListener('click', (e)=>{ if(e.target.id==='overrideOverlay') overlay.remove(); });
  document.getElementById('overrideConfirmBtn').addEventListener('click', async ()=>{
    const btn = document.getElementById('overrideConfirmBtn');
    btn.disabled = true; btn.textContent = 'Overriding…';
    try{
      const updated = await api(`/api/referrals/${r.id}/override`, {method:'POST', body:{
        targetStatus: document.getElementById('overrideTarget').value,
        reason: document.getElementById('overrideReason').value.trim(),
      }});
      const idx = state.referrals.findIndex(x=>x.id===r.id);
      if(idx>-1) state.referrals[idx] = updated;
      document.getElementById('overrideResult').innerHTML = `<div style="padding:10px 12px;border-radius:10px;background:rgba(5,150,105,0.12);font-size:12.5px;color:#059669;">Override recorded — ${r.candidateName} moved to <strong>${updated.status}</strong>.</div>`;
      toast('AI decision overridden', 'success');
      setTimeout(()=>{ overlay.remove(); onDone && onDone(); }, 900);
    }catch(e){
      document.getElementById('overrideResult').innerHTML = `<div style="padding:10px 12px;border-radius:10px;background:rgba(220,38,38,0.1);font-size:12.5px;color:var(--coral);">${e.message}</div>`;
      btn.disabled = false; btn.textContent = 'Confirm Override';
    }
  });
}

async function runCompare(idA, idB){
  const a = state.referrals.find(r=>r.id===idA), b = state.referrals.find(r=>r.id===idB);
  const panel = document.getElementById('compareResultPanel');
  panel.innerHTML = `<div class="glass" style="padding:20px;margin-top:16px;"><div class="shimmer" style="height:60px;border-radius:12px;"></div></div>`;
  try{
    const result = await aiCompareCandidates(idA, idB);
    panel.innerHTML = `
    <div class="glass pop-in" style="padding:22px;margin-top:16px;">
      <h3 style="margin:0 0 14px;font-size:15px;">AI Comparison: ${a.candidateName} vs ${b.candidateName}</h3>
      <div style="display:flex;justify-content:space-between;padding:12px 16px;border-radius:12px;background:rgba(5,150,105,0.1);margin-bottom:14px;">
        <span style="font-weight:700;font-size:13.5px;">Stronger Candidate</span>
        <span style="font-weight:700;color:#059669;">${result.strongerCandidate==='A'?a.candidateName:b.candidateName}</span>
      </div>
      <p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px;">${result.verdict}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div><div style="font-weight:700;font-size:12.5px;margin-bottom:6px;">${a.candidateName}</div><ul style="font-size:12px;color:var(--ink-soft);padding-left:16px;">${(result.candidateAStrengths||[]).map(s=>`<li>${s}</li>`).join('')}</ul></div>
        <div><div style="font-weight:700;font-size:12.5px;margin-bottom:6px;">${b.candidateName}</div><ul style="font-size:12px;color:var(--ink-soft);padding-left:16px;">${(result.candidateBStrengths||[]).map(s=>`<li>${s}</li>`).join('')}</ul></div>
      </div>
    </div>`;
  }catch(e){ panel.innerHTML=''; toast('Comparison failed', 'error'); }
}

function employeesView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <h1 class="display" style="font-size:24px;margin:0;">Employees</h1>
      ${isHrRole(state.role) ? `<button class="btn btn-primary" id="openAddEmployee">Add Employee</button>` : ''}
    </div>
    <div id="addEmployeePanel"></div>
    ${state.employees.length===0 ? `
    <div class="glass" style="padding:40px;text-align:center;">
      <h3 style="margin:0 0 6px;">No employees yet</h3>
      <p style="color:var(--ink-soft);margin:0;">${isHrRole(state.role) ? 'Add your first real employee to get referrals flowing.' : 'HR hasn\'t added any employees yet.'}</p>
    </div>` : `
    <div class="glass" style="padding:6px;overflow-x:auto;">
      <table class="data-table">
        <thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th>Login</th><th>Referrals</th><th>Selected</th><th>Bonus Earned</th><th>Status</th>${isHrRole(state.role)?'<th></th>':''}</tr></thead>
        <tbody>
          ${state.employees.map(e=>{
            const refs = state.referrals.filter(r=>r.referredBy===e.id);
            const selected = refs.filter(r=>r.status==='Joined').length;
            const bonus = refs.filter(r=>r.status==='Joined').reduce((s,r)=>s+(jobById(r.jobId)?.bonus||0),0);
            return `<tr style="${e.isActive===false?'opacity:0.5;':''}">
              <td style="display:flex;align-items:center;gap:10px;"><div style="width:32px;height:32px;border-radius:50%;background:${e.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">${initials(e.name)}</div>${e.name}</td>
              <td>${e.dept}</td>
              <td>${e.designation||'—'}</td>
              <td>${e.hasLogin ? `<span class="chip" style="background:${isHrRole(e.role)?'rgba(37,99,235,0.12)':'rgba(8,145,178,0.12)'};color:${isHrRole(e.role)?'var(--primary)':'var(--cyan)'};">${roleLabel(e.role)}</span>` : '<span style="color:var(--ink-soft);font-size:12px;">No login</span>'}</td>
              <td>${refs.length}</td><td>${selected}</td><td>₹${bonus.toLocaleString('en-IN')}</td>
              <td>${e.isActive===false ? '<span class="chip" style="background:rgba(220,38,38,0.15);color:var(--coral);">Inactive</span>' : '<span class="chip" style="background:rgba(5,150,105,0.15);color:#059669;">Active</span>'}</td>
              ${isHrRole(state.role)?`<td><button class="btn btn-ghost" data-toggle-employee="${e.id}" data-active="${e.isActive!==false}">${e.isActive===false?'Reactivate':'Deactivate'}</button></td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`}
  </div>`;
}
function addEmployeeFormHTML(){
  return `
  <div class="glass pop-in" style="padding:22px;margin-bottom:18px;">
    <h3 style="margin:0 0 14px;font-size:14.5px;">Add a real employee</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div><label class="field-label">Full name *</label><input class="input" id="newEmpName"/></div>
      <div><label class="field-label">Work email *</label><input class="input" id="newEmpEmail"/></div>
      <div><label class="field-label">Department</label><input class="input" id="newEmpDept" value="General"/></div>
      <div><label class="field-label">Designation</label><input class="input" id="newEmpDesignation" placeholder="e.g. Senior Engineer"/></div>
      <div><label class="field-label">Account type</label>
        <select class="input" id="newEmpRole"><option value="employee">Employee</option><option value="hr">HR / Admin</option></select>
      </div>
    </div>
    <label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12.5px;color:var(--ink-soft);">
      <input type="checkbox" id="newEmpCreateLogin" checked/> Create a login for them (a temporary password will be generated)
    </label>
    <div style="display:flex;gap:10px;margin-top:14px;">
      <button class="btn btn-primary" id="saveEmployeeBtn">Add Employee</button>
      <button class="btn btn-ghost" id="cancelAddEmployee">Cancel</button>
    </div>
    <div id="addEmployeeResult" style="margin-top:14px;"></div>
  </div>`;
}
function bindEmployeesView(){
  const openBtn = document.getElementById('openAddEmployee');
  if(openBtn) openBtn.addEventListener('click', ()=>{
    document.getElementById('addEmployeePanel').innerHTML = addEmployeeFormHTML();
    document.getElementById('cancelAddEmployee').addEventListener('click', ()=> document.getElementById('addEmployeePanel').innerHTML='');
    document.getElementById('saveEmployeeBtn').addEventListener('click', async ()=>{
      const name = document.getElementById('newEmpName').value.trim();
      const email = document.getElementById('newEmpEmail').value.trim();
      const dept = document.getElementById('newEmpDept').value.trim() || 'General';
      const designation = document.getElementById('newEmpDesignation')?.value?.trim() || '';
      const role = document.getElementById('newEmpRole').value;
      const createLogin = document.getElementById('newEmpCreateLogin').checked;
      if(!name || !email){ toast('Name and email are required', 'amber'); return; }
      const saveBtn = document.getElementById('saveEmployeeBtn');
      saveBtn.disabled = true; saveBtn.textContent = 'Adding…';
      try{
        const result = await api('/api/employees', {method:'POST', body:{name, email, dept, designation, role, createLogin}});
        state.employees.push(result.employee);
        const resultEl = document.getElementById('addEmployeeResult');
        if(result.temporaryPassword){
          resultEl.innerHTML = `<div class="glass" style="padding:14px;font-size:12.5px;">
            <strong>${name}</strong> was added. Share these one-time login details securely:<br/>
            Email: <span class="mono">${email}</span><br/>
            Temporary password: <span class="mono" style="color:var(--primary);font-weight:700;">${result.temporaryPassword}</span>
          </div>`;
        } else {
          resultEl.innerHTML = `<div class="glass" style="padding:14px;font-size:12.5px;">${name} was added (no login account created).</div>`;
        }
        toast('Employee added', 'success');
        render();
      }catch(e){
        toast('Could not add employee: '+e.message, 'error');
        saveBtn.disabled = false; saveBtn.textContent = 'Add Employee';
      }
    });
  });
  document.querySelectorAll('[data-toggle-employee]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.dataset.toggleEmployee;
      const currentlyActive = btn.dataset.active === 'true';
      try{
        const updated = await api(`/api/employees/${id}`, {method:'PUT', body:{isActive: !currentlyActive}});
        const idx = state.employees.findIndex(e=>e.id===id);
        if(idx>-1) state.employees[idx] = updated;
        toast(currentlyActive ? 'Employee deactivated' : 'Employee reactivated', 'success');
        render();
      }catch(e){ toast('Could not update employee: '+e.message, 'error'); }
    });
  });
}

function analyticsView(){
  const ranked = state.employees.map(e=>({...e,count:state.referrals.filter(r=>r.referredBy===e.id).length})).sort((a,b)=>b.count-a.count).slice(0,5);
  const rejected = state.referrals.filter(r=>r.status==='Rejected');
  return `
  <div class="fade-up">
    <h1 class="display" style="font-size:24px;margin:0 0 18px;">Referral Analytics</h1>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;">
      <div class="glass" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14.5px;">Hiring Funnel</h3><canvas id="chartFunnel" height="170"></canvas></div>
      <div class="glass" style="padding:20px;">
        <h3 style="margin:0 0 12px;font-size:14.5px;">Top Referrers</h3>
        ${ranked.map((e,i)=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(226,232,240,0.08);">
          <div style="width:28px;height:28px;border-radius:50%;background:${e.color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${initials(e.name)}</div>
          <div style="flex:1;font-size:12.5px;">${e.name}</div><div class="mono" style="font-weight:700;color:var(--primary);">${e.count}</div>
        </div>`).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-top:16px;">
      <div class="glass" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14.5px;">Referral Source</h3><canvas id="chartSource" height="170"></canvas></div>
      <div class="glass" style="padding:20px;">
        <h3 style="margin:0 0 12px;font-size:14.5px;">Rejected Candidates</h3>
        ${rejected.length===0?'<div style="font-size:12.5px;color:var(--ink-soft);">No rejections recorded.</div>':rejected.map(r=>`
        <div style="font-size:12.5px;padding:8px 0;border-bottom:1px solid rgba(226,232,240,0.08);"><strong>${r.candidateName}</strong> — ${jobById(r.jobId)?.title||'—'}<br/><span style="color:var(--ink-soft);">Score ${r.aiScore?.overall||'—'}/100, missing: ${(r.missingSkills||[]).join(', ')||'—'}</span></div>`).join('')}
      </div>
    </div>
  </div>`;
}

function aiSettingsView(){
  const s = state.settings;
  const toggles = [
    ['resumeParsing','AI Resume Parsing','Extract skills, experience & education automatically'],
    ['duplicateDetection','Duplicate Detection','Flag candidates already referred by someone else'],
    ['fraudDetection','Fraud Detection','Detect exaggerated or AI-generated resumes'],
    ['interviewPrediction','Interview Prediction','Estimate chance of clearing interviews'],
    ['chatAssistant','AI Chat Assistant','Let employees ask the AI assistant questions'],
  ];
  return `
  <div class="fade-up" style="max-width:640px;">
    <h1 class="display" style="font-size:24px;margin:0 0 6px;">AI Settings</h1>
    <p style="color:var(--ink-soft);font-size:13px;margin:0 0 18px;">Model: <span class="mono" style="color:var(--primary);">${state.settings.aiProvider||'ollama'}/${state.settings.aiModel||'llama3.2'}</span></p>
    <div class="glass" style="padding:8px;">
      ${toggles.map(([key,label,desc])=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid rgba(226,232,240,0.08);">
        <div><div style="font-weight:700;font-size:13.5px;">${label}</div><div style="font-size:12px;color:var(--ink-soft);">${desc}</div></div>
        <label style="position:relative;display:inline-block;width:44px;height:24px;">
          <input type="checkbox" data-setting="${key}" ${s[key]?'checked':''} style="opacity:0;width:0;height:0;">
          <span class="toggle-slider" data-slider-for="${key}" style="position:absolute;inset:0;background:${s[key]?'linear-gradient(135deg,#2563EB,#1D4ED8)':'#CBD5E1'};border-radius:24px;transition:.2s;cursor:pointer;"></span>
          <span style="position:absolute;top:3px;left:${s[key]?'23px':'3px'};width:18px;height:18px;background:#fff;border-radius:50%;transition:.2s;pointer-events:none;" data-knob-for="${key}"></span>
        </label>
      </div>`).join('')}
    </div>
  </div>`;
}
function bindAiSettings(){
  document.querySelectorAll('[data-setting]').forEach(inp=>{
    inp.addEventListener('change', async ()=>{
      const key = inp.dataset.setting;
      const prev = state.settings[key];
      state.settings[key] = inp.checked;
      const slider = document.querySelector(`[data-slider-for="${key}"]`);
      const knob = document.querySelector(`[data-knob-for="${key}"]`);
      slider.style.background = inp.checked ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : '#CBD5E1';
      knob.style.left = inp.checked ? '23px' : '3px';
      try{
        const updated = await updateSettingsBackend({[key]: inp.checked});
        state.settings = updated;
        toast(inp.checked ? 'Feature enabled' : 'Feature disabled', 'success');
      }catch(e){
        state.settings[key] = prev; inp.checked = prev;
        slider.style.background = prev ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : '#CBD5E1';
        knob.style.left = prev ? '23px' : '3px';
        toast('Could not update setting: '+e.message, 'error');
      }
    });
  });
}

/* ------------------------------- AI Shortlisting (HR) ------------------------------- */
function aiShortlistView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <div><h1 class="display" style="font-size:24px;margin:0 0 4px;">AI Shortlisting</h1>
      <p style="color:var(--ink-soft);font-size:13px;margin:0;">Auto-rank candidates and shortlist the best matches for each role</p></div>
    </div>
    <div class="glass search-bar" style="padding:18px;margin-bottom:18px;">
      <div class="search-row">
        <div>
          <label class="field-label">Job</label>
          <select class="input" id="slJobSelect">
            <option value="">All Jobs</option>
            ${state.jobs.map(j=>`<option value="${j.id}">${j.title} (${j.dept})</option>`).join('')}
          </select>
        </div>
        <div style="position:relative;">
          <label class="field-label">Smart Search Candidates</label>
          <input class="input" id="slSearchInput" placeholder="Type a name, email or skill…" autocomplete="off"/>
          <div id="slSearchSuggest" class="glass-strong suggest-box"></div>
        </div>
        <div>
          <label class="field-label">Auto-Recommend Threshold: <span class="mono" id="slThreshVal" style="color:var(--primary);font-weight:700;">80%</span></label>
          <input type="range" id="slThreshRange" min="30" max="95" step="1" value="80" style="width:100%;accent-color:#2563EB;"/>
          <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink-soft);margin-top:2px;"><span>&lt;40 Auto-Reject</span><span>40–79 HR Review</span><span>&gt;=80 Recommend</span></div>
        </div>
        <div style="display:flex;align-items:end;">
          <button class="btn btn-primary" id="slRunBtn" style="padding:11px 18px;white-space:nowrap;">Run AI Shortlist</button>
        </div>
      </div>
    </div>
    <div id="slResults"></div>
  </div>`;
}

async function bindAiShortlist(){
  const searchInput = document.getElementById('slSearchInput');
  const suggestBox = document.getElementById('slSearchSuggest');
  if(searchInput) searchInput.addEventListener('input', ()=>{
    const q = searchInput.value.trim().toLowerCase();
    const cands = state.referrals.filter(r=>{
      const job = jobById(r.jobId);
      const hay = ((r.candidateName||'')+' '+(r.email||'')+' '+((r.skills||[]).join(' '))+' '+(job?job.title:'')).toLowerCase();
      return q && hay.includes(q);
    }).slice(0,8);
    if(!q || cands.length===0){ suggestBox.style.display='none'; return; }
    suggestBox.innerHTML = cands.map(r=>`
      <div data-sl-pick="${r.id}" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:8px;cursor:pointer;">
        <span style="font-size:12.5px;font-weight:600;">${r.candidateName}</span>
        <span style="font-size:11px;color:var(--ink-soft);">${jobById(r.jobId)?jobById(r.jobId).title:'—'} · ${r.matchPercent||'—'}%</span>
      </div>`).join('');
    suggestBox.style.display='block';
  });
  document.addEventListener('click', e=>{ if(!e.target.closest('#slSearchInput') && !e.target.closest('#slSearchSuggest')) suggestBox.style.display='none'; });
  document.getElementById('slSearchSuggest')?.addEventListener('click', e=>{
    const pick = e.target.closest('[data-sl-pick]');
    if(!pick) return;
    searchInput.value = state.referrals.find(r=>r.id===pick.dataset.slPick)?.candidateName || '';
    suggestBox.style.display='none';
  });

  const range = document.getElementById('slThreshRange');
  const threshVal = document.getElementById('slThreshVal');
  if(range && threshVal){
    const sync = ()=>{ threshVal.textContent = range.value+'%'; };
    range.addEventListener('input', sync);
  }

  const runBtn = document.getElementById('slRunBtn');
  if(runBtn) runBtn.addEventListener('click', runShortlist);

  async function runShortlist(){
    const container = document.getElementById('slResults');
    const jobId = document.getElementById('slJobSelect').value;
    const threshold = parseInt(document.getElementById('slThreshRange').value, 10);
    let candidates = state.referrals.filter(r=> r.status !== 'Rejected' && r.status !== 'Withdrawn');
    if(jobId) candidates = candidates.filter(r=>r.jobId===jobId);
    if(candidates.length===0){
      container.innerHTML = '<div class="glass" style="padding:30px;text-align:center;color:var(--ink-soft);">No candidates found for the selected criteria.</div>';
      return;
    }
    container.innerHTML = `<div class="glass" style="padding:20px;"><div class="shimmer" style="height:60px;border-radius:12px;"></div><div style="font-size:12px;color:var(--ink-soft);margin-top:8px;text-align:center;">AI is shortlisting ${candidates.length} candidate(s)…</div></div>`;
    runBtn.disabled = true;
    try{
      const rows = await Promise.all(candidates.map(async r=>{
        const score = Math.round(r.matchPercent || r.aiScore?.overall || 50);
        const decision = await api('/api/ai/shortlist', {method:'POST', body:{jobId: r.jobId, matchPercent: score}});
        return {...r, score, decision};
      }));
      rows.sort((a,b)=>b.score-a.score);
      const counts = rows.reduce((acc, r)=>{
        if(r.decision.verdict==='recommended' || r.decision.verdict==='highly_recommended') acc.recommended++;
        else if(r.decision.verdict==='hr_review') acc.hr++;
        else acc.rejected++;
        return acc;
      }, {recommended:0, hr:0, rejected:0});

      const verdictStyle = {
        highly_recommended:{color:'#059669',bg:'rgba(5,150,105,0.15)'},
        recommended:{color:'#2563EB',bg:'rgba(37,99,235,0.15)'},
        hr_review:{color:'#D97706',bg:'rgba(217,119,6,0.15)'},
        rejected:{color:'#DC2626',bg:'rgba(220,38,38,0.15)'},
      };

      container.innerHTML = `
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        ${[
          ['Recommended', counts.recommended, '#2563EB'],
          ['HR Review', counts.hr, '#D97706'],
          ['Auto-Reject', counts.rejected, '#DC2626'],
        ].map(([label,val,color])=>`
          <div class="glass" style="padding:12px 18px;flex:1;min-width:140px;">
            <div class="mono" style="font-size:20px;font-weight:700;color:${color};">${val}</div>
            <div style="font-size:12px;color:var(--ink-soft);">${label}</div>
          </div>`).join('')}
      </div>
      <div class="glass" style="padding:6px;overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>#</th><th>Candidate</th><th>Job</th><th>Referred By</th><th>Match Score</th><th>AI Verdict</th><th>Recommended Action</th><th>Actions</th></tr></thead>
          <tbody>
            ${rows.map((r,i)=>{
              const job = jobById(r.jobId);
              const emp = employeeById(r.referredBy);
              const vs = verdictStyle[r.decision.verdict] || verdictStyle.hr_review;
              const aboveThreshold = r.score >= threshold;
              return `<tr style="opacity:${aboveThreshold?'1':'0.55'};">
                <td class="mono" style="font-weight:700;">#${i+1}</td>
                <td><strong>${r.candidateName}</strong><div style="font-size:11px;color:var(--ink-soft);">${r.email||''}</div></td>
                <td style="font-size:12.5px;">${job?job.title:'—'}</td>
                <td style="font-size:12.5px;">${emp?emp.name:'—'}</td>
                <td><div style="display:flex;align-items:center;gap:6px;"><div style="width:56px;height:6px;border-radius:3px;background:rgba(226,232,240,0.12);overflow:hidden;"><div style="width:${r.score}%;height:100%;background:${aboveThreshold?'#2563EB':'#94A3B8'};border-radius:3px;"></div></div><span class="mono" style="font-size:12px;font-weight:700;">${r.score}%</span></div></td>
                <td><span class="chip" style="background:${vs.bg};color:${vs.color};">${r.decision.category}</span></td>
                <td style="font-size:12px;max-width:180px;">${r.decision.action}</td>
                <td><div style="display:flex;gap:4px;flex-wrap:wrap;">
                  ${(r.decision.verdict==='recommended'||r.decision.verdict==='highly_recommended') ? `<button class="btn btn-primary" style="font-size:11px;padding:4px 10px;" data-sl-shortlist='${r.id}'>✓ Shortlist</button>` : ''}
                  ${r.decision.verdict==='rejected' ? `<button class="btn" style="font-size:11px;padding:4px 10px;background:rgba(220,38,38,0.12);color:var(--coral);" data-sl-reject='${r.id}'>✕ Reject</button>` : ''}
                  ${r.resumeFileUrl ? `<a class="btn btn-ghost" style="font-size:11px;padding:4px 10px;text-decoration:none;" href="${r.resumeFileUrl}" target="_blank">Resume</a>` : ''}
                </div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:10px;font-size:12px;color:var(--ink-soft);">${rows.length} candidate(s) · threshold ${threshold}% (candidates below are dimmed)</div>`;

      container.querySelectorAll('[data-sl-shortlist]').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          try{
            await updateReferralStatus(btn.dataset.slShortlist, 'Shortlisted');
            toast('Candidate shortlisted', 'success');
            await refreshReferrals();
            runShortlist();
          }catch(e){ toast('Failed: '+e.message, 'error'); }
        });
      });
      container.querySelectorAll('[data-sl-reject]').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          try{
            await updateReferralStatus(btn.dataset.slReject, 'Rejected');
            toast('Candidate rejected', 'success');
            await refreshReferrals();
            runShortlist();
          }catch(e){ toast('Failed: '+e.message, 'error'); }
        });
      });
    }catch(e){
      container.innerHTML = `<div class="glass" style="padding:20px;color:var(--coral);">Shortlist failed: ${e.message}</div>`;
    }
    runBtn.disabled = false;
  }
}

async function openPassportModal(r){
  const overlay = document.createElement('div');
  overlay.innerHTML = `
  <div class="modal-overlay" id="passportOverlay">
    <div class="glass-strong pop-in" style="max-width:680px;width:100%;padding:28px;max-height:88vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 class="display" style="margin:0;font-size:19px;">AI Candidate Passport</h2>
        <button class="btn btn-ghost" onclick="document.getElementById('passportOverlay').remove()" style="font-size:18px;">✕</button>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:12px;flex-wrap:wrap;">
        <div><div style="font-weight:700;font-size:15px;">${r.candidateName}</div>
        <div style="font-size:12.5px;color:var(--ink-soft);">${r.currentDesignation||'—'} · ${r.currentCompany||'—'} · ${r.totalExperience||'—'} exp</div></div>
        <div id="passportRiskPill" class="chip" style="padding:8px 16px;font-size:13px;font-weight:700;">Scanning…</div>
      </div>
      <div class="shimmer" id="passportLoading" style="height:200px;border-radius:12px;"></div>
      <div id="passportBody" style="display:none;"></div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  document.getElementById('passportOverlay').addEventListener('click', (e)=>{ if(e.target.id==='passportOverlay') overlay.remove(); });

  try{
    const res = await api('/api/ai/deep-screen', {method:'POST', body:{referralId: r.id}});
    const p = res.passport || {};
    const riskColor = p.riskLevel==='High'?'#DC2626':p.riskLevel==='Medium'?'#D97706':'#059669';
    const riskBg = riskColor+'18';
    const pill = document.getElementById('passportRiskPill');
    pill.style.background = riskBg; pill.style.color = riskColor;
    pill.textContent = `Risk ${p.riskScore}/100 · ${p.riskLevel}`;
    document.getElementById('passportLoading').remove();

    const dup = p.duplicate || {};
    const body = document.getElementById('passportBody');
    body.style.display='block';
    body.innerHTML = `
      ${p.aiNarrative?`<div style="padding:12px 14px;border-radius:12px;background:rgba(37,99,235,0.08);margin-bottom:16px;font-size:13px;line-height:1.6;">${p.aiNarrative}</div>`:''}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px;">
        ${passportStat('Resume Score', r.aiScore?.overall||'—')}
        ${passportStat('Match %', (r.matchPercent||0)+'%')}
        ${passportStat('Roles Detected', p.positionsDetected||0)}
        ${passportStat('Red Flags', (p.redFlags||[]).length)}
      </div>
      ${passportSection('🚩 Red Flags', (p.redFlags||[]).length? `<ul style="margin:0;padding-left:18px;color:var(--coral);">${p.redFlags.map(f=>`<li style="margin-bottom:6px;">${f}</li>`).join('')}</ul>` : '<div style="color:var(--ink-soft);font-size:12.5px;">No risk flags detected by AI screening.</div>')}
      ${passportSection('👥 Duplicate Check', dup.duplicate
        ? `<div style="color:#D97706;font-size:12.5px;">${(dup.matches||[]).map(m=>`Matches <strong>${m.candidateName}</strong> (${m.reasons.join(', ')}) — currently ${m.status}`).join('<br/>')}</div>`
        : '<div style="color:var(--ink-soft);font-size:12.5px;">No duplicate candidate found in the pipeline.</div>')}
      ${passportSection('📅 Employment Gaps', (p.employmentGaps||[]).length
        ? (p.employmentGaps||[]).map(g=>`<div style="font-size:12.5px;margin-bottom:6px;">${g.from} → ${g.to}: <strong>${g.months}-month gap</strong></div>`).join('')
        : '<div style="color:var(--ink-soft);font-size:12.5px;">No significant employment gaps (&gt;3 months) detected.</div>')}
      ${passportSection('📅 Date Integrity', (p.dateConflicts||[]).length
        ? (p.dateConflicts||[]).map(c=>`<div style="font-size:12.5px;color:var(--coral);margin-bottom:6px;">• ${c.note}</div>`).join('')
        : '<div style="color:var(--ink-soft);font-size:12.5px;">Dates are internally consistent.</div>')}
      ${passportSection('💼 Credibility', (p.credibilityFlags||[]).length
        ? (p.credibilityFlags||[]).map(c=>`<div style="font-size:12.5px;color:var(--coral);margin-bottom:6px;">• ${c.note}</div>`).join('')
        : '<div style="color:var(--ink-soft);font-size:12.5px;">Claimed experience is consistent with the timeline shown.</div>')}
      <div style="font-size:11px;color:var(--ink-soft);margin-top:14px;">Screened ${p.checkedAt?new Date(p.checkedAt).toLocaleString():''}</div>`;
  }catch(e){
    document.getElementById('passportLoading')?.remove();
    document.getElementById('passportBody').style.display='block';
    document.getElementById('passportBody').innerHTML = `<div style="padding:20px;color:var(--coral);font-size:13px;">Passport could not be generated: ${e.message}</div>`;
    const pill = document.getElementById('passportRiskPill');
    if(pill) pill.textContent = 'Unavailable';
  }
}
function passportStat(label, value){
  return `<div class="glass" style="padding:12px 14px;">
    <div class="mono" style="font-size:17px;font-weight:700;color:var(--primary);">${value}</div>
    <div style="font-size:11.5px;color:var(--ink-soft);">${label}</div>
  </div>`;
}
function passportSection(title, content){
  return `<div style="margin-bottom:16px;">
    <div style="font-weight:700;font-size:13px;margin-bottom:8px;">${title}</div>
    <div style="font-size:12.5px;color:var(--ink);line-height:1.6;">${content}</div>
  </div>`;
}

/* ------------------------------- Bulk Resume Import (HR) ------------------------------- */
let bulkFiles = [];
function bulkImportView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <div>
        <h1 class="display" style="font-size:24px;margin:0 0 4px;">Bulk Resume Import</h1>
        <p style="color:var(--ink-soft);font-size:13px;margin:0;">Upload multiple resumes — OCR, JD matching, AI scoring, duplicate / gap / fake-experience detection and candidate passports run automatically.</p>
      </div>
    </div>
    <div class="glass" style="padding:18px;margin-bottom:16px;">
      <div class="search-row">
        <div style="flex:1;min-width:220px;">
          <label class="field-label">Target Job (for JD matching)</label>
          <select class="input" id="bulkJobSelect">
            <option value="">— No job selected (heuristic match only) —</option>
            ${state.jobs.filter(j=>j.status==='Open').map(j=>`<option value="${j.id}">${j.title} (${j.dept})</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="bulkDropzone" class="bulk-dropzone" style="margin-top:14px;">
        <div style="font-size:30px;margin-bottom:8px;">📄</div>
        <div style="font-weight:700;font-size:14px;">Drag & drop resume files here</div>
        <div style="font-size:12px;color:var(--ink-soft);margin:6px 0 12px;">or click to browse · PDF, DOC, DOCX, TXT, PNG, JPG (max 10 MB each)</div>
        <button class="btn btn-outline" id="bulkBrowseBtn" type="button">Choose Files</button>
        <input type="file" id="bulkFileInput" multiple accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp" style="display:none;"/>
      </div>
      <div id="bulkFileList" style="margin-top:12px;"></div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:14px;">
        <button class="btn btn-primary" id="bulkImportBtn" disabled>⬆ Import Resumes</button>
        <span id="bulkFileCount" style="font-size:12.5px;color:var(--ink-soft);">No files selected</span>
        <button class="btn btn-ghost" id="bulkClearBtn" style="display:none;">Clear</button>
      </div>
    </div>
    <div id="bulkProgress" style="display:none;margin-bottom:16px;">
      <div class="glass" style="padding:18px;">
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:8px;" id="bulkProgressMsg">Processing resumes…</div>
        <div style="height:8px;border-radius:4px;background:rgba(226,232,240,0.12);overflow:hidden;"><div id="bulkProgressBar" style="width:0%;height:100%;background:linear-gradient(120deg,var(--primary),var(--indigo));transition:width .4s;"></div></div>
      </div>
    </div>
    <div id="bulkResults"></div>
  </div>`;
}

function renderBulkFileList(){
  const listEl = document.getElementById('bulkFileList');
  const countEl = document.getElementById('bulkFileCount');
  const btn = document.getElementById('bulkImportBtn');
  const clearBtn = document.getElementById('bulkClearBtn');
  if(!listEl) return;
  if(bulkFiles.length===0){
    listEl.innerHTML = '';
    countEl.textContent = 'No files selected';
    btn.disabled = true;
    clearBtn.style.display = 'none';
    return;
  }
  listEl.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;">${bulkFiles.map((f,i)=>`
    <div class="glass" style="padding:8px 12px;display:flex;align-items:center;gap:8px;font-size:12px;">
      <span>📄</span><span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.name}</span>
      <span style="color:var(--ink-soft);font-size:11px;">${(f.size/1024).toFixed(0)} KB</span>
      <button class="btn btn-ghost" style="font-size:14px;padding:0 4px;color:var(--coral);" data-bulk-remove="${i}">✕</button>
    </div>`).join('')}</div>`;
  countEl.textContent = `${bulkFiles.length} file(s) selected`;
  btn.disabled = false;
  clearBtn.style.display = '';
}

function bindBulkImport(){
  const dropzone = document.getElementById('bulkDropzone');
  const fileInput = document.getElementById('bulkFileInput');

  function addFiles(list){
    for(const f of list){
      if(bulkFiles.length>=50){ toast('Max 50 files', 'amber'); break; }
      if(bulkFiles.some(x=>x.name===f.name && x.size===f.size)) continue;
      bulkFiles.push(f);
    }
    renderBulkFileList();
  }

  dropzone.addEventListener('click', (e)=>{ if(e.target.id!=='bulkBrowseBtn') fileInput.click(); });
  document.getElementById('bulkBrowseBtn').addEventListener('click', (e)=>{ e.stopPropagation(); fileInput.click(); });
  fileInput.addEventListener('change', ()=> addFiles([...fileInput.files]));
  ['dragover','dragenter'].forEach(ev=> dropzone.addEventListener(ev, (e)=>{ e.preventDefault(); dropzone.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(ev=> dropzone.addEventListener(ev, (e)=>{ e.preventDefault(); dropzone.classList.remove('dragging'); }));
  dropzone.addEventListener('drop', (e)=> addFiles([...e.dataTransfer.files]));

  document.getElementById('bulkFileList').addEventListener('click', (e)=>{
    const rm = e.target.closest('[data-bulk-remove]');
    if(rm){ bulkFiles.splice(parseInt(rm.dataset.bulkRemove,10),1); renderBulkFileList(); }
  });
  document.getElementById('bulkClearBtn').addEventListener('click', ()=>{ bulkFiles = []; renderBulkFileList(); document.getElementById('bulkResults').innerHTML=''; });

  document.getElementById('bulkImportBtn').addEventListener('click', async ()=>{
    if(bulkFiles.length===0) return;
    const btn = document.getElementById('bulkImportBtn');
    const resultsEl = document.getElementById('bulkResults');
    const progress = document.getElementById('bulkProgress');
    const bar = document.getElementById('bulkProgressBar');
    const msg = document.getElementById('bulkProgressMsg');
    btn.disabled = true;
    progress.style.display = 'block';
    resultsEl.innerHTML = '';
    const jobId = document.getElementById('bulkJobSelect').value;
    try{
      const form = new FormData();
      if(jobId) form.append('job_id', jobId);
      bulkFiles.forEach(f=> form.append('files', f));
      bar.style.width = '25%'; msg.textContent = 'Uploading and running OCR on '+bulkFiles.length+' resume(s)…';
      const res = await apiForm('/api/resumes/bulk-import', form);
      bar.style.width = '100%';
      msg.textContent = 'Done — '+res.summary.success+' processed.';
      setTimeout(()=>{ progress.style.display='none'; }, 1200);

      const s = res.summary;
      resultsEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;">
        ${[
          ['Total Uploaded', s.total, '#2563EB'],
          ['Processed', s.success, '#059669'],
          ['Duplicates', s.duplicates, '#D97706'],
          ['Failed', s.failed, '#DC2626'],
          ['Auto Shortlisted', s.autoShortlisted, '#059669'],
          ['HR Review', s.hrReview, '#D97706'],
          ['Auto Rejected', s.autoRejected, '#DC2626'],
        ].map(([label,val,color])=>`
          <div class="glass" style="padding:12px 16px;">
            <div class="mono" style="font-size:20px;font-weight:700;color:${color};">${val}</div>
            <div style="font-size:11.5px;color:var(--ink-soft);">${label}</div>
          </div>`).join('')}
      </div>
      <div class="glass" style="padding:6px;overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>File</th><th>Candidate</th><th>Match</th><th>Verdict</th><th>Risk</th><th>Duplicate</th><th>Status</th><th>Error</th></tr></thead>
          <tbody>
            ${res.results.map(r=>{
              const verdictColor = r.autoShortlisted?'#059669':r.autoRejected?'#DC2626':r.hrReview?'#D97706':'var(--ink-soft)';
              const riskColor = r.riskLevel==='High'?'#DC2626':r.riskLevel==='Medium'?'#D97706':'#059669';
              return `<tr>
                <td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.fileName}</td>
                <td style="font-size:12.5px;"><strong>${r.candidateName||'—'}</strong></td>
                <td class="mono" style="font-weight:700;color:${verdictColor};">${r.matchPercent!==undefined&&r.matchPercent!==null?r.matchPercent+'%':'—'}</td>
                <td><span class="chip" style="background:${verdictColor}1a;color:${verdictColor};">${r.verdict||'—'}</span></td>
                <td><span style="color:${riskColor};font-size:12px;font-weight:600;">${r.riskLevel?`${r.riskLevel} (${r.riskScore})`:'—'}</span></td>
                <td>${r.duplicate?`<span style="color:#D97706;font-size:12px;">⚠ ${r.duplicateOf||''}</span>`:'<span style="color:var(--ink-soft);font-size:12px;">No</span>'}</td>
                <td style="font-size:12px;">${r.success?'<span style="color:#059669;">✓</span>':r.duplicate?'<span style="color:#D97706;">Skipped</span>':'<span style="color:#DC2626;">Failed</span>'}</td>
                <td style="font-size:11.5px;color:var(--coral);max-width:200px;">${r.error||''}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:12px;display:flex;gap:10px;">
        <button class="btn btn-primary" data-nav="allReferrals">Go to Referral Management</button>
        <button class="btn btn-outline" id="bulkResetBtn">Clear & Import More</button>
      </div>`;
      document.getElementById('bulkResetBtn')?.addEventListener('click', ()=>{
        bulkFiles = []; renderBulkFileList(); resultsEl.innerHTML=''; progress.style.display='none';
        btn.disabled = true; btn.textContent = '⬆ Import Resumes';
      });
      await refreshReferrals();
    }catch(e){
      progress.style.display = 'none';
      resultsEl.innerHTML = `<div class="glass" style="padding:20px;color:var(--coral);font-size:13px;">Import failed: ${e.message}</div>`;
    }
    btn.disabled = false; btn.textContent = '⬆ Import Resumes';
  });
}

async function refreshReferrals(){
  try{
    const isHr = isHrRole(state.role);
    state.referrals = await api(isHr ? '/api/referrals' : '/api/referrals/mine');
  }catch(e){ /* keep stale copy on failure */ }
}

