function manageJobsView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <h1 class="display" style="font-size:24px;margin:0;">Manage Jobs</h1>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-outline" id="openNewJobForm">➕ New Job</button>
        <button class="btn btn-primary" id="openJdGenerator">✨ AI JD Generator</button>
      </div>
    </div>
    <div id="jdGeneratorPanel"></div>
    <div id="jobFormPanel"></div>
    ${state.jobs.length===0 ? `
    <div class="glass" style="padding:40px;text-align:center;">
      <div style="font-size:38px;margin-bottom:10px;">💼</div>
      <h3 style="margin:0 0 6px;">No open roles yet</h3>
      <p style="color:var(--ink-soft);margin:0;">Post your first real job to start collecting referrals.</p>
    </div>` : `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">
      ${state.jobs.map((j,i)=>`
      <div class="glass tilt-card" style="padding:20px;">
        <div style="display:flex;justify-content:space-between;">
          <div style="width:40px;height:40px;border-radius:12px;background:${GRADS[i%GRADS.length]};display:flex;align-items:center;justify-content:center;">💼</div>
          <span class="chip" style="background:${j.status==='Open'?'rgba(5,150,105,0.15)':'rgba(37,99,235,0.1)'};color:${j.status==='Open'?'#059669':'var(--ink-soft)'};">${j.status}</span>
        </div>
        <h3 class="display" style="font-size:15.5px;margin:10px 0 4px;">${j.title}</h3>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:8px;">${j.dept} · ${j.exp} · ${j.location} · Posted ${fmtRelative(j.posted)}</div>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:10px;">${state.referrals.filter(r=>r.jobId===j.id).length} referrals so far</div>
        <div style="margin-bottom:12px;">${j.skills.slice(0,4).map((s,k)=>`<span class="skill-bubble" style="background:${skillTagColor(k)};animation:none;">${s}</span>`).join('')}</div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline" style="flex:1;" data-edit-job="${j.id}">Edit</button>
          <button class="btn btn-ghost" data-delete-job="${j.id}">🗑️</button>
        </div>
      </div>`).join('')}
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
      if(!confirm(`Delete "${job.title}"? This can't be undone.`)) return;
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

function allReferralsView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <h1 class="display" style="font-size:24px;margin:0;">All Referrals</h1>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline" id="compareModeBtn">⚖️ Select 2 to Compare</button>
      </div>
    </div>
    <div class="glass" style="padding:6px;overflow-x:auto;">
      <table class="data-table">
        <thead><tr><th style="width:40px;"><input type="checkbox" id="compareSelectAll" style="display:none;"/></th><th>Candidate</th><th>Job</th><th>Referred By</th><th>AI Score</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
        <tbody>
          ${state.referrals.map(r=>{
            const job = jobById(r.jobId); const emp = employeeById(r.referredBy);
            return `<tr>
              <td><input type="checkbox" class="compare-check" data-id="${r.id}" style="display:none;"/></td>
              <td><strong>${r.candidateName}</strong>${r.fraudFlags&&r.fraudFlags.length?' <span title="Fraud flags present">🚩</span>':''}</td>
              <td>${job?job.title:'—'}</td>
              <td>${emp?emp.name:'—'}</td>
              <td class="mono" style="font-weight:700;color:var(--primary);">${r.aiScore?.overall||'—'}</td>
              <td><select class="input" style="padding:6px 10px;font-size:12px;" data-status-select="${r.id}">
                ${PIPELINE_STAGES.concat('Rejected').map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
              </select></td>
              <td style="font-size:12px;color:var(--ink-soft);">${fmtRelative(r.submittedDate)}</td>
              <td><button class="btn btn-ghost" data-hr-view="${r.id}">Details</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
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
  let compareMode = false;
  const compareBtn = document.getElementById('compareModeBtn');
  if(compareBtn) compareBtn.addEventListener('click', ()=>{
    compareMode = !compareMode;
    document.querySelectorAll('.compare-check').forEach(c=> c.style.display = compareMode?'inline-block':'none');
    if(compareMode){
      compareBtn.textContent = '⚖️ Run Comparison (select 2)';
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
      compareBtn.textContent = '⚖️ Run Comparison (select 2)';
      return;
    }
    if(ids.length>2){
      toast('Only the first 2 selected candidates will be compared', 'amber');
    }
    runCompare(ids[0], ids[1]);
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
      <h3 style="margin:0 0 14px;font-size:15px;">⚖️ AI Comparison: ${a.candidateName} vs ${b.candidateName}</h3>
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
      ${state.role==='hr'||state.role==='admin' ? `<button class="btn btn-primary" id="openAddEmployee">➕ Add Employee</button>` : ''}
    </div>
    <div id="addEmployeePanel"></div>
    ${state.employees.length===0 ? `
    <div class="glass" style="padding:40px;text-align:center;">
      <div style="font-size:38px;margin-bottom:10px;">👥</div>
      <h3 style="margin:0 0 6px;">No employees yet</h3>
      <p style="color:var(--ink-soft);margin:0;">${state.role==='hr'||state.role==='admin' ? 'Add your first real employee to get referrals flowing.' : 'HR hasn\'t added any employees yet.'}</p>
    </div>` : `
    <div class="glass" style="padding:6px;overflow-x:auto;">
      <table class="data-table">
        <thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th>Login</th><th>Referrals</th><th>Selected</th><th>Bonus Earned</th><th>Status</th>${state.role==='hr'||state.role==='admin'?'<th></th>':''}</tr></thead>
        <tbody>
          ${state.employees.map(e=>{
            const refs = state.referrals.filter(r=>r.referredBy===e.id);
            const selected = refs.filter(r=>r.status==='Joined').length;
            const bonus = refs.filter(r=>r.status==='Joined').reduce((s,r)=>s+(jobById(r.jobId)?.bonus||0),0);
            return `<tr style="${e.isActive===false?'opacity:0.5;':''}">
              <td style="display:flex;align-items:center;gap:10px;"><div style="width:32px;height:32px;border-radius:50%;background:${e.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">${initials(e.name)}</div>${e.name}</td>
              <td>${e.dept}</td>
              <td>${e.designation||'—'}</td>
              <td>${e.hasLogin ? `<span class="chip" style="background:${ADMIN_ROLES.includes(e.role)?'rgba(37,99,235,0.12)':'rgba(8,145,178,0.12)'};color:${ADMIN_ROLES.includes(e.role)?'var(--primary)':'var(--cyan)'};">${roleDisplay(e.role)}</span>` : '<span style="color:var(--ink-soft);font-size:12px;">No login</span>'}</td>
              <td>${refs.length}</td><td>${selected}</td><td>₹${bonus.toLocaleString('en-IN')}</td>
              <td>${e.isActive===false ? '<span class="chip" style="background:rgba(220,38,38,0.15);color:var(--coral);">Inactive</span>' : '<span class="chip" style="background:rgba(5,150,105,0.15);color:#059669;">Active</span>'}</td>
              ${state.role==='hr'||state.role==='admin'?`<td><button class="btn btn-ghost" data-toggle-employee="${e.id}" data-active="${e.isActive!==false}">${e.isActive===false?'Reactivate':'Deactivate'}</button></td>` : ''}
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
        <select class="input" id="newEmpRole">
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="hr">HR</option>
          <option value="hr_manager">HR Manager</option>
          <option value="vp">VP</option>
          <option value="cto">CTO</option>
          <option value="ceo">CEO</option>
          <option value="system_admin">System Admin</option>
        </select>
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

/* ================================ Email Center ================================ */
function emailCenterView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <div><h1 class="display" style="font-size:24px;margin:0 0 4px;">Smart AI Email Center</h1>
      <p style="color:var(--ink-soft);font-size:13px;margin:0;">Automated emails, bulk campaigns, AI-generated communications, and email history</p></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="btn btn-outline email-center-tab active" data-ectab="automated">Automated Emails</button>
      <button class="btn btn-outline email-center-tab" data-ectab="bulk">Bulk Emails</button>
      <button class="btn btn-outline email-center-tab" data-ectab="ai-generator">AI Email Generator</button>
      <button class="btn btn-outline email-center-tab" data-ectab="history">Email History</button>
    </div>
    <div id="emailCenterContent"></div>
  </div>`;
}

async function bindEmailCenterView(){
  const container = document.getElementById('emailCenterContent');
  if(!container) return;

  let activeTab = 'automated';

  function switchTab(tab){
    activeTab = tab;
    document.querySelectorAll('.email-center-tab').forEach(b=>{
      b.classList.remove('active'); b.style.background=''; b.style.color='';
    });
    const btn = document.querySelector(`[data-ectab="${tab}"]`);
    if(btn){ btn.classList.add('active'); btn.style.background='linear-gradient(120deg,var(--primary),var(--indigo))'; btn.style.color='#fff'; }
    renderTab();
  }

  document.querySelectorAll('[data-ectab]').forEach(b=>{
    b.addEventListener('click', ()=>switchTab(b.dataset.ectab));
  });
  document.querySelector('.email-center-tab.active')?.click();

  async function renderTab(){
    if(activeTab === 'automated') renderAutomated();
    else if(activeTab === 'bulk') renderBulk();
    else if(activeTab === 'ai-generator') renderAiGenerator();
    else if(activeTab === 'history') renderHistory();
  }

  function renderAutomated(){
    const rejected = state.referrals.filter(r => r.status === 'Rejected');
    const shortlisted = state.referrals.filter(r => ['Shortlisted', 'Interview Scheduled'].includes(r.status));
    container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="glass" style="padding:20px;">
        <h3 style="margin:0 0 6px;font-size:15px;">Rejected Candidates</h3>
        <p style="font-size:12px;color:var(--ink-soft);margin:0 0 14px;">${rejected.length} candidates — Send rejection emails automatically</p>
        ${rejected.length === 0 ? '<div style="padding:20px;text-align:center;color:var(--ink-soft);font-size:13px;">No rejected candidates.</div>' :
        `<div style="max-height:300px;overflow-y:auto;">${rejected.slice(0,20).map(r => {
          const job = jobById(r.jobId);
          return `<div class="ec-candidate-row" data-email-cand='${JSON.stringify({id:r.id,name:r.candidateName,email:r.email,jobTitle:job?.title||'',candidateId:r.id})}' style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(226,232,240,0.08);cursor:pointer;">
            <div><div style="font-size:13px;font-weight:600;">${r.candidateName}</div><div style="font-size:11px;color:var(--ink-soft);">${r.email||'No email'} · ${job?.title||'—'}</div></div>
            <button class="btn btn-ghost" style="font-size:11px;" onclick="event.stopPropagation();openAutoEmail('rejection',${JSON.stringify({id:r.id,name:r.candidateName,email:r.email,jobTitle:job?.title||'',candidateId:r.id}).replace(/"/g,'&quot;')})">Send Email</button>
          </div>`;
        }).join('')}</div>`}
      </div>
      <div class="glass" style="padding:20px;">
        <h3 style="margin:0 0 6px;font-size:15px;">Shortlisted Candidates</h3>
        <p style="font-size:12px;color:var(--ink-soft);margin:0 0 14px;">${shortlisted.length} candidates — Send shortlist/update emails</p>
        ${shortlisted.length === 0 ? '<div style="padding:20px;text-align:center;color:var(--ink-soft);font-size:13px;">No shortlisted candidates.</div>' :
        `<div style="max-height:300px;overflow-y:auto;">${shortlisted.slice(0,20).map(r => {
          const job = jobById(r.jobId);
          return `<div class="ec-candidate-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(226,232,240,0.08);cursor:pointer;">
            <div><div style="font-size:13px;font-weight:600;">${r.candidateName}</div><div style="font-size:11px;color:var(--ink-soft);">${r.email||'No email'} · ${job?.title||'—'}</div></div>
            <button class="btn btn-ghost" style="font-size:11px;" onclick="event.stopPropagation();openAutoEmail('shortlist',${JSON.stringify({id:r.id,name:r.candidateName,email:r.email,jobTitle:job?.title||'',candidateId:r.id}).replace(/"/g,'&quot;')})">Send Email</button>
          </div>`;
        }).join('')}</div>`}
      </div>
    </div>
    <div id="autoEmailPanel" style="margin-top:16px;"></div>`;
  }

  function renderBulk(){
    const candidates = state.referrals.filter(r => r.status !== 'Joined');
    container.innerHTML = `
    <div class="glass" style="padding:20px;">
      <h3 style="margin:0 0 14px;font-size:15px;">Bulk Email Campaign</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;">
        <div><label class="field-label">Filter by Status</label>
          <select class="input" id="bulkStatusFilter">
            <option value="">All Active</option>
            ${PIPELINE_STAGES.filter(s => s !== 'Joined').map(s => `<option>${s}</option>`).join('')}
          </select>
        </div>
        <div><label class="field-label">Filter by Department</label>
          <select class="input" id="bulkDeptFilter">
            <option value="">All Departments</option>
            <option>Engineering</option><option>Product</option><option>Design</option>
            <option>Data Science</option><option>Marketing</option><option>Sales</option><option>HR</option>
          </select>
        </div>
        <div><label class="field-label">Filter by Job</label>
          <select class="input" id="bulkJobFilter">
            <option value="">All Jobs</option>
            ${state.jobs.map(j => `<option value="${j.id}">${j.title}</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-outline" id="bulkFilterBtn" style="margin-bottom:14px;">Apply Filters</button>
      <div id="bulkCandidateList">
        <p style="font-size:13px;color:var(--ink-soft);">${candidates.length} candidates match current filters. Click "Apply Filters" to view.</p>
      </div>
      <hr style="border-color:rgba(226,232,240,0.1);margin:16px 0;">
      <h4 style="margin:0 0 10px;font-size:14px;">Email Content</h4>
      <div style="margin-bottom:10px;"><label class="field-label">Subject</label><input class="input" id="bulkSubject" placeholder="Email subject line"/></div>
      <div style="margin-bottom:10px;"><label class="field-label">Body <span style="font-size:11px;color:var(--ink-soft);">Use {{name}}, {{job}}, {{candidate_id}} for personalization</span></label>
        <textarea class="input" id="bulkBody" rows="8" style="font-size:13px;line-height:1.6;" placeholder="Write your email body here... Use {{name}} for candidate name, {{job}} for job title, {{candidate_id}} for candidate ID."></textarea>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" id="bulkPreviewBtn">Preview Email</button>
        <button class="btn btn-cyan" id="bulkSendBtn">Send to Selected</button>
      </div>
      <div id="bulkResult" style="margin-top:12px;"></div>
    </div>`;
  }

  function renderAiGenerator(){
    container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="glass" style="padding:20px;">
        <h3 style="margin:0 0 14px;font-size:15px;">AI Email Generator</h3>
        <div style="margin-bottom:12px;"><label class="field-label">Candidate Name</label>
          <input class="input" id="aiGenCandidate" placeholder="Auto-filled or enter manually" list="candidateList"/>
          <datalist id="candidateList">${state.referrals.map(r => `<option value="${r.candidateName}">`).join('')}</datalist>
        </div>
        <div style="margin-bottom:12px;"><label class="field-label">Candidate ID</label><input class="input" id="aiGenCandidateId" placeholder="Auto-filled or enter manually"/></div>
        <div style="margin-bottom:12px;"><label class="field-label">Job Title</label><input class="input" id="aiGenJobTitle" placeholder="e.g. Senior Software Engineer"/></div>
        <div style="margin-bottom:12px;"><label class="field-label">Interview Date (if applicable)</label><input class="input" id="aiGenInterviewDate" type="date"/></div>
        <div style="margin-bottom:12px;"><label class="field-label">HR Contact Name</label><input class="input" id="aiGenHrContact" value="${state.user?.name||''}"/></div>
        <div style="margin-bottom:12px;"><label class="field-label">Email Purpose</label>
          <select class="input" id="aiGenPurpose">
            <option value="rejection">Rejection</option>
            <option value="shortlist">Shortlisted / Next Steps</option>
            <option value="interview_invite">Interview Invitation</option>
            <option value="offer">Offer Letter</option>
            <option value="follow_up">Follow-up</option>
            <option value="general">General</option>
          </select>
        </div>
        <div style="margin-bottom:12px;"><label class="field-label">Your Instructions / Prompt</label>
          <textarea class="input" id="aiGenPrompt" rows="4" placeholder="Describe the tone, key points, and any specific details you want in the email..."></textarea>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" id="aiGenBtn">Generate Email</button>
          <button class="btn btn-outline" id="aiGenAutoFillBtn">Auto-fill from Selection</button>
        </div>
        <div id="aiGenStatus" style="margin-top:10px;font-size:12px;color:var(--ink-soft);"></div>
      </div>
      <div class="glass" style="padding:20px;">
        <h3 style="margin:0 0 14px;font-size:15px;">Preview & Send</h3>
        <div style="margin-bottom:10px;"><label class="field-label">To</label><input class="input" id="aiGenTo" placeholder="candidate@example.com"/></div>
        <div style="margin-bottom:10px;"><label class="field-label">CC</label><input class="input" id="aiGenCc" placeholder="CC addresses"/></div>
        <div style="margin-bottom:10px;"><label class="field-label">Subject</label><input class="input" id="aiGenSubject" placeholder="Email subject"/></div>
        <div style="margin-bottom:10px;"><label class="field-label">Body</label>
          <textarea class="input" id="aiGenBody" rows="12" style="font-size:13px;line-height:1.6;"></textarea>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-primary" id="aiGenSendBtn">Send Email</button>
          <button class="btn btn-outline" id="aiGenScheduleBtn">Schedule</button>
        </div>
        <div id="aiGenSendStatus" style="margin-top:10px;font-size:12px;color:var(--ink-soft);"></div>
      </div>
    </div>`;
  }

  function renderHistory(){
    const sentEmails = JSON.parse(localStorage.getItem('muraai_email_history') || '[]');
    container.innerHTML = `
    <div class="glass" style="padding:20px;">
      <h3 style="margin:0 0 14px;font-size:15px;">Email History</h3>
      ${sentEmails.length === 0 ? '<div style="padding:20px;text-align:center;color:var(--ink-soft);">No email history yet. Emails sent through this center will appear here.</div>' :
      `<div class="glass" style="padding:6px;overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>Date</th><th>To</th><th>Subject</th><th>Status</th><th>Type</th></tr></thead>
          <tbody>${sentEmails.slice(0,50).map(e => `
            <tr>
              <td style="font-size:11px;color:var(--ink-soft);">${new Date(e.date).toLocaleString()}</td>
              <td>${e.to}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${e.subject}</td>
              <td><span class="chip" style="background:${e.status==='sent'?'rgba(5,150,105,0.15)':'rgba(220,38,38,0.15)'};color:${e.status==='sent'?'#059669':'var(--coral)'};">${e.status}</span></td>
              <td style="font-size:12px;">${e.type||'manual'}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>`}
      ${sentEmails.length > 0 ? '<button class="btn btn-ghost" id="clearEmailHistory" style="margin-top:10px;">Clear History</button>' : ''}
    </div>`;
  }

  /* ============ Binding Event Handlers ============ */

  // Automated emails - handled via openAutoEmail global function
  window.openAutoEmail = function(type, cand){
    const panel = document.getElementById('autoEmailPanel');
    if(!panel) return;
    const defaultSubject = type === 'rejection' ? `Update on your application for ${cand.jobTitle}` : `Congratulations! You've been shortlisted for ${cand.jobTitle}`;
    const defaultBody = type === 'rejection'
      ? `Dear ${cand.name},\n\nThank you for your interest in the ${cand.jobTitle} role at our company. After careful review, we have decided to move forward with other candidates whose qualifications more closely match our current requirements.\n\nWe appreciate the time you invested in the application process and wish you the very best in your job search.\n\nBest regards,\n${state.user?.name || 'HR Team'}`
      : `Dear ${cand.name},\n\nWe are pleased to inform you that you have been shortlisted for the ${cand.jobTitle} position! Your qualifications and experience have impressed our hiring team.\n\nWe will be in touch shortly with the next steps, including interview scheduling details.\n\nCongratulations and welcome to the next stage of our hiring process!\n\nBest regards,\n${state.user?.name || 'HR Team'}`;
    panel.innerHTML = `
    <div class="glass pop-in" style="padding:20px;">
      <h3 style="margin:0 0 14px;font-size:15px;">${type === 'rejection' ? 'Rejection' : 'Shortlist'} Email — ${cand.name}</h3>
      <div style="margin-bottom:10px;"><label class="field-label">To</label><input class="input" id="autoEmailTo" value="${cand.email||''}"/></div>
      <div style="margin-bottom:10px;"><label class="field-label">Subject</label><input class="input" id="autoEmailSubject" value="${defaultSubject}"/></div>
      <div style="margin-bottom:10px;"><label class="field-label">Body</label>
        <textarea class="input" id="autoEmailBody" rows="10" style="font-size:13px;line-height:1.6;">${defaultBody}</textarea>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" id="autoEmailSendBtn">Send Email</button>
        <button class="btn btn-ghost" onclick="this.closest('.glass').remove()">Cancel</button>
      </div>
      <div id="autoEmailResult" style="margin-top:10px;font-size:12px;"></div>
    </div>`;
    document.getElementById('autoEmailSendBtn').addEventListener('click', async ()=>{
      const btn = document.getElementById('autoEmailSendBtn');
      btn.disabled=true; btn.textContent='Sending...';
      try{
        await api('/api/ai/send-email', {method:'POST', body:{
          to: [document.getElementById('autoEmailTo').value.trim()],
          subject: document.getElementById('autoEmailSubject').value,
          body: document.getElementById('autoEmailBody').value,
        }});
        saveEmailToHistory({to:document.getElementById('autoEmailTo').value, subject:document.getElementById('autoEmailSubject').value, status:'sent', type:type});
        document.getElementById('autoEmailResult').innerHTML='<span style="color:#059669;font-weight:600;">✓ Email sent successfully</span>';
        toast('Email sent','success');
      }catch(e){ document.getElementById('autoEmailResult').innerHTML=`<span style="color:#DC2626;">Failed: ${e.message}</span>`; }
      btn.disabled=false; btn.textContent='Send Email';
    });
  };

  // Bulk email filtering
  document.getElementById('bulkFilterBtn')?.addEventListener('click', ()=>{
    const statusF = document.getElementById('bulkStatusFilter').value;
    const deptF = document.getElementById('bulkDeptFilter').value;
    const jobF = document.getElementById('bulkJobFilter').value;
    let filtered = state.referrals;
    if(statusF) filtered = filtered.filter(r => r.status === statusF);
    if(jobF) filtered = filtered.filter(r => r.jobId === jobF);
    if(deptF){
      const jobIds = state.jobs.filter(j => j.dept === deptF).map(j => j.id);
      filtered = filtered.filter(r => jobIds.includes(r.jobId));
    }
    const list = document.getElementById('bulkCandidateList');
    if(filtered.length === 0){
      list.innerHTML = '<p style="font-size:13px;color:var(--ink-soft);">No candidates match the selected filters.</p>';
    } else {
      list.innerHTML = `
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;">${filtered.length} candidate(s) selected</p>
        <div style="max-height:200px;overflow-y:auto;border:1px solid rgba(226,232,240,0.1);border-radius:8px;padding:8px;">
          ${filtered.slice(0,50).map(r => {
            const job = jobById(r.jobId);
            return `<div style="display:flex;justify-content:space-between;padding:6px 8px;font-size:12.5px;border-bottom:1px solid rgba(226,232,240,0.05);">
              <span>${r.candidateName}</span><span style="color:var(--ink-soft);">${r.email||'—'} · ${job?.title||'—'}</span>
            </div>`;
          }).join('')}
          ${filtered.length > 50 ? `<div style="font-size:11px;color:var(--ink-soft);padding:4px 8px;">+${filtered.length - 50} more</div>` : ''}
        </div>`;
      list.dataset.candidates = JSON.stringify(filtered.map(r => ({name:r.candidateName, email:r.email, jobTitle:jobById(r.jobId)?.title||'', candidateId:r.id})));
    }
  });

  // Bulk preview
  document.getElementById('bulkPreviewBtn')?.addEventListener('click', ()=>{
    const subject = document.getElementById('bulkSubject').value;
    const body = document.getElementById('bulkBody').value;
    const list = document.getElementById('bulkCandidateList');
    const candidatesData = list.dataset.candidates ? JSON.parse(list.dataset.candidates) : [];
    if(!candidatesData.length){ toast('No candidates selected. Apply filters first.','amber'); return; }
    const preview = candidatesData.slice(0,3);
    let html = '<div class="glass" style="padding:16px;margin-top:12px;"><h4 style="margin:0 0 10px;font-size:14px;">Preview (first 3 recipients)</h4>';
    preview.forEach(c => {
      const personalizedSubject = subject.replace(/\{\{name\}\}/g, c.name).replace(/\{\{job\}\}/g, c.jobTitle).replace(/\{\{candidate_id\}\}/g, c.candidateId);
      const personalizedBody = body.replace(/\{\{name\}\}/g, c.name).replace(/\{\{job\}\}/g, c.jobTitle).replace(/\{\{candidate_id\}\}/g, c.candidateId);
      html += `<div style="padding:8px 0;border-bottom:1px solid rgba(226,232,240,0.08);">
        <div style="font-weight:600;font-size:12px;">To: ${c.email}</div>
        <div style="font-size:12px;color:var(--primary);">Subject: ${personalizedSubject}</div>
        <div style="font-size:12px;color:var(--ink-soft);white-space:pre-wrap;max-height:80px;overflow-y:auto;">${personalizedBody.substring(0,200)}${personalizedBody.length>200?'...':''}</div>
      </div>`;
    });
    if(candidatesData.length > 3) html += `<div style="font-size:11px;color:var(--ink-soft);padding-top:4px;">...and ${candidatesData.length - 3} more recipients</div>`;
    html += '</div>';
    document.getElementById('bulkResult').innerHTML = html;
  });

  // Bulk send
  document.getElementById('bulkSendBtn')?.addEventListener('click', async ()=>{
    const subject = document.getElementById('bulkSubject').value.trim();
    const body = document.getElementById('bulkBody').value.trim();
    const list = document.getElementById('bulkCandidateList');
    const candidatesData = list.dataset.candidates ? JSON.parse(list.dataset.candidates) : [];
    if(!candidatesData.length){ toast('No candidates selected. Apply filters first.','amber'); return; }
    if(!subject){ toast('Subject is required','amber'); return; }
    if(!body){ toast('Body is required','amber'); return; }
    const btn = document.getElementById('bulkSendBtn');
    btn.disabled=true; btn.textContent='Sending...';
    let sent = 0, failed = 0;
    for(const c of candidatesData){
      try{
        const personalizedSubject = subject.replace(/\{\{name\}\}/g, c.name).replace(/\{\{job\}\}/g, c.jobTitle).replace(/\{\{candidate_id\}\}/g, c.candidateId);
        const personalizedBody = body.replace(/\{\{name\}\}/g, c.name).replace(/\{\{job\}\}/g, c.jobTitle).replace(/\{\{candidate_id\}\}/g, c.candidateId);
        await api('/api/ai/send-email', {method:'POST', body:{to:[c.email], subject:personalizedSubject, body:personalizedBody}});
        saveEmailToHistory({to:c.email, subject:personalizedSubject, status:'sent', type:'bulk'});
        sent++;
      }catch(e){
        saveEmailToHistory({to:c.email, subject, status:'failed', type:'bulk'});
        failed++;
      }
    }
    document.getElementById('bulkResult').innerHTML = `<div style="padding:12px;border-radius:8px;background:${failed===0?'rgba(5,150,105,0.1)':'rgba(220,38,38,0.1)'};font-size:13px;">
      ${failed===0 ? `✓ All ${sent} emails sent successfully` : `⚠ ${sent} sent, ${failed} failed`}</div>`;
    toast(`${sent} emails sent${failed ? `, ${failed} failed` : ''}`, failed===0?'success':'error');
    btn.disabled=false; btn.textContent='Send to Selected';
  });

  // AI Generator auto-fill
  document.getElementById('aiGenAutoFillBtn')?.addEventListener('click', ()=>{
    const name = document.getElementById('aiGenCandidate').value.trim();
    if(!name){ toast('Enter a candidate name first','amber'); return; }
    const ref = state.referrals.find(r => r.candidateName.toLowerCase() === name.toLowerCase());
    if(ref){
      document.getElementById('aiGenCandidateId').value = ref.id;
      const job = jobById(ref.jobId);
      if(job) document.getElementById('aiGenJobTitle').value = job.title;
      document.getElementById('aiGenTo').value = ref.email || '';
      toast('Auto-filled candidate details','success');
    } else {
      toast('Candidate not found in referrals','amber');
    }
  });

  // AI Generate
  document.getElementById('aiGenBtn')?.addEventListener('click', async ()=>{
    const btn = document.getElementById('aiGenBtn');
    btn.disabled=true; btn.textContent='Generating...';
    const statusEl = document.getElementById('aiGenStatus');
    statusEl.textContent = 'AI is crafting your email...';
    try{
      const result = await api('/api/ai/compose-email', {method:'POST', body:{
        prompt: document.getElementById('aiGenPrompt').value,
        context: document.getElementById('aiGenPurpose').value,
        candidateName: document.getElementById('aiGenCandidate').value,
        jobTitle: document.getElementById('aiGenJobTitle').value,
        interviewDate: document.getElementById('aiGenInterviewDate').value,
        hrContact: document.getElementById('aiGenHrContact').value,
      }});
      document.getElementById('aiGenSubject').value = result.subject || '';
      document.getElementById('aiGenBody').value = result.body || '';
      statusEl.innerHTML = '<span style="color:#059669;">✓ Email generated! Review and send below.</span>';
      toast('Email generated','success');
    }catch(e){
      statusEl.innerHTML = `<span style="color:#DC2626;">Generation failed: ${e.message}</span>`;
      toast('AI generation failed','error');
    }
    btn.disabled=false; btn.textContent='Generate Email';
  });

  // AI Send
  document.getElementById('aiGenSendBtn')?.addEventListener('click', async ()=>{
    const to = document.getElementById('aiGenTo').value.trim();
    if(!to){ toast('Recipient email is required','amber'); document.getElementById('aiGenTo').focus(); return; }
    const subject = document.getElementById('aiGenSubject').value.trim();
    const body = document.getElementById('aiGenBody').value.trim();
    if(!subject || !body){ toast('Subject and body are required','amber'); return; }
    const btn = document.getElementById('aiGenSendBtn');
    btn.disabled=true; btn.textContent='Sending...';
    document.getElementById('aiGenSendStatus').textContent='Sending...';
    try{
      const result = await api('/api/ai/send-email', {method:'POST', body:{
        to: to.split(',').map(e=>e.trim()).filter(Boolean),
        cc: document.getElementById('aiGenCc').value.split(',').map(e=>e.trim()).filter(Boolean),
        subject, body,
      }});
      saveEmailToHistory({to, subject, status:'sent', type:'ai_generated'});
      document.getElementById('aiGenSendStatus').innerHTML = `<span style="color:#059669;">✓ ${result.message||'Email sent'}</span>`;
      toast('Email sent','success');
    }catch(e){ document.getElementById('aiGenSendStatus').innerHTML=`<span style="color:#DC2626;">Failed: ${e.message}</span>`; }
    btn.disabled=false; btn.textContent='Send Email';
  });

  // AI Schedule (placeholder)
  document.getElementById('aiGenScheduleBtn')?.addEventListener('click', ()=>{
    toast('Scheduling feature coming soon. For now, use "Send Email" to send immediately.','primary');
  });

  // Clear history
  document.getElementById('clearEmailHistory')?.addEventListener('click', ()=>{
    if(confirm('Clear all email history?')){
      localStorage.removeItem('muraai_email_history');
      renderTab();
      toast('History cleared','success');
    }
  });
}

function saveEmailToHistory(entry){
  const history = JSON.parse(localStorage.getItem('muraai_email_history') || '[]');
  history.unshift({...entry, date: new Date().toISOString()});
  if(history.length > 200) history.length = 200;
  localStorage.setItem('muraai_email_history', JSON.stringify(history));
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
