/* ------------------------------- User Management (Admin) ------------------------------- */
function userManagementView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <h1 class="display" style="font-size:24px;margin:0;">User Management</h1>
      <button class="btn btn-primary" id="refreshUsersBtn">🔄 Refresh</button>
    </div>
    <div id="usersList"></div>
  </div>`;
}

/* ------------------------------- Referral Policy View (both roles) ------------------------------- */
function policyView(){
  const canEdit = state.role==='admin';
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
        <button class="btn btn-outline" id="exportCsvBtn">📥 CSV</button>
        <button class="btn btn-outline" id="exportPdfBtn">📄 PDF</button>
        <button class="btn btn-outline" id="exportExcelBtn">📊 Excel</button>
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
          ${statCard('Total', filtered.length, '📨', GRADS[0])}
          ${statCard('Avg AI Score', filtered.length? Math.round(filtered.reduce((s,r)=>s+(r.aiScore||0),0)/filtered.length):'—', '🎯', GRADS[5])}
          ${statCard('Avg Match %', filtered.length? Math.round(filtered.reduce((s,r)=>s+(r.matchPercent||0),0)/filtered.length)+'%':'—', '📊', GRADS[1])}
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
          ${statCard('Total Referrals', data.totalReferrals||0, '📨', GRADS[0])}
          ${statCard('Joined', data.joined||0, '✅', GRADS[2])}
          ${statCard('Conversion Rate', (data.conversionRate||0)+'%', '📈', GRADS[1])}
          ${statCard('Active Employees', data.activeEmployees||0, '👥', GRADS[5])}
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
          ${statCard('Total Bonus Paid', '₹'+(data.totalBonus||0).toLocaleString('en-IN'), '💰', GRADS[4])}
          ${statCard('Hires with Bonus', data.totalPaid||0, '👥', GRADS[1])}
        </div>
        <div class="glass" style="padding:16px;">
          <h4 style="margin:0 0 10px;font-size:13.5px;">Bonus Breakdown</h4>
          ${(data.results||[]).map(e=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(226,232,240,0.08);font-size:12.5px;"><span>${e.candidateName} — ${e.jobTitle}</span><span class="mono" style="font-weight:700;color:var(--primary);">₹${(e.bonus||0).toLocaleString('en-IN')}</span></div>`).join('')||'<div style="font-size:12.5px;color:var(--ink-soft);">No bonus data.</div>'}
        </div>`;
      }
    }catch(e){ output.innerHTML=''; toast('Could not generate report: '+e.message, 'error'); }
  });

  function exportAs(format){
    const headers = ['Candidate','Job','Department','Referred By','Status','AI Score','Match %','Submitted'];
    const rows = state.referrals.map(r=>{
      const job = jobById(r.jobId); const emp = employeeById(r.referredBy);
      return [r.candidateName, job?.title||'', job?.dept||'', emp?.name||'', r.status, r.aiScore?.overall||'', r.matchPercent||'', r.submittedDate];
    });
    if(format==='csv'){
      let csv = headers.join(',')+'\n';
      rows.forEach(row=>{ csv += row.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')+'\n'; });
      const blob = new Blob([csv], {type:'text/csv'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='muraai-report.csv'; a.click();
      toast('CSV downloaded','success');
    } else if(format==='excel'){
      let xml = '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Report"><Table>';
      xml += '<Row>'+headers.map(h=>`<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')+'</Row>';
      rows.forEach(row=>{ xml += '<Row>'+row.map(c=>`<Cell><Data ss:Type="String">${String(c).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`).join('')+'</Row>'; });
      xml += '</Table></Worksheet></Workbook>';
      const blob = new Blob([xml], {type:'application/vnd.ms-excel'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='muraai-report.xls'; a.click();
      toast('Excel downloaded','success');
    } else if(format==='pdf'){
      let content = 'MURA AI REFER - REPORT\n';
      content += '='.repeat(60)+'\n\n';
      content += headers.join(' | ')+'\n';
      content += '-'.repeat(80)+'\n';
      rows.forEach(row=>{ content += row.join(' | ')+'\n'; });
      content += '\n'+'='.repeat(60)+'\n';
      content += `Generated: ${new Date().toLocaleString()}\nTotal Records: ${rows.length}\n`;
      const blob = new Blob([content], {type:'text/plain'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='muraai-report.txt'; a.click();
      toast('Report downloaded','success');
    }
  }
  document.getElementById('exportCsvBtn')?.addEventListener('click', ()=>exportAs('csv'));
  document.getElementById('exportPdfBtn')?.addEventListener('click', ()=>exportAs('pdf'));
  document.getElementById('exportExcelBtn')?.addEventListener('click', ()=>exportAs('excel'));
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
