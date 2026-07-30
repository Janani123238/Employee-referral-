/* ------------------------------- Employee: AI Job Match ------------------------------- */
function aiJobMatchView(){
  return `
  <div class="fade-up" style="max-width:800px;">
    <h1 class="display" style="font-size:24px;margin:0 0 4px;">AI Job Match</h1>
    <p style="color:var(--ink-soft);font-size:13.5px;margin:0 0 20px;">Paste any resume or upload a file to see how it matches every open role, ranked.</p>
    <div class="glass" style="padding:22px;margin-bottom:18px;">
      <textarea class="input" id="matchResumeText" rows="6" placeholder="Paste resume text…"></textarea>
      <div style="display:flex;gap:10px;margin-top:12px;">
        <button class="btn btn-outline" id="matchUploadBtn" type="button">📎 Upload Resume</button>
        <button class="btn btn-primary" id="runMatchBtn" style="flex:1;">🎯 Find Best Matches</button>
      </div>
    </div>
    <div id="matchResults"></div>
  </div>`;
}
function bindMatchView(){
  const uploadBtn = document.getElementById('matchUploadBtn');
  if(uploadBtn) uploadBtn.addEventListener('click', ()=>{
    const tmp = document.createElement('input'); tmp.type='file'; tmp.accept='.txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp';
    tmp.addEventListener('change', async ()=>{
      const f = tmp.files[0]; if(!f) return;
      const ta = document.getElementById('matchResumeText');
      if(f.name.toLowerCase().endsWith('.txt')){
        const reader = new FileReader();
        reader.onload = ()=>{ ta.value = reader.result; toast('Text file loaded', 'success'); };
        reader.readAsText(f);
        return;
      }
      const results = document.getElementById('matchResults');
      results.innerHTML = `<div class="glass" style="padding:16px;font-size:13px;color:var(--ink-soft);">⏳ Uploading and extracting text…</div>`;
      try{
        const result = await uploadResumeFile(f);
        ta.value = result.extractedText;
        toast('Text extracted from '+f.name, 'success');
        results.innerHTML = '';
      }catch(e){
        toast(e.message || 'Could not process file', 'error');
        results.innerHTML = '';
      }
    });
    tmp.click();
  });
  const btn = document.getElementById('runMatchBtn');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    const text = document.getElementById('matchResumeText').value.trim();
    if(text.length<20){ toast('Paste or upload a resume first', 'amber'); return; }
    const results = document.getElementById('matchResults');
    results.innerHTML = `<div class="glass" style="padding:20px;"><div class="shimmer" style="height:80px;border-radius:12px;"></div><div style="font-size:12px;color:var(--ink-soft);margin-top:8px;text-align:center;">AI is matching against ${state.jobs.length} open roles…</div></div>`;
    btn.disabled = true;
    try{
      const ranked = await aiMatchAllJobs(text);
      if(!ranked || ranked.length===0){
        results.innerHTML = `<div class="glass" style="padding:20px;text-align:center;font-size:13.5px;color:var(--ink-soft);">No matching jobs found or AI matching is unavailable.</div>`;
        btn.disabled = false;
        return;
      }
      const matches = ranked.map(r => ({ job: state.jobs.find(j=>j.id===r.job.id) || r.job, m: r.match }));
      results.innerHTML = matches.map(({job,m},i)=> m ? `
        <div class="glass tilt-card pop-in" style="padding:20px;margin-bottom:14px;display:flex;gap:18px;align-items:center;">
          ${matchMeterSVG(m.matchPercent, 68, 7)}
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="display" style="font-weight:700;font-size:15.5px;">${job.title}</div>
              ${i===0?'<span class="chip" style="background:rgba(5,150,105,0.15);color:#059669;">Best Match</span>':''}
            </div>
            <div style="font-size:12px;color:var(--ink-soft);margin:2px 0 8px;">${job.dept} · ${job.location}</div>
            <div style="font-size:12.5px;margin-bottom:4px;">✓ ${(m.matchedSkills||[]).join(', ')||'—'}</div>
            ${(m.missingSkills||[]).length?`<div style="font-size:12.5px;color:var(--coral);">✗ Missing: ${m.missingSkills.join(', ')}</div>`:''}
          </div>
        </div>` : '').join('');
      attachTilt(results);
    }catch(e){ toast('AI matching failed: '+(e.message||'try again'), 'error'); results.innerHTML=''; }
    btn.disabled = false;
  });
}

/* ------------------------------- Employee: Open Positions ------------------------------- */
function openPositionsView(){
  const bestJobId = state.lastAnalyzedResume?.bestJobId;
  return `
  <div class="fade-up">
    <h1 class="display" style="font-size:24px;margin:0 0 4px;">Open Positions</h1>
    <p style="color:var(--ink-soft);font-size:13.5px;margin:0 0 20px;">${state.jobs.length} roles hiring now across MuraAI.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">
      ${state.jobs.map((j,i)=>`
      <div class="glass tilt-card fade-up" style="padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div style="width:44px;height:44px;border-radius:12px;background:${GRADS[i%GRADS.length]};display:flex;align-items:center;justify-content:center;font-size:19px;">💼</div>
          ${bestJobId===j.id?'<span class="chip" style="background:rgba(5,150,105,0.15);color:#059669;">Best Match</span>':''}
        </div>
        <h3 class="display" style="font-size:16.5px;margin:12px 0 4px;">${j.title}</h3>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">${j.dept} · ${j.exp} · ${j.location}</div>
        <div style="margin-bottom:10px;">${j.skills.slice(0,4).map((s,k)=>`<span class="skill-bubble" style="background:${skillTagColor(k)};animation:none;">${s}</span>`).join('')}</div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:14px;">
          <div><span style="color:var(--ink-soft);">Salary</span><br/><strong>${j.salary}</strong></div>
          <div><span style="color:var(--ink-soft);">Bonus</span><br/><strong style="color:var(--success);">₹${j.bonus.toLocaleString('en-IN')}</strong></div>
        </div>
        <button class="btn btn-primary" style="width:100%;" data-apply-job="${j.id}">Apply Referral</button>
      </div>`).join('')}
    </div>
  </div>`;
}
function bindOpenPositions(){
  document.querySelectorAll('[data-apply-job]').forEach(el=>{
    el.addEventListener('click', ()=>{
      if(!state.lastAnalyzedResume) state.lastAnalyzedResume = {resumeText:'', parsed:{}, bestJobId:el.dataset.applyJob};
      else state.lastAnalyzedResume.bestJobId = el.dataset.applyJob;
      nav('refer');
    });
  });
}

/* ------------------------------- Employee: My Referrals / Tracking ------------------------------- */
function pipelineHTML(status){
  const idx = status==='Rejected' ? -1 : PIPELINE_STAGES.indexOf(status);
  return `<div style="display:flex;margin:14px 0 4px;">
    ${PIPELINE_STAGES.map((s,i)=>{
      let cls = 'pipeline-dot'; let lineCls='pipeline-line';
      if(status==='Rejected' && i===0){ cls+=' rejected'; }
      else if(i < idx) { cls+=' done'; lineCls+=' done'; }
      else if(i===idx){ cls+=' current'; if(i>0) {} }
      if(i<idx) lineCls+=' done';
      return `<div class="pipeline-step">${i>0?`<div class="${lineCls}"></div>`:''}<div class="${cls}">${i<idx||status==='Joined'&&i<=idx?'✓':i+1}</div>
        <div style="font-size:9.5px;text-align:center;margin-top:6px;color:var(--ink-soft);max-width:60px;">${s}</div></div>`;
    }).join('')}
  </div>`;
}
function myReferralsView(){
  const mine = state.referrals.filter(r=>r.referredBy===state.user.employeeId);
  if(mine.length===0) return `<div class="glass" style="padding:40px;text-align:center;"><div style="font-size:38px;margin-bottom:10px;">📭</div><h3>No referrals yet</h3><p style="color:var(--ink-soft);">Refer your first candidate to see it tracked here.</p><button class="btn btn-primary" data-nav="refer" style="margin-top:10px;">Refer a Candidate</button></div>`;
  return `
  <div class="fade-up">
    <h1 class="display" style="font-size:24px;margin:0 0 18px;">My Referrals</h1>
    <div style="display:flex;flex-direction:column;gap:16px;">
      ${mine.map(r=>{
        const job = jobById(r.jobId);
        return `<div class="glass" style="padding:22px;">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div style="display:flex;gap:12px;align-items:center;">
              <div style="width:42px;height:42px;border-radius:50%;background:${skillTagColor(r.candidateName.length)};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">${initials(r.candidateName)}</div>
              <div>
                <div style="font-weight:700;font-size:15px;">${r.candidateName}</div>
                <div style="font-size:12px;color:var(--ink-soft);">${job?job.title:'—'} · Submitted ${fmtRelative(r.submittedDate)}</div>
              </div>
            </div>
            <div class="chip" style="background:${statusColor(r.status)}22;color:${statusColor(r.status)};">${r.status}</div>
          </div>
          ${pipelineHTML(r.status)}
          <div style="display:flex;gap:14px;margin-top:14px;flex-wrap:wrap;align-items:center;">
            ${matchMeterSVG(r.matchPercent||70, 52, 6)}
            <div style="flex:1;min-width:220px;font-size:12.5px;color:var(--ink-soft);">${r.aiSummary||'AI summary not available.'}</div>
            <button class="btn btn-outline" data-view-referral="${r.id}">View Details</button>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function referralDetailModal(r){
  const job = jobById(r.jobId);
  const score = r.aiScore || {};
  return `
  <div class="modal-overlay" id="refModalOverlay">
    <div class="glass-strong pop-in" style="max-width:560px;width:100%;padding:28px;max-height:85vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:start;">
        <div>
          <h2 class="display" style="margin:0 0 2px;font-size:19px;">${r.candidateName}</h2>
          <div style="font-size:12.5px;color:var(--ink-soft);">${job?job.title:'—'} · Applying via ${employeeById(r.referredBy)?.name||'referral'}</div>
        </div>
        <button class="btn btn-ghost" id="closeRefModal" style="font-size:18px;padding:4px 10px;">✕</button>
      </div>
      <div class="chip" style="background:${statusColor(r.status)}22;color:${statusColor(r.status)};margin:12px 0;">${r.status}</div>
      ${pipelineHTML(r.status)}
      <div style="display:flex;gap:20px;align-items:center;margin:18px 0;">
        ${matchMeterSVG(r.matchPercent||0,72,7)}
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;margin-bottom:4px;">AI Summary</div>
          <div style="font-size:12.5px;color:var(--ink-soft);">${r.aiSummary||'—'}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px;">
        ${scoreBar('Resume Quality', score.resumeQuality||0)}
        ${scoreBar('Skill Match', score.skillMatch||0)}
        ${scoreBar('Communication', score.communication||0)}
        ${scoreBar('Experience Match', score.experienceMatch||0)}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:12px;background:rgba(37,99,235,0.08);margin-bottom:14px;">
        <span style="font-size:13px;font-weight:700;">Overall Score</span><span class="mono" style="font-size:18px;font-weight:700;color:var(--primary);">${score.overall||0}/100</span>
      </div>
      <div style="margin-bottom:6px;font-size:13px;font-weight:700;">Skills</div>
      <div style="margin-bottom:14px;">${skillBubbles(r.tags&&r.tags.length?r.tags:['—'])}</div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-outline" id="genEmailBtn" style="flex:1;">✉️ Generate Referral Email</button>
        ${r.status==='Applied'||r.status==='Submitted' ? `<button class="btn btn-ghost" id="withdrawRefBtn" style="color:var(--coral);border:1px solid rgba(220,38,38,0.3);flex:1;">🗑️ Withdraw Referral</button>` : ''}
      </div>
      <div id="genEmailResult" style="margin-top:12px;"></div>
    </div>
  </div>`;
}
function scoreBar(label, val){
  return `<div>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span>${label}</span><span class="mono" style="font-weight:700;">${val}</span></div>
    <div class="progress-track"><div class="progress-fill" style="width:${val}%;"></div></div>
  </div>`;
}
function bindTrackingView(){
  document.querySelectorAll('[data-view-referral]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const r = state.referrals.find(x=>x.id===el.dataset.viewReferral);
      const wrap = document.createElement('div'); wrap.innerHTML = referralDetailModal(r);
      document.body.appendChild(wrap);
      document.getElementById('closeRefModal').addEventListener('click', ()=> wrap.remove());
      document.getElementById('refModalOverlay').addEventListener('click', (e)=>{ if(e.target.id==='refModalOverlay') wrap.remove(); });
      const genBtn = document.getElementById('genEmailBtn');
      genBtn.addEventListener('click', async ()=>{
        genBtn.disabled = true; genBtn.textContent = 'Generating…';
        try{
          const email = await aiGenerateEmail(r);
          document.getElementById('genEmailResult').innerHTML = `<div class="glass" style="padding:14px;font-size:12.5px;white-space:pre-wrap;line-height:1.6;">${email}</div>`;
        }catch(e){ toast('Could not generate email', 'error'); }
        genBtn.disabled = false; genBtn.textContent = '✉️ Generate Referral Email';
      });
      const withdrawBtn = document.getElementById('withdrawRefBtn');
      if(withdrawBtn){
        withdrawBtn.addEventListener('click', async ()=>{
          if(!confirm('Withdraw this referral? This cannot be undone.')) return;
          withdrawBtn.disabled = true; withdrawBtn.textContent = 'Withdrawing…';
          try{
            await deleteReferral(r.id);
            state.referrals = state.referrals.filter(x=>x.id!==r.id);
            wrap.remove();
            toast('Referral withdrawn', 'success');
            render();
          }catch(e){ toast(e.message||'Could not withdraw referral', 'error'); withdrawBtn.disabled=false; withdrawBtn.textContent='🗑️ Withdraw Referral'; }
        });
      }
    });
  });
}

/* ------------------------------- Employee: Leaderboard ------------------------------- */
function leaderboardView(){
  const ranked = state.employees.map(e=>{
    const refs = state.referrals.filter(r=>r.referredBy===e.id);
    const selected = refs.filter(r=>r.status==='Joined').length;
    return {...e, count:refs.length, selected, rate: refs.length? Math.round(selected/refs.length*100):0};
  }).sort((a,b)=>b.count-a.count);
  const medals = ['🥇','🥈','🥉'];
  return `
  <div class="fade-up" style="max-width:720px;">
    <h1 class="display" style="font-size:24px;margin:0 0 18px;">Referral Leaderboard</h1>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${ranked.map((e,i)=>`
      <div class="glass tilt-card" style="padding:16px 20px;display:flex;align-items:center;gap:14px;${e.id===state.user.employeeId?'border:1.5px solid rgba(37,99,235,0.5);':''}">
        <div style="font-size:22px;width:34px;text-align:center;">${medals[i]||('#'+(i+1))}</div>
        <div style="width:40px;height:40px;border-radius:50%;background:${e.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">${initials(e.name)}</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:14.5px;">${e.name} ${e.id===state.user.employeeId?'<span style="color:var(--primary);font-size:11.5px;">(You)</span>':''}</div>
          <div style="font-size:12px;color:var(--ink-soft);">${e.dept} · ${e.selected} selected · ${e.rate}% success rate</div>
        </div>
        <div class="mono" style="font-size:20px;font-weight:700;color:var(--primary);">${e.count}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

/* ------------------------------- Employee: Rewards ------------------------------- */
function rewardsView(){
  const mine = state.referrals.filter(r=>r.referredBy===state.user.employeeId);
  const paid = mine.filter(r=>r.status==='Joined').reduce((s,r)=>s+(jobById(r.jobId)?.bonus||0),0);
  const pending = mine.filter(r=>r.status==='Offer').reduce((s,r)=>s+(jobById(r.jobId)?.bonus||0),0);
  const count = mine.length;
  const badges = [
    {icon:'🏆', name:'Talent Hunter', desc:'Refer your first candidate', unlocked: count>=1},
    {icon:'🌟', name:'Top Referrer', desc:'Refer 3+ candidates', unlocked: count>=3},
    {icon:'🚀', name:'Hiring Hero', desc:'Get 1 candidate hired', unlocked: mine.some(r=>r.status==='Joined')},
    {icon:'💎', name:'Gold Recruiter', desc:'Refer 5+ candidates', unlocked: count>=5},
  ];
  return `
  <div class="fade-up">
    <h1 class="display" style="font-size:24px;margin:0 0 18px;">Rewards</h1>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:26px;">
      ${statCard('Paid Bonus', '₹'+paid.toLocaleString('en-IN'), '💰', GRADS[2])}
      ${statCard('Pending Bonus', '₹'+pending.toLocaleString('en-IN'), '⏳', GRADS[4])}
      ${statCard('Gift Cards Earned', Math.floor(count/2), '🎁', GRADS[1])}
      ${statCard('Achievements', badges.filter(b=>b.unlocked).length+'/'+badges.length, '🏅', GRADS[0])}
    </div>
    <h3 class="display" style="font-size:16px;margin-bottom:12px;">Achievement Badges</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;">
      ${badges.map(b=>`
      <div class="glass tilt-card" style="padding:20px;text-align:center;opacity:${b.unlocked?1:0.45};">
        <div class="badge-icon" style="margin:0 auto 10px;background:${b.unlocked?'linear-gradient(135deg,#2563EB,#0891B2)':'rgba(37,99,235,0.1)'};">${b.icon}</div>
        <div style="font-weight:700;font-size:13.5px;">${b.name}</div>
        <div style="font-size:11.5px;color:var(--ink-soft);margin-top:2px;">${b.desc}</div>
        ${b.unlocked?'<div class="chip" style="background:rgba(5,150,105,0.15);color:#059669;margin-top:8px;">Unlocked</div>':'<div class="chip" style="background:rgba(37,99,235,0.08);color:var(--ink-soft);margin-top:8px;">Locked</div>'}
      </div>`).join('')}
    </div>
  </div>`;
}
