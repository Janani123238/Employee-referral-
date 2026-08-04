/* ------------------------------- Employee: Refer Candidate ------------------------------- */
function referCandidateView(){
  const pre = state.lastAnalyzedResume;
  const pendingJob = state.referPendingJob;
  state.referPendingJob = null;
  if(state.jobs.length===0){
    return `<div class="glass" style="padding:40px;text-align:center;">
      <div style="font-size:38px;margin-bottom:10px;"></div>
      <h3 style="margin:0 0 6px;">No open roles to refer into yet</h3>
      <p style="color:var(--ink-soft);margin:0;">${isHrRole(state.role) ? 'Post a job first from Manage Jobs.' : 'Check back once HR posts an open role.'}</p>
    </div>`;
  }
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
      <div>
        <h1 class="display" style="font-size:24px;margin:0 0 4px;">Refer a Candidate</h1>
        <p style="color:var(--ink-soft);font-size:12.5px;margin:0;">muraai-refer / referral / new</p>
      </div>
    </div>
    ${state.aiStatus && !state.aiStatus.available ? `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:10px;background:rgba(217,119,6,0.08);border:1px solid rgba(217,119,6,0.2);margin-bottom:16px;font-size:12.5px;">
      <span style="color:#92400E;"><strong>AI-powered analysis is using built-in heuristics.</strong> Configure an AI provider (Ollama, OpenAI, Anthropic, or Gemini) in Admin → AI Settings for richer insights.</span>
    </div>` : ''}
    ${state.aiStatus && state.aiStatus.available ? `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:10px;background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.15);margin-bottom:16px;font-size:12.5px;">
      <span style="color:#065F46;">AI-powered: <strong>${state.aiStatus.provider}</strong> (${state.aiStatus.model})</span>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:20px;align-items:start;" id="referLayout">
      <div class="glass" style="padding:22px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
          <h3 style="margin:0;font-size:16px;" class="display">Candidate details</h3>
          <button class="btn btn-outline" id="autofillBtn" type="button">Autofill from Resume</button>
        </div>

        <div id="duplicateWarning"></div>

        <form id="referForm">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div><label class="field-label">Candidate Name *</label><input class="input" name="candidateName" required placeholder="e.g. Suresh Menon" value="${pre?.parsed?.name||''}"/></div>
            <div><label class="field-label">Phone</label><input class="input" name="phone" placeholder="+91 90000 00000" value="${pre?.parsed?.phone||''}"/></div>
            <div><label class="field-label">Email</label><input class="input" name="email" placeholder="candidate@email.com" value="${pre?.parsed?.email||''}"/></div>
            <div><label class="field-label">Current Company</label><input class="input" name="currentCompany" placeholder="e.g. Infotech Solutions" value="${pre?.parsed?.currentCompany||''}"/></div>
            <div><label class="field-label">Current Designation</label><input class="input" name="currentDesignation" placeholder="e.g. Senior Developer" value="${pre?.parsed?.currentDesignation||''}"/></div>
            <div><label class="field-label">Total Experience</label><input class="input" name="totalExperience" placeholder="e.g. 5 years" value="${pre?.parsed?.totalExperience||''}"/></div>
            <div><label class="field-label">Relevant Experience</label><input class="input" name="relevantExperience" placeholder="e.g. 3 years" value="${pre?.parsed?.relevantExperience||''}"/></div>
            <div><label class="field-label">Education</label><input class="input" name="education" placeholder="e.g. B.Tech CSE, IIT" value="${pre?.parsed?.education||''}"/></div>
            <div><label class="field-label">Skills (comma-separated)</label><input class="input" name="skills" placeholder="e.g. Python, React, AWS" value="${(pre?.parsed?.skills||[]).join(', ')}"/></div>
            <div><label class="field-label">Certifications (comma-separated)</label><input class="input" name="certifications" placeholder="e.g. AWS Solutions Architect" value="${(pre?.parsed?.certifications||[]).join(', ')}"/></div>
            <div><label class="field-label">Projects (comma-separated)</label><input class="input" name="projects" placeholder="e.g. E-commerce platform, Chatbot" value="${(pre?.parsed?.projects||[]).join(', ')}"/></div>
            <div><label class="field-label">LinkedIn</label><input class="input" name="linkedin" placeholder="linkedin.com/in/…" value="${pre?.parsed?.linkedin||''}"/></div>
            <div><label class="field-label">GitHub</label><input class="input" name="github" placeholder="github.com/…" value="${pre?.parsed?.github||''}"/></div>
            <div><label class="field-label">Portfolio</label><input class="input" name="portfolio" placeholder="Optional" value=""/></div>
            <div><label class="field-label">Preferred Location</label><input class="input" name="location" placeholder="e.g. Bengaluru / Remote" value=""/></div>
            <div><label class="field-label">Expected Salary</label><input class="input" name="expectedSalary" placeholder="e.g. ₹22 LPA" value=""/></div>
            <div><label class="field-label">Notice Period</label><input class="input" name="noticePeriod" placeholder="e.g. 30 days" value=""/></div>
          </div>

          <div style="margin-top:16px;">
            <label class="field-label">Role you're referring for *</label>
            <select class="input" name="jobId" required>
              ${state.jobs.map(j=>`<option value="${j.id}" ${pre?.bestJobId===j.id || pendingJob===j.id?'selected':''}>${j.title}</option>`).join('')}
            </select>
          </div>
          <div style="margin-top:14px;">
            <label class="field-label">Your relationship to candidate</label>
            <select class="input" name="relationship">
              <option>Ex-colleague</option><option>Friend</option><option>Former colleague</option><option>Former manager</option><option>Family</option><option>Acquaintance</option>
            </select>
          </div>

          <div style="margin-top:14px;">
            <label class="field-label">Resume</label>
            <input type="file" id="resumeFile" accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" style="display:none;"/>
            <div id="resumeDropzone" style="border:1.5px dashed rgba(37,99,235,0.35);border-radius:12px;padding:16px;text-align:center;cursor:pointer;font-size:13px;color:var(--ink-soft);transition:border-color .2s;">
              ${pre?.resumeFileName ? `📎 <strong style="color:var(--ink);">${pre.resumeFileName}</strong> attached` : '📎 Click to attach a resume file, or paste text via Autofill'}
            </div>
          </div>

          <div style="margin-top:18px;">
            <button type="submit" class="btn btn-primary" style="width:100%;padding:13px;">Submit Referral</button>
          </div>
        </form>
      </div>

      <div style="position:sticky;top:20px;">
        <div class="glass" style="padding:20px;margin-bottom:16px;" id="aiSummaryCard">
          ${aiSummaryCardHTML(pre)}
        </div>
        <div class="glass" style="padding:20px;margin-bottom:16px;" id="aiScoreCard">
          ${aiScoreCardHTML(pre)}
        </div>
        <div class="glass" style="padding:20px;" id="aiImprovementCard">
          ${aiImprovementCardHTML(pre)}
        </div>
      </div>
    </div>
  </div>`;
}
function skillBubbles(skills){
  return skills.map((s,i)=>`<span class="skill-bubble" style="background:${skillTagColor(i)};animation-delay:${i*0.15}s;">${s}</span>`).join('');
}
function aiSummaryCardHTML(pre){
  if(pre && pre.summary){
    const s = pre.summary;
    const fields = [];
    if(s.professionalSummary) fields.push(['Professional Summary', s.professionalSummary]);
    if(s.yearsOfExperience) fields.push(['Experience', s.yearsOfExperience + ' years']);
    if(s.educationSummary) fields.push(['Education', s.educationSummary]);
    if(s.recommendedPosition) fields.push(['Recommended Role', s.recommendedPosition]);
    if(s.hiringRecommendation) fields.push(['Hiring Rec.', s.hiringRecommendation]);
    if(s.suitableFor) fields.push(['Suitable For', s.suitableFor]);
    return `
      <h3 style="margin:0 0 10px;font-size:14.5px;">AI Candidate Summary</h3>
      ${fields.length ? fields.map(([k,v])=>`<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--ink-soft);font-weight:600;">${k}</div><div style="font-size:12.5px;color:var(--ink);line-height:1.5;">${v}</div></div>`).join('') : `<p style="font-size:12.5px;color:var(--ink);line-height:1.6;margin:0 0 8px;">${typeof s === 'string' ? s : JSON.stringify(s)}</p>`}
      ${(s.technicalSkills&&s.technicalSkills.length)?`<div style="margin-top:10px;"><div style="font-size:11px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Technical Skills</div><div>${s.technicalSkills.map((t,i)=>`<span class="skill-bubble" style="background:${skillTagColor(i)};animation:none;font-size:11px;padding:4px 10px;">${t}</span>`).join('')}</div></div>`:''}
      ${(s.strengths&&s.strengths.length)?`<div style="margin-top:10px;"><div style="font-size:11px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Strengths</div><ul style="margin:0;padding-left:16px;font-size:12px;color:var(--ink-soft);line-height:1.8;">${s.strengths.map(x=>`<li>${x}</li>`).join('')}</ul></div>`:''}
      ${(s.weaknesses&&s.weaknesses.length)?`<div style="margin-top:10px;"><div style="font-size:11px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Weaknesses</div><ul style="margin:0;padding-left:16px;font-size:12px;color:var(--ink-soft);line-height:1.8;">${s.weaknesses.map(x=>`<li>${x}</li>`).join('')}</ul></div>`:''}
    `;
  }
  return `
    <h3 style="margin:0 0 10px;font-size:14.5px;">AI Candidate Summary</h3>
    <p style="font-size:12.5px;color:var(--ink-soft);line-height:1.6;margin:0;">Fill in candidate details or autofill from resume to generate an instant AI summary.</p>
  `;
}
function aiScoreCardHTML(pre){
  const s = pre && pre.score;
  if(s){
    return `
      <h3 style="margin:0 0 14px;font-size:14.5px;">AI Quality Score</h3>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${scoreBar('Resume Quality', s.resumeQuality||0)}
        ${scoreBar('Skill Match', s.skillMatch||0)}
        ${scoreBar('Communication', s.communication||0)}
        ${scoreBar('Experience Match', s.experienceMatch||0)}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;">
        <span style="font-size:13px;font-weight:700;">Overall</span>
        <span class="mono" style="font-size:20px;font-weight:700;color:var(--primary);">${s.overall||0}/100</span>
      </div>
      ${s.experienceYears?`<div style="font-size:12px;color:var(--ink-soft);margin-top:6px;">Est. Experience: ${s.experienceYears} years</div>`:''}
      ${s.hiringProbability?`<div style="font-size:12px;color:var(--ink-soft);margin-top:2px;">Hiring Probability: ${s.hiringProbability}%</div>`:''}`;
  }
  return `
    <h3 style="margin:0 0 10px;font-size:14.5px;">AI Quality Score</h3>
    <p style="font-size:12.5px;color:var(--ink-soft);margin:0;">Scores appear once AI has analyzed the resume.</p>`;
}
function aiImprovementCardHTML(pre){
  const imp = pre && pre.improvement;
  if(imp){
    return `
      <h3 style="margin:0 0 10px;font-size:14.5px;">AI Resume Improvement</h3>
      ${imp.atsScore?`<div style="padding:10px 14px;border-radius:10px;background:rgba(37,99,235,0.08);margin-bottom:10px;display:flex;justify-content:space-between;"><span style="font-size:12px;font-weight:700;">ATS Score</span><span class="mono" style="font-weight:700;color:var(--primary);">${imp.atsScore}/100</span></div>`:''}
      ${imp.overallRating?`<div style="padding:10px 14px;border-radius:10px;background:rgba(5,150,105,0.06);margin-bottom:10px;display:flex;justify-content:space-between;"><span style="font-size:12px;font-weight:700;">Overall Rating</span><span class="mono" style="font-weight:700;color:#059669;">${imp.overallRating}/100</span></div>`:''}
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${(imp.missingSkills||[]).map(x=>`<div style="font-size:12px;color:var(--coral);">Missing skill: ${x}</div>`).join('')}
        ${(imp.missingKeywords||[]).map(x=>`<div style="font-size:12px;color:var(--amber,#D97706);">Missing keyword: ${x}</div>`).join('')}
        ${(imp.formattingSuggestions||[]).map(x=>`<div style="font-size:12px;color:var(--ink-soft);">Formatting: ${x}</div>`).join('')}
        ${(imp.grammarIssues||[]).map(x=>`<div style="font-size:12px;color:var(--ink-soft);">Grammar: ${x}</div>`).join('')}
        ${(imp.skillGapAnalysis||[]).map(x=>`<div style="font-size:12px;color:var(--cyan);">Skill gap: ${x}</div>`).join('')}
        ${(imp.certificationRecommendations||[]).map(x=>`<div style="font-size:12px;color:var(--ink-soft);">Cert: ${x}</div>`).join('')}
        ${(imp.projectRecommendations||[]).map(x=>`<div style="font-size:12px;color:var(--ink-soft);">Project: ${x}</div>`).join('')}
        ${(imp.suggestions||[]).map(x=>`<div style="font-size:12px;color:var(--primary);">${x}</div>`).join('')}
      </div>`;
  }
  return `
    <h3 style="margin:0 0 10px;font-size:14.5px;">AI Resume Improvement</h3>
    <p style="font-size:12.5px;color:var(--ink-soft);margin:0;">Suggestions appear once AI has analyzed the resume.</p>`;
}
function autofillModalHTML(){
  return `
  <div class="modal-overlay" id="autofillModalOverlay">
    <div class="glass-strong pop-in" style="max-width:560px;width:100%;padding:26px;">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:14px;">
        <h2 class="display" style="margin:0;font-size:18px;">Autofill from Resume</h2>
        <button class="btn btn-ghost" id="closeAutofillModal" style="font-size:18px;padding:4px 10px;">✕</button>
      </div>
      <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 12px;">Paste the candidate's resume text, or attach a file below — AI extracts everything and fills the form.</p>
      <textarea class="input" id="autofillResumeText" rows="8" placeholder="Paste resume text here…"></textarea>
      <div style="display:flex;gap:10px;margin-top:12px;">
        <button class="btn btn-outline" id="autofillUploadBtn" type="button">Attach File</button>
        <button class="btn btn-primary" id="autofillRunBtn" type="button" style="flex:1;">Parse &amp; Fill Form</button>
      </div>
      <div id="autofillStatus" style="font-size:12.5px;color:var(--ink-soft);margin-top:10px;"></div>
    </div>
  </div>`;
}
function bindReferView(){
  const dropzone = document.getElementById('resumeDropzone');
  const fileInput = document.getElementById('resumeFile');
  if(dropzone) dropzone.addEventListener('click', ()=> fileInput.click());
  if(fileInput) fileInput.addEventListener('change', async ()=>{
    const f = fileInput.files[0]; if(!f) return;
    if(f.name.toLowerCase().endsWith('.txt')){
      const reader = new FileReader();
      reader.onload = ()=>{
        const text = reader.result;
        dropzone.innerHTML = `📎 <strong style="color:var(--ink);">${f.name}</strong> attached`;
        state.lastAnalyzedResume = {...(state.lastAnalyzedResume||{parsed:{}}), resumeText:text, resumeFileName:f.name};
        toast('Resume file loaded', 'success');
        runAutofillAnalysis(text).catch(e=>{
          toast('AI analysis partial: some features may be unavailable', 'amber');
        });
      };
      reader.readAsText(f);
      return;
    }
    dropzone.innerHTML = `⏳ Uploading and extracting text from <strong style="color:var(--ink);">${f.name}</strong>… (OCR may take a moment)`;
    try{
      const result = await uploadResumeFile(f);
      dropzone.innerHTML = `📎 <strong style="color:var(--ink);">${result.fileName}</strong> attached — text extracted ✓`;
      state.lastAnalyzedResume = {
        ...(state.lastAnalyzedResume||{parsed:{}}),
        resumeText: result.extractedText,
        resumeFileName: result.fileName,
        resumeFileUrl: result.fileUrl,
      };
      toast('Resume uploaded and text extracted', 'success');
      runAutofillAnalysis(result.extractedText).catch(e=>{
        toast('AI analysis partial: some features may be unavailable', 'amber');
      });
    }catch(e){
      dropzone.innerHTML = `📎 Click to attach a resume file, or paste text via Autofill`;
      toast(e.message || 'Could not process that file', 'error');
    }
  });

  const autofillBtn = document.getElementById('autofillBtn');
  if(autofillBtn) autofillBtn.addEventListener('click', ()=>{
    const wrap = document.createElement('div');
    wrap.innerHTML = autofillModalHTML();
    document.body.appendChild(wrap);
    const overlay = document.getElementById('autofillModalOverlay');
    const close = ()=> wrap.remove();
    document.getElementById('closeAutofillModal').addEventListener('click', close);
    overlay.addEventListener('click', (e)=>{ if(e.target.id==='autofillModalOverlay') close(); });
    const ta = document.getElementById('autofillResumeText');
    if(state.lastAnalyzedResume?.resumeText) ta.value = state.lastAnalyzedResume.resumeText;
    const upBtn = document.getElementById('autofillUploadBtn');
    upBtn.addEventListener('click', ()=>{
      const tmp = document.createElement('input'); tmp.type='file'; tmp.accept='.txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp';
      tmp.addEventListener('change', async ()=>{
        const f = tmp.files[0]; if(!f) return;
        if(f.name.toLowerCase().endsWith('.txt')){
          const reader = new FileReader();
          reader.onload = ()=>{
            ta.value = reader.result;
            state.lastAnalyzedResume = {...(state.lastAnalyzedResume||{parsed:{}}), resumeFileName:f.name};
            toast('Text file loaded', 'success');
          };
          reader.readAsText(f);
          return;
        }
        const statusEl = document.getElementById('autofillStatus');
        statusEl.textContent = 'Uploading and extracting text (OCR may take a moment)…';
        upBtn.disabled = true;
        try{
          const result = await uploadResumeFile(f);
          ta.value = result.extractedText;
          state.lastAnalyzedResume = {...(state.lastAnalyzedResume||{parsed:{}}), resumeFileName:result.fileName, resumeFileUrl:result.fileUrl, resumeText:result.extractedText};
          statusEl.textContent = 'Text extracted ✓ — now analyzing with AI…';
          try{
            await runAutofillAnalysis(result.extractedText);
            statusEl.textContent = 'Done ✓ — form filled';
            setTimeout(close, 600);
          }catch(aiErr){
            statusEl.textContent = 'Text extracted ✓ — AI analysis will complete when you click Parse & Fill Form';
            toast('AI analysis partial: '+(aiErr.message||'some features unavailable'), 'amber');
          }
        }catch(e){
          statusEl.textContent = '';
          toast(e.message || 'Could not process that file', 'error');
        }
        upBtn.disabled = false;
      });
      tmp.click();
    });
    const runBtn = document.getElementById('autofillRunBtn');
    runBtn.addEventListener('click', async ()=>{
      const text = ta.value.trim();
      if(text.length < 20){ toast('Paste a fuller resume first (at least 20 characters)', 'amber'); return; }
      const statusEl = document.getElementById('autofillStatus');
      runBtn.disabled = true; statusEl.textContent = 'Parsing resume…';
      try{
        const parsed = await aiParseResume(text);
        if(!parsed) throw new Error('Could not parse resume text');
        
        const prevFileName = state.lastAnalyzedResume?.resumeFileName;
        const prevFileUrl = state.lastAnalyzedResume?.resumeFileUrl;
        state.lastAnalyzedResume = {
          resumeText:text, parsed, bestJobId:null, bestDetail:null,
          summary:'', score:{resumeQuality:50,skillMatch:50,communication:50,experienceMatch:50,overall:50},
          improvement:{missingSkills:[],grammarIssues:[],suggestions:[]},
          resumeFileName: prevFileName, resumeFileUrl: prevFileUrl,
        };

        fillFormFromParsed(parsed);
        statusEl.textContent = 'Resume parsed! Form filled. Loading AI analysis in background…';
        toast('Resume parsed and form filled','success');
        setTimeout(close, 800);

        Promise.allSettled([
          aiMatchAllJobs(text), aiSummary(text), aiQualityScore(text), aiImprovement(text),
        ]).then(bgResults=>{
          const ranked = bgResults[0].status==='fulfilled' ? bgResults[0].value : null;
          const summary = bgResults[1].status==='fulfilled' ? bgResults[1].value : null;
          const score = bgResults[2].status==='fulfilled' ? bgResults[2].value : null;
          const improvement = bgResults[3].status==='fulfilled' ? bgResults[3].value : null;
          let best = null, bestDetail = null;
          if(ranked && ranked.length){
            const top = ranked[0];
            best = state.jobs.find(j=>j.id===top.job.id) || null;
            bestDetail = top.match;
          }
          state.lastAnalyzedResume.summary = summary || '';
          state.lastAnalyzedResume.score = score || state.lastAnalyzedResume.score;
          state.lastAnalyzedResume.improvement = improvement || state.lastAnalyzedResume.improvement;
          state.lastAnalyzedResume.bestJobId = best ? best.id : null;
          state.lastAnalyzedResume.bestDetail = bestDetail;
          if(best){
            const form = document.getElementById('referForm');
            if(form) form.jobId.value = best.id;
          }
          const sc = document.getElementById('aiScoreCard'); if(sc) sc.innerHTML = aiScoreCardHTML(state.lastAnalyzedResume);
          const smc = document.getElementById('aiSummaryCard'); if(smc) smc.innerHTML = aiSummaryCardHTML(state.lastAnalyzedResume);
          const ic = document.getElementById('aiImprovementCard'); if(ic) ic.innerHTML = aiImprovementCardHTML(state.lastAnalyzedResume);
        }).catch(()=>{});
      }catch(e){
        statusEl.textContent = 'Parse failed: '+(e.message||'unknown error');
        toast('Parse failed: '+(e.message||'error'), 'error');
      }
      runBtn.disabled = false;
    });
  });

  const form = document.getElementById('referForm');
  if(form) form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const resumeText = (state.lastAnalyzedResume && state.lastAnalyzedResume.resumeText) || 'No resume text provided.';
    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true; submitBtn.textContent = 'Submitting…';
    const candidateName = fd.get('candidateName')?.trim();
    if(!candidateName){
      toast('Candidate name is required', 'amber');
      submitBtn.disabled = false; submitBtn.textContent = 'Submit Referral';
      return;
    }
    if(!fd.get('jobId')){
      toast('Please select a job to refer for', 'amber');
      submitBtn.disabled = false; submitBtn.textContent = 'Submit Referral';
      return;
    }
    const parseList = (v) => v ? v.split(',').map(s=>s.trim()).filter(Boolean) : [];
    const fields = {
      candidateName: fd.get('candidateName'), phone: fd.get('phone'), email: fd.get('email'),
      resumeText, linkedin: fd.get('linkedin'), github: fd.get('github'), portfolio: fd.get('portfolio'),
      location: fd.get('location'), expectedSalary: fd.get('expectedSalary'), noticePeriod: fd.get('noticePeriod'),
      currentCompany: fd.get('currentCompany'), currentDesignation: fd.get('currentDesignation'),
      totalExperience: fd.get('totalExperience'), relevantExperience: fd.get('relevantExperience'),
      skills: parseList(fd.get('skills')), education: fd.get('education'),
      certifications: parseList(fd.get('certifications')), projects: parseList(fd.get('projects')),
      relationship: fd.get('relationship'), jobId: fd.get('jobId'),
      resumeFileUrl: (state.lastAnalyzedResume && state.lastAnalyzedResume.resumeFileUrl) || '',
      resumeFileName: (state.lastAnalyzedResume && state.lastAnalyzedResume.resumeFileName) || '',
    };
    try{
      const referral = await submitReferralToBackend(fields);
      state.referrals.unshift(referral);
      toast(`Referral for ${referral.candidateName} submitted`, 'success');
    }catch(err){
      toast('Could not submit referral: '+err.message, 'error');
      submitBtn.disabled = false; submitBtn.textContent = 'Submit Referral';
      return;
    }
    state.lastAnalyzedResume = null;
    nav('tracking');
  });
}
function fillFormFromParsed(parsed){
  const form = document.getElementById('referForm');
  if(!form) return;
  if(parsed.name) form.candidateName.value = parsed.name;
  if(parsed.phone) form.phone.value = parsed.phone;
  if(parsed.email) form.email.value = parsed.email;
  if(parsed.currentCompany) form.currentCompany.value = parsed.currentCompany;
  if(parsed.totalExperience) form.totalExperience.value = parsed.totalExperience;
  if(parsed.education) form.education.value = parsed.education;
  if(parsed.skills && parsed.skills.length) form.skills.value = parsed.skills.join(', ');
  if(parsed.certifications && parsed.certifications.length) form.certifications.value = parsed.certifications.join(', ');
  if(parsed.projects && parsed.projects.length) form.projects.value = parsed.projects.join(', ');
  if(parsed.linkedin) form.linkedin.value = parsed.linkedin;
  if(parsed.github) form.github.value = parsed.github;
}

async function runAutofillAnalysis(text){
  const results = await Promise.allSettled([
    aiParseResume(text),
    aiMatchAllJobs(text),
    aiSummary(text),
    aiQualityScore(text),
    aiImprovement(text),
  ]);

  const parsed = results[0].status==='fulfilled' ? results[0].value : null;
  const ranked = results[1].status==='fulfilled' ? results[1].value : null;
  const summary = results[2].status==='fulfilled' ? results[2].value : null;
  const score = results[3].status==='fulfilled' ? results[3].value : null;
  const improvement = results[4].status==='fulfilled' ? results[4].value : null;

  if(!parsed){
    const errMsg = results[0].status==='rejected' ? (results[0].reason?.message||'') : '';
    throw new Error('AI could not parse this resume' + (errMsg ? ': '+errMsg : ''));
  }

  let best = null, bestDetail = null;
  if(ranked && ranked.length){
    const top = ranked[0];
    best = state.jobs.find(j=>j.id===top.job.id) || null;
    bestDetail = top.match;
  }

  const prevFileName = state.lastAnalyzedResume?.resumeFileName;
  const prevFileUrl = state.lastAnalyzedResume?.resumeFileUrl;
  state.lastAnalyzedResume = {
    resumeText:text, parsed, bestJobId: best?best.id:null, bestDetail,
    summary: summary || '',
    score: score || {resumeQuality:50,skillMatch:50,communication:50,experienceMatch:50,overall:50},
    improvement: improvement || {missingSkills:[],grammarIssues:[],suggestions:[]},
    resumeFileName: prevFileName, resumeFileUrl: prevFileUrl,
  };

  try{
    const dupCheck = await checkDuplicateReferral({email: parsed.email, phone: parsed.phone, name: parsed.name});
    const dupEl = document.getElementById('duplicateWarning');
    if(dupEl){
      if(dupCheck && dupCheck.duplicate){
        dupEl.innerHTML = `<div class="glass pop-in" style="padding:14px 16px;margin-bottom:16px;border:1.5px solid rgba(220,38,38,0.4);display:flex;gap:12px;align-items:center;">
          <div style="font-size:20px;">⚠️</div>
          <div><div style="font-weight:700;font-size:13px;">Candidate already referred</div>
          <div style="font-size:12px;color:var(--ink-soft);">By ${dupCheck.referredByName||'someone'} · ${fmtRelative(dupCheck.submittedDate)}</div></div>
        </div>`;
      } else { dupEl.innerHTML=''; }
    }
  }catch(e){ }

  const summaryCard = document.getElementById('aiSummaryCard');
  if(summaryCard) summaryCard.innerHTML = aiSummaryCardHTML(state.lastAnalyzedResume);
  const scoreCard = document.getElementById('aiScoreCard');
  if(scoreCard) scoreCard.innerHTML = aiScoreCardHTML(state.lastAnalyzedResume);
  const impCard = document.getElementById('aiImprovementCard');
  if(impCard) impCard.innerHTML = aiImprovementCardHTML(state.lastAnalyzedResume);

  const form = document.getElementById('referForm');
  if(form){
    form.candidateName.value = parsed.name||'';
    form.phone.value = parsed.phone||'';
    form.email.value = parsed.email||'';
    form.currentCompany.value = parsed.currentCompany||'';
    form.currentDesignation.value = parsed.currentDesignation||'';
    form.totalExperience.value = parsed.totalExperience||'';
    form.relevantExperience.value = parsed.relevantExperience||'';
    form.education.value = parsed.education||'';
    form.skills.value = (parsed.skills||[]).join(', ');
    form.certifications.value = (parsed.certifications||[]).join(', ');
    form.projects.value = (parsed.projects||[]).join(', ');
    form.linkedin.value = parsed.linkedin||'';
    form.github.value = parsed.github||'';
    if(best) form.jobId.value = best.id;
  }
  const dropzone = document.getElementById('resumeDropzone');
  if(dropzone && !state.lastAnalyzedResume.resumeFileName){
    dropzone.innerHTML = `📎 <strong style="color:var(--ink);">Resume text</strong> attached via Autofill`;
  }
  toast('Resume analyzed — form filled by AI', 'success');
}
