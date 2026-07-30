/* ------------------------------- AI Chat Assistant Widget ------------------------------- */
function chatWidget(){
  return `
  <button class="assist-orb pulse" id="assistOrb">🤖</button>
  ${state.chat.open ? chatPanel() : ''}
  `;
}
function chatPanel(){
  return `
  <div class="glass-strong pop-in" id="chatPanel" style="position:fixed;bottom:100px;right:26px;width:340px;height:440px;display:flex;flex-direction:column;z-index:150;padding:0;overflow:hidden;">
    <div style="padding:16px 18px;background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#fff;display:flex;justify-content:space-between;align-items:center;">
      <div><div style="font-weight:700;font-size:14px;">✨ MuraAI Assistant</div><div style="font-size:11px;opacity:0.85;">Ask about jobs, bonus, status, policy</div></div>
      <button id="closeChatBtn" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;">✕</button>
    </div>
    <div id="chatMessages" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;">
      ${state.chat.messages.length===0 ? `<div style="font-size:12.5px;color:var(--ink-soft);text-align:center;margin-top:20px;">Try: "Which job suits me?" or "How much is the referral bonus?"</div>` :
        state.chat.messages.map(m=> chatBubble(m)).join('')}
    </div>
    <div style="padding:12px;border-top:1px solid rgba(226,232,240,0.1);display:flex;gap:8px;">
      <input class="input" id="chatInput" placeholder="Ask something…" style="flex:1;"/>
      <button class="btn btn-primary" id="chatSendBtn" style="padding:10px 14px;">➤</button>
    </div>
  </div>`;
}
function chatBubble(m){
  const mine = m.role==='user';
  return `<div style="align-self:${mine?'flex-end':'flex-start'};max-width:82%;">
    <div style="padding:9px 13px;border-radius:14px;font-size:12.5px;line-height:1.5;white-space:pre-wrap;${mine?'background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#fff;border-bottom-right-radius:4px;':'background:rgba(37,99,235,0.08);color:var(--ink);border-bottom-left-radius:4px;'}">${m.content}</div>
  </div>`;
}
function bindChatWidget(){
  const orb = document.getElementById('assistOrb');
  if(orb) orb.addEventListener('click', ()=>{ state.chat.open = !state.chat.open; render(); });
  const closeBtn = document.getElementById('closeChatBtn');
  if(closeBtn) closeBtn.addEventListener('click', ()=>{ state.chat.open=false; render(); });
  const sendBtn = document.getElementById('chatSendBtn');
  const input = document.getElementById('chatInput');
  if(!sendBtn) return;
  const send = async ()=>{
    const text = input.value.trim(); if(!text) return;
    state.chat.messages.push({role:'user', content:text});
    input.value='';
    const msgsEl = document.getElementById('chatMessages');
    msgsEl.innerHTML = state.chat.messages.map(chatBubble).join('') + `<div id="typingIndicator" style="font-size:11.5px;color:var(--ink-soft);">MuraAI is typing…</div>`;
    msgsEl.scrollTop = msgsEl.scrollHeight;
    try{
      const history = state.chat.messages.slice(0,-1).map(m=>({role:m.role, content:m.content}));
      const reply = await aiChat(text, history);
      state.chat.messages.push({role:'assistant', content:reply});
    }catch(e){
      state.chat.messages.push({role:'assistant', content:"Sorry, I couldn't reach the AI service just now. Please try again in a moment."});
    }
    msgsEl.innerHTML = state.chat.messages.map(chatBubble).join('');
    msgsEl.scrollTop = msgsEl.scrollHeight;
  };
  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') send(); });
}

/* ------------------------------- Profile View ------------------------------- */
function profileView(){
  const emp = currentUserEmployee();
  const mine = state.referrals.filter(r=>r.referredBy===state.user.employeeId);
  return `
  <div class="fade-up" style="max-width:680px;">
    <h1 class="display" style="font-size:24px;margin:0 0 18px;">My Profile</h1>
    <div class="glass" style="padding:24px;display:flex;gap:20px;align-items:center;margin-bottom:18px;">
      <div style="width:72px;height:72px;border-radius:50%;background:${emp?emp.color:'#60A5FA'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;">${initials(state.user.name)}</div>
      <div>
        <div style="font-size:18px;font-weight:700;">${state.user.name}</div>
        <div style="font-size:13px;color:var(--ink-soft);">${state.user.email}</div>
        <div class="chip" style="background:rgba(37,99,235,0.12);color:var(--primary);margin-top:6px;">${state.user.role==='admin'?'Admin':state.user.role==='hr'?'HR':'Employee'}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      ${statCard('Department', emp?.dept||'—', '🏢', GRADS[0])}
      ${statCard('Designation', emp?.designation||'—', '💼', GRADS[1])}
      ${statCard('My Referrals', mine.length, '📨', GRADS[2])}
      ${statCard('Selected/Hired', mine.filter(r=>r.status==='Joined'||r.status==='Offer').length, '✅', GRADS[3])}
    </div>
    <button class="btn btn-primary" data-nav="editProfile" style="margin-top:16px;">✏️ Edit Profile</button>
  </div>`;
}

/* ------------------------------- Edit Profile View ------------------------------- */
function editProfileView(){
  const emp = currentUserEmployee();
  return `
  <div class="fade-up" style="max-width:520px;">
    <h1 class="display" style="font-size:24px;margin:0 0 18px;">Edit Profile</h1>
    <div class="glass" style="padding:24px;">
      <div style="margin-bottom:14px;"><label class="field-label">Name</label><input class="input" id="editProfileName" value="${state.user.name}"/></div>
      <div style="margin-bottom:14px;"><label class="field-label">Department</label><input class="input" id="editProfileDept" value="${emp?.dept||''}"/></div>
      <div style="margin-bottom:14px;"><label class="field-label">Designation</label><input class="input" id="editProfileDesig" value="${emp?.designation||''}"/></div>
      <div style="margin-bottom:18px;"><label class="field-label">Email</label><input class="input" value="${state.user.email}" disabled style="opacity:0.6;"/></div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" id="saveProfileBtn">Save Changes</button>
        <button class="btn btn-ghost" data-nav="profile">Cancel</button>
      </div>
    </div>
  </div>`;
}

/* ------------------------------- Resume Analysis (HR) ------------------------------- */
function resumeAnalysisView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <div><h1 class="display" style="font-size:24px;margin:0 0 4px;">Resume Analysis</h1>
      <p style="color:var(--ink-soft);font-size:13px;margin:0;">AI-powered candidate screening and ranking</p></div>
    </div>
    <div class="glass" style="padding:18px;margin-bottom:18px;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end;">
        <div style="flex:1;min-width:200px;"><label class="field-label">Select Job</label>
          <select class="input" id="analysisJobSelect">
            <option value="">All Jobs</option>
            ${state.jobs.map(j=>`<option value="${j.id}">${j.title} (${j.dept})</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary" id="loadAnalysisBtn">🔍 Load Candidates</button>
      </div>
    </div>
    <div id="analysisResults"></div>
  </div>`;
}

/* ------------------------------- Interviews View ------------------------------- */
function interviewsView(){
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <div><h1 class="display" style="font-size:24px;margin:0 0 4px;">Interview Management</h1>
      <p style="color:var(--ink-soft);font-size:13px;margin:0;">Manage candidates, schedule interviews, and track hiring progress</p></div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="btn btn-outline report-tab active" data-ivtab="list">Candidate List</button>
      <button class="btn btn-outline report-tab" data-ivtab="calendar">Calendar</button>
      <button class="btn btn-outline report-tab" data-ivtab="timeline">Timeline</button>
    </div>
    <div id="interviewTabContent"></div>
    <div id="scheduleModal"></div>
  </div>`;
}
