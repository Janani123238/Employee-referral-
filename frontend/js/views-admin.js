/* ------------------------------- User Management (Admin) ------------------------------- */
function userManagementView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <h1 class="display" style="font-size:24px;margin:0;">User Management</h1>
      <button class="btn btn-primary" id="refreshUsersBtn">Refresh</button>
    </div>
    <div id="usersList"></div>
  </div>`;
}

/* ------------------------------- Referral Policy View (both roles) ------------------------------- */
function policyView(){
  const canEdit = state.role==='admin' || state.role==='system_admin' || state.role==='chro';
  return `
  <div class="fade-up" style="max-width:720px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div><h1 class="display" style="font-size:24px;margin:0 0 4px;">Referral Policy</h1>
      <p style="color:var(--ink-soft);font-size:13px;margin:0;">${canEdit?'Edit the policy below — changes are saved immediately.':'Current employee referral policy.'}</p></div>
      ${canEdit?`<button class="btn btn-primary" id="savePolicyBtn">Save Policy</button>`:''}
    </div>
    <div class="glass" style="padding:24px;">
      ${canEdit?`<textarea class="input" id="policyEditor" rows="20" style="font-size:13.5px;line-height:1.7;">${state.policyContent}</textarea>`
      :`<div style="font-size:13.5px;line-height:1.8;white-space:pre-wrap;color:var(--ink);">${state.policyContent || 'No policy has been set yet.'}</div>`}
    </div>
  </div>`;
}
function bindPolicyView(){
  const btn = document.getElementById('savePolicyBtn');
  if(btn) btn.addEventListener('click', async ()=>{
    const content = document.getElementById('policyEditor').value;
    btn.disabled=true; btn.textContent='Saving…';
    try{
      await api('/api/policy', {method:'PUT', body:{content}});
      state.policyContent = content;
      toast('Policy updated', 'success');
    }catch(e){ toast('Could not save policy: '+e.message, 'error'); }
    btn.disabled=false; btn.textContent='Save Policy';
  });
}

/* ------------------------------- HR: Reports ------------------------------- */
function reportsView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div><h1 class="display" style="font-size:24px;margin:0 0 4px;">Reports & Analytics</h1>
      <p style="color:var(--ink-soft);font-size:13px;margin:0;">Generate, export, and analyze referral data</p></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="btn btn-outline report-tab active" data-report="referral">Referral Report</button>
      <button class="btn btn-outline report-tab" data-report="interview">Interview Report</button>
      <button class="btn btn-outline report-tab" data-report="offer">Offer Report</button>
      <button class="btn btn-outline report-tab" data-report="joining">Joining Report</button>
      <button class="btn btn-outline report-tab" data-report="bonus">Bonus Report</button>
      <button class="btn btn-outline report-tab" data-report="hiring">Hiring Analytics</button>
    </div>
    <div class="glass" style="padding:16px;margin-bottom:16px;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end;">
        <div><label class="field-label">Start Date</label><input class="input" type="date" id="reportStartDate" style="width:160px;"/></div>
        <div><label class="field-label">End Date</label><input class="input" type="date" id="reportEndDate" style="width:160px;"/></div>
        <div><label class="field-label">Department</label><input class="input" id="reportDept" placeholder="All" style="width:140px;"/></div>
        <div><label class="field-label">Status</label>
          <select class="input" id="reportStatus" style="width:140px;"><option value="">All</option>${PIPELINE_STAGES.concat('Rejected').map(s=>`<option>${s}</option>`).join('')}</select>
        </div>
        <button class="btn btn-primary" id="generateReportBtn">Generate</button>
        <button class="btn btn-outline" id="exportExcelBtn" title="Download as Excel (.xlsx)">Export Excel (.xlsx)</button>
        <button class="btn btn-outline" id="exportPdfBtn" title="Download as PDF">Export PDF</button>
      </div>
    </div>
    <div id="reportOutput"></div>
  </div>`;
}
function bindReportsView(){
  let activeReport = 'referral';
  document.querySelectorAll('.report-tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      document.querySelectorAll('.report-tab').forEach(t=>{t.classList.remove('active');t.style.background='';t.style.color='';});
      tab.classList.add('active'); tab.style.background='linear-gradient(120deg,var(--primary),var(--indigo))'; tab.style.color='#fff';
      activeReport = tab.dataset.report;
    });
  });
  document.querySelector('.report-tab.active')?.click();

  document.getElementById('generateReportBtn')?.addEventListener('click', async ()=>{
    const output = document.getElementById('reportOutput');
    output.innerHTML = `<div class="glass" style="padding:20px;"><div class="shimmer" style="height:80px;border-radius:12px;"></div></div>`;
    const filters = {
      startDate: document.getElementById('reportStartDate').value || null,
      endDate: document.getElementById('reportEndDate').value || null,
      dept: document.getElementById('reportDept').value || null,
      status: document.getElementById('reportStatus').value || null,
    };
    try{
      const endpoint = activeReport==='hiring'?'/api/reports/hiring-analytics':activeReport==='bonus'?'/api/reports/bonus-report':'/api/reports/referral-report';
      const data = await api(endpoint, {method:'POST', body:filters});
      if(activeReport==='referral'||activeReport==='interview'||activeReport==='offer'||activeReport==='joining'){
        let filtered = data.results||[];
        if(activeReport==='interview') filtered=filtered.filter(r=>['Technical Round','Manager Round','HR Round'].includes(r.status));
        else if(activeReport==='offer') filtered=filtered.filter(r=>r.status==='Offer');
        else if(activeReport==='joining') filtered=filtered.filter(r=>r.status==='Joined');
        const summary = data.summary || {};
        output.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:16px;">
          ${statCard('Total', filtered.length, 'referrals', GRADS[0])}
          ${statCard('Avg AI Score', filtered.length? Math.round(filtered.reduce((s,r)=>s+(r.aiScore||0),0)/filtered.length):'—', 'score', GRADS[5])}
          ${statCard('Avg Match %', filtered.length? Math.round(filtered.reduce((s,r)=>s+(r.matchPercent||0),0)/filtered.length)+'%':'—', 'match', GRADS[1])}
        </div>
        <div class="glass" style="padding:6px;overflow-x:auto;">
          <table class="data-table">
            <thead><tr><th>Candidate</th><th>Job</th><th>Department</th><th>Referred By</th><th>AI Score</th><th>Match %</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>${filtered.map(r=>`<tr>
              <td><strong>${r.candidateName}</strong></td><td>${r.jobTitle}</td><td>${r.department}</td><td>${r.referredBy}</td>
              <td class="mono" style="font-weight:700;color:var(--primary);">${r.aiScore||'—'}</td><td>${r.matchPercent||'—'}%</td>
              <td><span class="chip" style="background:${statusColor(r.status)}22;color:${statusColor(r.status)};">${r.status}</span></td>
              <td style="font-size:12px;color:var(--ink-soft);">${fmtRelative(r.submittedDate)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>`;
      } else if(activeReport==='hiring'){
        output.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:16px;">
          ${statCard('Total Referrals', data.totalReferrals||0, 'referrals', GRADS[0])}
          ${statCard('Joined', data.joined||0, 'joined', GRADS[2])}
          ${statCard('Conversion Rate', (data.conversionRate||0)+'%', 'conversion', GRADS[1])}
          ${statCard('Active Employees', data.activeEmployees||0, 'active', GRADS[5])}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="glass" style="padding:16px;">
            <h4 style="margin:0 0 10px;font-size:13.5px;">By Department</h4>
            ${(Object.entries(data.byDepartment||{})).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12.5px;border-bottom:1px solid rgba(226,232,240,0.08);"><span>${k}</span><span class="mono" style="font-weight:700;">${v}</span></div>`).join('')||'<div style="font-size:12.5px;color:var(--ink-soft);">No data.</div>'}
          </div>
          <div class="glass" style="padding:16px;">
            <h4 style="margin:0 0 10px;font-size:13.5px;">Top Referrers</h4>
            ${(Object.entries(data.topReferrers||{})).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12.5px;border-bottom:1px solid rgba(226,232,240,0.08);"><span>${k}</span><span class="mono" style="font-weight:700;">${v}</span></div>`).join('')||'<div style="font-size:12.5px;color:var(--ink-soft);">No data.</div>'}
          </div>
        </div>`;
      } else {
        output.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:16px;">
          ${statCard('Total Bonus Paid', '₹'+(data.totalBonus||0).toLocaleString('en-IN'), 'bonus', GRADS[4])}
          ${statCard('Hires with Bonus', data.totalPaid||0, 'joined', GRADS[1])}
        </div>
        <div class="glass" style="padding:16px;">
          <h4 style="margin:0 0 10px;font-size:13.5px;">Bonus Breakdown</h4>
          ${(data.results||[]).map(e=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(226,232,240,0.08);font-size:12.5px;"><span>${e.candidateName} — ${e.jobTitle}</span><span class="mono" style="font-weight:700;color:var(--primary);">₹${(e.bonus||0).toLocaleString('en-IN')}</span></div>`).join('')||'<div style="font-size:12.5px;color:var(--ink-soft);">No bonus data.</div>'}
        </div>`;
      }
    }catch(e){ output.innerHTML=''; toast('Could not generate report: '+e.message, 'error'); }
  });

  async function exportReport(format){
    const filters = {
      startDate: document.getElementById('reportStartDate').value || null,
      endDate: document.getElementById('reportEndDate').value || null,
      dept: document.getElementById('reportDept').value || null,
      status: document.getElementById('reportStatus').value || null,
    };
    try{
      const res = await fetch(API_BASE + '/api/reports/export', {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:'Bearer '+(getToken()||'')},
        body: JSON.stringify({reportType: activeReport, format, filters}),
      });
      if(res.status === 401){
        clearToken(); state.user=null; state.role=null; render();
        throw new Error('Session expired, please sign in again');
      }
      if(!res.ok){
        let data=null; try{ data = await res.json(); }catch(e){}
        throw new Error((data && (data.detail || data.message)) || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = (match && match[1]) || `muraai-report.${format==='xlsx'?'xlsx':'pdf'}`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      toast(`${format.toUpperCase()} downloaded`, 'success');
    }catch(e){ toast('Export failed: '+e.message, 'error'); }
  }
  document.getElementById('exportExcelBtn')?.addEventListener('click', ()=>exportReport('xlsx'));
  document.getElementById('exportPdfBtn')?.addEventListener('click', ()=>exportReport('pdf'));
}

/* ------------------------------- Admin: Config Settings ------------------------------- */
function adminSettingsView(){
  const s = state.settings;
  return `
  <div class="fade-up" style="max-width:680px;">
    <h1 class="display" style="font-size:24px;margin:0 0 6px;">System Configuration</h1>
    <p style="color:var(--ink-soft);font-size:13px;margin:0 0 18px;">Configure AI provider, model, API keys, OCR, and email settings.</p>
    <div class="glass" style="padding:22px;margin-bottom:16px;">
      <h3 style="margin:0 0 14px;font-size:15px;">AI Provider Settings</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div><label class="field-label">AI Provider</label>
          <select class="input" id="cfgAiProvider">
            <option value="ollama" ${s.aiProvider==='ollama'?'selected':''}>Ollama (Local)</option>
            <option value="openai" ${s.aiProvider==='openai'?'selected':''}>OpenAI</option>
            <option value="anthropic" ${s.aiProvider==='anthropic'?'selected':''}>Anthropic (Claude)</option>
            <option value="gemini" ${s.aiProvider==='gemini'?'selected':''}>Google Gemini</option>
          </select>
        </div>
        <div><label class="field-label">Model Name</label><input class="input" id="cfgAiModel" value="${s.aiModel||'llama3.2'}"/></div>
        <div style="grid-column:1/-1;"><label class="field-label">API Key (leave blank for local Ollama)</label><input class="input" id="cfgAiApiKey" type="password" value="${s.aiApiKey||''}" placeholder="sk-..."/></div>
        <div><label class="field-label">Temperature: <span class="mono" id="cfgTempVal">${s.aiTemperature||0.2}</span></label>
          <input class="input" id="cfgAiTemp" type="range" min="0" max="1" step="0.05" value="${s.aiTemperature||0.2}" style="padding:0;border:none;"/></div>
        <div><label class="field-label">Max Tokens</label><input class="input" id="cfgAiTokens" type="number" value="${s.aiMaxTokens||1000}"/></div>
      </div>
    </div>
    <div class="glass" style="padding:22px;margin-bottom:16px;">
      <h3 style="margin:0 0 14px;font-size:15px;">OCR Settings</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div><label class="field-label">OCR Enabled</label>
          <label style="display:flex;align-items:center;gap:8px;margin-top:4px;">
            <input type="checkbox" id="cfgOcrEnabled" ${s.ocrEnabled?'checked':''}/> Enable OCR for scanned resumes
          </label>
        </div>
        <div><label class="field-label">OCR Language</label>
          <select class="input" id="cfgOcrLang">
            <option value="eng" ${s.ocrLanguage==='eng'?'selected':''}>English</option>
            <option value="hin" ${s.ocrLanguage==='hin'?'selected':''}>Hindi</option>
            <option value="eng+hin" ${s.ocrLanguage==='eng+hin'?'selected':''}>English + Hindi</option>
          </select>
        </div>
      </div>
    </div>
    <div class="glass" style="padding:22px;margin-bottom:16px;">
      <h3 style="margin:0 0 14px;font-size:15px;">SMTP / Email Configuration</h3>
      <p style="font-size:12px;color:var(--ink-soft);margin:0 0 12px;">Configure email delivery for notifications, welcome emails, and status updates.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div><label class="field-label">SMTP Host</label><input class="input" id="cfgSmtpHost" value="${s.smtpHost||''}" placeholder="smtp.gmail.com"/></div>
        <div><label class="field-label">SMTP Port</label><input class="input" id="cfgSmtpPort" type="number" value="${s.smtpPort||587}"/></div>
        <div><label class="field-label">SMTP Username</label><input class="input" id="cfgSmtpUser" value="${s.smtpUser||''}" placeholder="your@email.com"/></div>
        <div><label class="field-label">SMTP Password</label><input class="input" id="cfgSmtpPass" type="password" value="${s.smtpPassword||''}" placeholder="App password"/></div>
        <div style="grid-column:1/-1;"><label class="field-label">From Address</label><input class="input" id="cfgSmtpFrom" value="${s.smtpFrom||'MuraAI Refer <no-reply@muraai.com>'}"/></div>
        <div><label class="field-label">Use TLS</label>
          <label style="display:flex;align-items:center;gap:8px;margin-top:4px;">
            <input type="checkbox" id="cfgSmtpTls" ${s.smtpUseTls!==false?'checked':''}/> Enable TLS encryption
          </label>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-primary" id="saveAdminConfigBtn">Save Configuration</button>
    </div>
  </div>`;
}
function bindAdminSettings(){
  const tempSlider = document.getElementById('cfgAiTemp');
  const tempVal = document.getElementById('cfgTempVal');
  if(tempSlider && tempVal) tempSlider.addEventListener('input', ()=>{ tempVal.textContent = tempSlider.value; });

  document.getElementById('saveAdminConfigBtn')?.addEventListener('click', async ()=>{
    const btn = document.getElementById('saveAdminConfigBtn');
    btn.disabled=true; btn.textContent='Saving…';
    const patch = {
      aiProvider: document.getElementById('cfgAiProvider').value,
      aiModel: document.getElementById('cfgAiModel').value,
      aiApiKey: document.getElementById('cfgAiApiKey').value,
      aiTemperature: parseFloat(document.getElementById('cfgAiTemp').value),
      aiMaxTokens: parseInt(document.getElementById('cfgAiTokens').value,10),
      ocrEnabled: document.getElementById('cfgOcrEnabled').checked,
      ocrLanguage: document.getElementById('cfgOcrLang').value,
      smtpHost: document.getElementById('cfgSmtpHost')?.value || '',
      smtpPort: parseInt(document.getElementById('cfgSmtpPort')?.value || '587', 10),
      smtpUser: document.getElementById('cfgSmtpUser')?.value || '',
      smtpPassword: document.getElementById('cfgSmtpPass')?.value || '',
      smtpFrom: document.getElementById('cfgSmtpFrom')?.value || '',
      smtpUseTls: document.getElementById('cfgSmtpTls')?.checked ?? true,
    };
    try{
      const updated = await updateSettingsBackend(patch);
      state.settings = updated;
      toast('Configuration saved', 'success');
    }catch(e){ toast('Could not save: '+e.message, 'error'); }
    btn.disabled=false; btn.textContent='Save Configuration';
  });
}

/* ------------------------------- Email Templates (HR/Admin) ------------------------------- */
function emailTemplatesView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <div><h1 class="display" style="font-size:24px;margin:0 0 4px;">Email Composer</h1>
      <p style="color:var(--ink-soft);font-size:13px;margin:0;">AI-powered email composer with direct sending</p></div>
    </div>
    <div id="emailTabContent"></div>
  </div>`;
}
async function bindEmailTemplatesView(){
  const container = document.getElementById('emailTabContent');
  if(!container) return;

  const prompts = [
    'Generate interview invitation email',
    'Generate interview reminder',
    'Generate rejection email',
    'Generate offer letter email',
    'Generate document request email',
    'Generate follow-up email',
  ];
  container.innerHTML = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
    <div class="glass" style="padding:20px;">
      <h3 style="margin:0 0 14px;font-size:15px;">AI Email Generator</h3>
      <div style="margin-bottom:12px;"><label class="field-label">Quick Prompts</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
          ${prompts.map(p=>`<button class="btn btn-ghost email-prompt-btn" style="font-size:11px;padding:4px 10px;border:1px solid rgba(37,99,235,0.15);">${p}</button>`).join('')}
        </div>
      </div>
      <div style="margin-bottom:12px;"><label class="field-label">Email Context</label>
        <select class="input" id="emailContext">
          <option value="general">General</option>
          <option value="interview_invite">Interview Invitation</option>
          <option value="reminder">Interview Reminder</option>
          <option value="rejection">Rejection</option>
          <option value="offer">Job Offer</option>
          <option value="follow_up">Follow-up</option>
          <option value="document_request">Document Request</option>
        </select>
      </div>
      <div style="margin-bottom:12px;"><label class="field-label">Candidate Name</label><input class="input" id="emailCandidate" placeholder="Candidate name"/></div>
      <div style="margin-bottom:12px;"><label class="field-label">Job Title</label><input class="input" id="emailJobTitle" placeholder="Job title"/></div>
      <div style="margin-bottom:12px;"><label class="field-label">Your Instructions</label>
        <textarea class="input" id="emailPrompt" rows="3" placeholder="Describe what you want the email to say..."></textarea>
      </div>
      <button class="btn btn-primary" id="aiComposeBtn">Generate with AI</button>
    </div>
    <div class="glass" style="padding:20px;">
      <h3 style="margin:0 0 14px;font-size:15px;">Email Preview & Edit</h3>
      <div style="margin-bottom:10px;"><label class="field-label">Subject</label><input class="input" id="emailSubject" placeholder="Email subject"/></div>
      <div style="margin-bottom:10px;"><label class="field-label">Body</label><textarea class="input" id="emailBody" rows="10" style="font-size:13px;line-height:1.6;"></textarea></div>
      <div style="margin-bottom:10px;"><label class="field-label">To (recipient email addresses, comma-separated)</label><input class="input" id="emailTo" placeholder="e.g. candidate@example.com, hr@example.com"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div><label class="field-label">CC</label><input class="input" id="emailCc" placeholder="CC addresses"/></div>
        <div><label class="field-label">BCC</label><input class="input" id="emailBcc" placeholder="BCC addresses"/></div>
      </div>
      <button class="btn btn-primary" id="sendEmailBtn">Send Email</button>
      <div id="emailStatus" style="margin-top:10px;font-size:12px;color:var(--ink-soft);"></div>
    </div>
  </div>`;

  document.querySelectorAll('.email-prompt-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.getElementById('emailPrompt').value = btn.textContent;
      const ctxMap = {'Generate interview invitation email':'interview_invite','Generate interview reminder':'reminder','Generate rejection email':'rejection','Generate offer letter email':'offer','Generate document request email':'document_request','Generate follow-up email':'follow_up'};
      document.getElementById('emailContext').value = ctxMap[btn.textContent]||'general';
    });
  });

  document.getElementById('aiComposeBtn').addEventListener('click', async ()=>{
    const btn = document.getElementById('aiComposeBtn');
    btn.disabled=true; btn.textContent='Generating...';
    document.getElementById('emailStatus').textContent='AI is generating your email...';
    try{
      const result = await api('/api/ai/compose-email', {method:'POST', body:{
        prompt: document.getElementById('emailPrompt').value,
        context: document.getElementById('emailContext').value,
        candidateName: document.getElementById('emailCandidate').value,
        jobTitle: document.getElementById('emailJobTitle').value,
      }});
      document.getElementById('emailSubject').value = result.subject || '';
      document.getElementById('emailBody').value = result.body || '';
      document.getElementById('emailStatus').textContent='Email generated. Edit if needed, then enter recipient(s) and send.';
      toast('Email generated','success');
    }catch(e){ toast('AI generation failed: '+e.message,'error'); document.getElementById('emailStatus').textContent='Generation failed. Please try again.'; }
    btn.disabled=false; btn.textContent='Generate with AI';
  });

  document.getElementById('sendEmailBtn').addEventListener('click', async ()=>{
    const btn = document.getElementById('sendEmailBtn');
    const toRaw = document.getElementById('emailTo').value.trim();
    if(!toRaw){ toast('Please enter at least one recipient email in the To field','amber'); document.getElementById('emailTo').focus(); return; }
    const to = toRaw.split(',').map(e=>e.trim()).filter(Boolean);
    if(!to.length){ toast('Please enter valid email addresses','amber'); document.getElementById('emailTo').focus(); return; }
    if(!document.getElementById('emailSubject').value.trim()){ toast('Subject is required','amber'); document.getElementById('emailSubject').focus(); return; }
    if(!document.getElementById('emailBody').value.trim()){ toast('Email body is required','amber'); document.getElementById('emailBody').focus(); return; }
    btn.disabled=true; btn.textContent='Sending...';
    document.getElementById('emailStatus').textContent='Sending email...';
    try{
      const result = await api('/api/ai/send-email', {method:'POST', body:{
        to,
        cc: document.getElementById('emailCc').value.split(',').map(e=>e.trim()).filter(Boolean),
        bcc: document.getElementById('emailBcc').value.split(',').map(e=>e.trim()).filter(Boolean),
        subject: document.getElementById('emailSubject').value,
        body: document.getElementById('emailBody').value,
      }});
      document.getElementById('emailStatus').textContent = result.message || 'Email sent';
      if(result.sent > 0) toast(result.message,'success');
      else toast(result.message || 'Email could not be sent','error');
    }catch(e){ toast('Send failed: '+e.message,'error'); document.getElementById('emailStatus').textContent='Send failed.'; }
    btn.disabled=false; btn.textContent='Send Email';
  });
}

/* ------------------------------- Audit Logs (Admin) ------------------------------- */
function auditLogsView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <div><h1 class="display" style="font-size:24px;margin:0 0 4px;">Audit Logs</h1>
      <p style="color:var(--ink-soft);font-size:13px;margin:0;">System activity and security audit trail</p></div>
    </div>
    <div id="auditLogsList"></div>
  </div>`;
}
async function bindAuditLogsView(){
  const container = document.getElementById('auditLogsList');
  if(!container) return;
  container.innerHTML = `<div class="glass" style="padding:20px;"><div class="shimmer" style="height:60px;border-radius:12px;"></div></div>`;
  try{
    const logs = await api('/api/admin/audit-logs');
    if(!logs || logs.length===0){
      container.innerHTML = `<div class="glass" style="padding:40px;text-align:center;color:var(--ink-soft);">No audit logs recorded yet.</div>`;
      return;
    }
    container.innerHTML = `
    <div class="glass" style="padding:6px;overflow-x:auto;">
      <table class="data-table">
        <thead><tr><th>User</th><th>Role</th><th>Action</th><th>Target</th><th>Details</th><th>Time</th></tr></thead>
        <tbody>
          ${logs.map(l=>`<tr>
            <td><strong>${l.userName||'—'}</strong></td>
            <td><span class="chip" style="background:rgba(37,99,235,0.12);color:var(--primary);">${l.userRole||'—'}</span></td>
            <td style="font-size:12px;">${l.action}</td>
            <td style="font-size:12px;">${l.target||'—'}</td>
            <td style="font-size:12px;max-width:200px;">${l.details||'—'}</td>
            <td style="font-size:11px;color:var(--ink-soft);">${fmtRelative(l.created_at)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }catch(e){ container.innerHTML='<div class="glass" style="padding:20px;color:var(--coral);">Could not load logs: '+e.message+'</div>'; }
}

/* ------------------------------- Email Center (Admin) ------------------------------- */
function emailCenterView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <div><h1 class="display" style="font-size:24px;margin:0 0 4px;">Email Center</h1>
      <p style="color:var(--ink-soft);font-size:13px;margin:0;">Compose, send, and track candidate communications</p></div>
      <button class="btn btn-primary" id="ecComposeBtn">Compose Email</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="btn btn-outline report-tab active" data-ectab="history">Sent History</button>
      <button class="btn btn-outline report-tab" data-ectab="compose">Compose</button>
    </div>
    <div id="ecContent"></div>
    <div id="ecModal"></div>
  </div>`;
}

async function bindEmailCenterView(){
  const content = document.getElementById('ecContent');
  if(!content) return;

  const loadHistory = async ()=>{
    content.innerHTML = `<div class="glass" style="padding:20px;"><div class="shimmer" style="height:60px;border-radius:12px;"></div></div>`;
    try{
      const emails = await api('/api/emails/history');
      if(!emails || emails.length===0){
        content.innerHTML = `<div class="glass" style="padding:40px;text-align:center;color:var(--ink-soft);">No emails have been sent yet.</div>`;
        return;
      }
      const statusColor = {sent:'#059669', delivered:'#059669', scheduled:'#D97706', failed:'#DC2626'};
      content.innerHTML = `
      <div class="glass" style="padding:6px;overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>To</th><th>Subject</th><th>Type</th><th>Status</th><th>Category</th><th>Sent</th><th></th></tr></thead>
          <tbody>
            ${emails.map(e=>{
              const sc = statusColor[(e.status||'').toLowerCase()] || '#2563EB';
              return `<tr>
                <td><strong>${e.toEmail||'—'}</strong>${e.cc?`<div style="font-size:11px;color:var(--ink-soft);">cc: ${e.cc}</div>`:''}</td>
                <td style="font-size:12.5px;max-width:260px;">${e.subject||'—'}</td>
                <td><span class="chip" style="background:rgba(37,99,235,0.12);color:var(--primary);">${e.emailType||'general'}</span></td>
                <td><span class="chip" style="background:${sc}18;color:${sc};">${e.status||'—'}</span></td>
                <td style="font-size:12px;">${e.category||'—'}</td>
                <td style="font-size:11.5px;color:var(--ink-soft);">${e.createdAt?new Date(e.createdAt).toLocaleString():'—'}</td>
                <td>${e.body?`<button class="btn btn-ghost" style="font-size:11px;padding:3px 8px;" data-ec-view='${e.id}'>View</button>`:''}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:10px;font-size:12px;color:var(--ink-soft);">${emails.length} email record(s)</div>`;
      content.querySelectorAll('[data-ec-view]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const e = emails.find(x=>x.id===btn.dataset.ecView);
          if(!e) return;
          document.getElementById('ecModal').innerHTML = `
          <div class="modal-overlay" id="ecOverlay">
            <div class="glass-strong pop-in" style="max-width:600px;width:100%;padding:24px;max-height:85vh;overflow-y:auto;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <h3 style="margin:0;font-size:15px;">${e.subject||'Email'}</h3>
                <button class="btn btn-ghost" onclick="document.getElementById('ecOverlay').remove()" style="padding:6px;">${icon('x',16)}</button>
              </div>
              <div style="font-size:12px;color:var(--ink-soft);margin-bottom:12px;">To: <strong>${e.toEmail}</strong>${e.cc?' · cc: '+e.cc:''} · ${e.emailType||'general'} · ${e.createdAt?new Date(e.createdAt).toLocaleString():''}</div>
              <div class="glass" style="padding:16px;font-size:13px;line-height:1.6;white-space:pre-wrap;">${e.body||'(empty body)'}</div>
            </div>
          </div>`;
        });
      });
    }catch(e){ content.innerHTML = `<div class="glass" style="padding:20px;color:var(--coral);">Could not load email history: ${e.message}</div>`; }
  };

  const loadCompose = ()=>{
    const candidates = state.referrals.filter(r=>r.email);
    content.innerHTML = `
    <div class="glass" style="padding:20px;max-width:760px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div><label class="field-label">Recipient</label>
          <select class="input" id="ecToSelect"><option value="">Custom…</option>${candidates.map(r=>`<option value="${r.email}">${r.candidateName} &lt;${r.email}&gt;</option>`).join('')}</select>
        </div>
        <div><label class="field-label">Or Custom Email</label><input class="input" id="ecToCustom" placeholder="hr@muraai.com"/></div>
        <div style="grid-column:1/-1;"><label class="field-label">Subject</label><input class="input" id="ecSubject" placeholder="Subject line"/></div>
        <div style="grid-column:1/-1;"><label class="field-label">Message</label><textarea class="input" id="ecBody" rows="8" placeholder="Write your message…"></textarea></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;">
        <button class="btn btn-outline" id="ecAiBtn">AI Compose</button>
        <button class="btn btn-primary" id="ecSendBtn">Send Email</button>
      </div>
      <div id="ecAiArea"></div>
    </div>`;

    document.getElementById('ecAiBtn').addEventListener('click', async ()=>{
      const aiArea = document.getElementById('ecAiArea');
      const prompt = document.getElementById('ecBody').value.trim();
      const candName = candidates.find(c=>c.email===document.getElementById('ecToSelect').value)?.candidateName || 'the candidate';
      aiArea.innerHTML = `<div style="margin-top:12px;font-size:12px;color:var(--ink-soft);">AI is composing…</div>`;
      try{
        const r = await api('/api/ai/compose-email', {method:'POST', body:{context:'general', candidateName:candName, jobTitle:'the position', companyName:'MuraAI', prompt:prompt}});
        document.getElementById('ecSubject').value = r.subject || '';
        document.getElementById('ecBody').value = r.body || '';
        aiArea.innerHTML = `<div style="margin-top:12px;font-size:12px;color:#059669;">AI draft ready — review and send.</div>`;
      }catch(e){
        aiArea.innerHTML = `<div style="margin-top:12px;font-size:12px;color:var(--coral);">AI compose failed: ${e.message}</div>`;
      }
    });

    document.getElementById('ecSendBtn').addEventListener('click', async ()=>{
      const to = document.getElementById('ecToSelect').value || document.getElementById('ecToCustom').value.trim();
      const subject = document.getElementById('ecSubject').value.trim();
      const body = document.getElementById('ecBody').value.trim();
      if(!to){ toast('Enter a recipient email', 'amber'); return; }
      if(!subject || !body){ toast('Subject and message are required', 'amber'); return; }
      try{
        const r = await api('/api/ai/send-email', {method:'POST', body:{to:[to], subject, body, emailType:'general'}});
        toast(r.message || 'Email sent', 'success');
        document.getElementById('ecToSelect').value='';
        document.getElementById('ecToCustom').value='';
        document.getElementById('ecSubject').value='';
        document.getElementById('ecBody').value='';
      }catch(e){ toast('Send failed: '+e.message, 'error'); }
    });
  };

  const switchTab = (tab)=>{
    document.querySelectorAll('[data-ectab]').forEach(b=>{
      b.classList.toggle('active', b.dataset.ectab===tab);
      b.style.background = b.dataset.ectab===tab ? 'linear-gradient(120deg,var(--primary),var(--indigo))' : '';
      b.style.color = b.dataset.ectab===tab ? '#fff' : '';
    });
    if(tab==='history') loadHistory();
    else loadCompose();
  };

  document.querySelectorAll('[data-ectab]').forEach(b=> b.addEventListener('click', ()=>switchTab(b.dataset.ectab)));
  document.getElementById('ecComposeBtn').addEventListener('click', ()=>switchTab('compose'));
  switchTab('history');
}

