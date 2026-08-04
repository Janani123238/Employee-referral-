/* ------------------------------- AI Chat Assistant Widget ------------------------------- */
const CHAT_LANGS = [
  ['en-US','English (US)'],['en-IN','English (India)'],['hi-IN','हिन्दी (Hindi)'],
  ['ta-IN','தமிழ் (Tamil)'],['te-IN','తెలుగు (Telugu)'],['kn-IN','ಕನ್ನಡ (Kannada)'],
  ['ml-IN','മലയാളം (Malayalam)'],['mr-IN','मराठी (Marathi)'],['bn-IN','বাংলা (Bengali)'],
  ['gu-IN','ગુજરાતી (Gujarati)'],['pa-IN','ਪੰਜਾਬੀ (Punjabi)'],['de-DE','Deutsch'],['fr-FR','Français'],['es-ES','Español'],
];
const ICON_MIC = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`;
const ICON_VOL_ON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
const ICON_VOL_OFF = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
const ICON_X = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_SEND = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
const ICON_SPARKLE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"/></svg>`;
const ICON_SPARKLE_SM = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"/></svg>`;
function chatWidget(){
  // Floating circular orb (compact) + panel when open
  return `
  <button class="assist-orb pulse" id="assistOrb" aria-label="Open AI assistant">${ICON_SPARKLE_SM}</button>
  ${state.chat.open && !state.chat.minimized ? chatPanel() : ''}
  `;
}
function chatPanel(){
  const micActive = state.chat.listening ? ' chat-mic-on' : '';
  const volIco = state.chat.tts ? ICON_VOL_ON : ICON_VOL_OFF;
  return `
  <div class="chat-panel pop-in" id="chatPanel">
    <div class="chat-head">
      <div class="chat-head-info">
        <div class="chat-title-row">
          <span class="chat-sparkle">${ICON_SPARKLE}</span>
          <span class="chat-title">MuraAI Assistant</span>
          <span class="chat-dot" title="Online"></span>
        </div>
        <div class="chat-sub">Live data · role-aware · streaming</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="chat-minimize" id="minimizeChatBtn" title="Minimize">—</button>
        <button class="chat-close" id="closeChatBtn" title="Close (Esc)">${ICON_X}</button>
      </div>
    </div>
    <div class="chat-messages" id="chatMessages">
      ${state.chat.messages.length===0 ? `<div class="chat-empty">
          <div class="chat-empty-ico">${ICON_SPARKLE}</div>
          <div class="chat-empty-t">Ask me anything about the platform</div>
          <div class="chat-empty-h">Try: “How many referrals have I made?” · “Which job suits me?” · “How much is the referral bonus?”</div>
        </div>` :
        state.chat.messages.map(m=> chatBubble(m)).join('')}
    </div>
    <div class="chat-voice" id="voiceStatus" style="display:${state.chat.listening?'flex':'none'}">${ICON_MIC}<span>Listening…</span><span class="mic-wave"><i></i><i></i><i></i><i></i><i></i></span></div>
    <div class="chat-input-row">
      <button class="chat-tool-btn${micActive}" id="chatMicBtn" title="Speak your question">${ICON_MIC}</button>
      <input class="chat-input" id="chatInput" placeholder="Ask about jobs, bonus, policy…" autocomplete="off"/>
      <button class="chat-send" id="chatSendBtn" title="Send (Enter)">${ICON_SEND}</button>
    </div>
    <div class="chat-tools">
      <select id="chatLangSel" class="chat-lang" title="Voice language">
        ${CHAT_LANGS.map(([code,name])=>`<option value="${code}" ${state.chat.lang===code?'selected':''}>${name}</option>`).join('')}
      </select>
      <button class="chat-tool-btn${state.chat.tts?' chat-vol-on':''}" id="chatTtsBtn" title="Read replies aloud">${volIco}</button>
    </div>
  </div>`;
}
function chatBubble(m){
  const mine = m.role==='user';
  const ts = m.ts ? new Date(m.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
  const meta = mine
    ? `<div class="bubble-meta"><span class="bubble-name">You</span><span class="bubble-ts">${ts}</span></div>`
    : `<div class="bubble-meta"><span class="bubble-ai-tag">${ICON_SPARKLE_SM} MuraAI</span><span class="bubble-ts">${ts}</span></div>`;
  return `<div class="chat-bubble ${mine?'chat-bubble-user':'chat-bubble-ai'}">
    ${meta}
    <div class="bubble-body">${m.content}</div>
  </div>`;
}
let _chatRecognition = null;
function chatSpeak(text){
  if(!state.chat.tts || !('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = state.chat.lang || 'en-US';
    u.rate = 1;
    speechSynthesis.speak(u);
  }catch(e){ /* TTS unsupported — ignore */ }
}
function bindChatWidget(){
  const orb = document.getElementById('assistOrb');
  if(orb) orb.addEventListener('click', ()=>{ state.chat.open = !state.chat.open; if(state.chat.open) state.chat.minimized = false; render(); });
  const closeBtn = document.getElementById('closeChatBtn');
  if(closeBtn) closeBtn.addEventListener('click', ()=>{ stopChatListening(); state.chat.open=false; state.chat.minimized=false; render(); });
  const minimizeBtn = document.getElementById('minimizeChatBtn');
  if(minimizeBtn) minimizeBtn.addEventListener('click', ()=>{ state.chat.minimized = true; render(); });
  const sendBtn = document.getElementById('chatSendBtn');
  const input = document.getElementById('chatInput');
  const micBtn = document.getElementById('chatMicBtn');
  const ttsBtn = document.getElementById('chatTtsBtn');
  const langSel = document.getElementById('chatLangSel');
  if(langSel) langSel.addEventListener('change', ()=>{ state.chat.lang = langSel.value; stopChatListening(); });
  if(ttsBtn) ttsBtn.addEventListener('click', ()=>{ state.chat.tts = !state.chat.tts; render(); });
  if(micBtn) micBtn.addEventListener('click', ()=>{ state.chat.listening ? stopChatListening() : startChatListening(); render(); });
  if(!sendBtn || !input) return;
  const send = async ()=>{
    const text = input.value.trim(); if(!text) return;
    state.chat.messages.push({role:'user', content:text, ts:Date.now()});
    input.value='';
    const msgsEl = document.getElementById('chatMessages');
    const paint = ()=>{
      if(!msgsEl) return;
      msgsEl.innerHTML = state.chat.messages.map(chatBubble).join('');
      msgsEl.scrollTop = msgsEl.scrollHeight;
    };
    paint();
    const sb = document.createElement('div');
    sb.className = 'chat-bubble chat-bubble-ai chat-bubble-stream';
    sb.innerHTML = `<div class="bubble-meta"><span class="bubble-ai-tag">${ICON_SPARKLE_SM} MuraAI</span><span class="bubble-ts">${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div><div class="bubble-body"><span class="typing-dots"><i></i><i></i><i></i></span><span class="stream-text"></span><span class="stream-caret"></span></div>`;
    msgsEl.appendChild(sb);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    const streamText = sb.querySelector('.stream-text');
    const dots = sb.querySelector('.typing-dots');
    try{
      const history = state.chat.messages.slice(0,-1).map(m=>({role:m.role, content:m.content}));
      const full = await aiChatStream(text, history, (delta)=>{
        if(dots) dots.remove();
        streamText.textContent = delta;
        msgsEl.scrollTop = msgsEl.scrollHeight;
      });
      state.chat.messages.push({role:'assistant', content:full, ts:Date.now()});
      chatSpeak(full);
    }catch(e){
      sb.remove();
      state.chat.messages.push({role:'assistant', content:"Sorry, I couldn't reach the AI service just now. Please try again in a moment.", ts:Date.now()});
    }
    paint();
  };
  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') send(); });
}
function startChatListening(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ toast('Voice input isn\'t supported in this browser — try Chrome or Edge.','amber'); return; }
  stopChatListening();
  const rec = new SR();
  rec.lang = state.chat.lang || 'en-US';
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e)=>{
    const transcript = (e.results[0][0].transcript||'').trim();
    stopChatListening();
    if(transcript){
      const input = document.getElementById('chatInput');
      if(input){ input.value = transcript; }
      document.getElementById('chatSendBtn')?.click();
    }
  };
  rec.onerror = (e)=>{
    stopChatListening();
    if(e.error !== 'aborted' && e.error !== 'no-speech') toast('Voice: '+e.error,'error');
  };
  rec.onend = ()=>{ stopChatListening(false); };
  _chatRecognition = rec;
  state.chat.listening = true;
  render();
  try{ rec.start(); }catch(e){ stopChatListening(); }
}
function stopChatListening(doRender=true){
  if(_chatRecognition){ try{ _chatRecognition.stop(); }catch(e){} _chatRecognition=null; }
  if(state.chat.listening){ state.chat.listening = false; if(doRender) render(); }
}

/* ------------------------------- Profile View ------------------------------- */
const PROFILE_ICONS = {
  department: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 7h18v10H3z"/></svg>`,
  jobs: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="12" rx="2"/></svg>`,
  id: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 13h16"/></svg>`,
  mail: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 7l9 6 9-6"/><rect x="3" y="5" width="18" height="14" rx="2"/></svg>`,
  phone: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/></svg>`,
  location: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2C8 2 5 5 5 9c0 7 7 13 7 13s7-6 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2"/></svg>`,
};
function profileItem(label, value, key){
  return `
  <div class="detail-row">
    <div class="detail-icon">${PROFILE_ICONS[key] || ''}</div>
    <div>
      <div class="detail-label">${label}</div>
      <div class="detail-value">${value}</div>
    </div>
  </div>`;
}
function profileView(){
  const emp = currentUserEmployee();
  const mine = state.referrals.filter(r=>r.referredBy===state.user.employeeId);
  const selected = mine.filter(r=>r.status==='Joined'||r.status==='Offer').length;
  return `
  <div class="fade-up" style="max-width:860px;margin:0 auto;">
    <h1 class="display" style="font-size:24px;margin:0 0 18px;">My Profile</h1>
    <div class="glass profile-card">
      <div class="profile-cover"></div>
      <div class="profile-head">
        <div class="profile-avatar">${initials(state.user.name)}</div>
        <div style="flex:1;min-width:0;">
          <div class="profile-name">${state.user.name}</div>
          <div class="profile-role">${emp?.designation||'—'}${emp?.dept?` · ${emp.dept}`:''}</div>
          <div class="profile-chips">
            <span class="chip" style="background:rgba(15,42,92,0.07);color:var(--navy);">${roleLabel(state.user.role)}</span>
            <span class="chip" style="background:var(--bg-card-hover);color:var(--text-secondary);font-family:'JetBrains Mono',monospace;">${state.user.employeeId||emp?.id||'—'}</span>
          </div>
        </div>
        <button class="btn btn-outline profile-edit-btn" data-nav="editProfile"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Edit Profile</button>
      </div>
    </div>
    <div class="glass" style="padding:6px 24px 12px;margin-bottom:18px;">
      <div class="detail-grid">
        ${profileItem('Department', emp?.dept||'—', 'department')}
        ${profileItem('Designation', emp?.designation||'—', 'jobs')}
        ${profileItem('Employee ID', state.user.employeeId||emp?.id||'—', 'id')}
        ${profileItem('Email', state.user.email, 'mail')}
        ${profileItem('Mobile', emp?.phone||'Not provided', 'phone')}
        ${profileItem('Location', emp?.location||'Not provided', 'location')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
      ${statCard('My Referrals', mine.length, 'referrals', GRADS[0])}
      ${statCard('Selected / Hired', selected, 'selected', GRADS[1])}
    </div>
  </div>`;
}

/* ------------------------------- Edit Profile View ------------------------------- */
function editProfileView(){
  const emp = currentUserEmployee();
  return `
  <div class="fade-up" style="max-width:720px;margin:0 auto;">
    <h1 class="display" style="font-size:24px;margin:0 0 4px;">Edit Profile</h1>
    <p style="font-size:13px;color:var(--text-secondary);margin:0 0 18px;">Update your personal and employment details.</p>
    <div class="glass" style="padding:24px;">
      <div class="form-section">
        <div class="form-section-title">Personal Information</div>
        <div class="form-grid">
          <div><label class="field-label">Full Name *</label><input class="input" id="editProfileName" value="${state.user.name}"/></div>
          <div><label class="field-label">Work Email</label><input class="input" value="${state.user.email}" disabled style="opacity:0.6;"/></div>
        </div>
      </div>
      <div class="form-section">
        <div class="form-section-title">Employment Details</div>
        <div class="form-grid">
          <div><label class="field-label">Department</label><input class="input" id="editProfileDept" value="${emp?.dept||''}"/></div>
          <div><label class="field-label">Designation</label><input class="input" id="editProfileDesig" value="${emp?.designation||''}"/></div>
        </div>
      </div>
      <div class="form-section">
        <div class="form-section-title">Contact</div>
        <div class="form-grid">
          <div><label class="field-label">Mobile</label><input class="input" id="editProfilePhone" value="${emp?.phone||''}" placeholder="+91 98765 43210"/></div>
          <div><label class="field-label">Location</label><input class="input" id="editProfileLocation" value="${emp?.location||''}" placeholder="City, Country"/></div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" data-nav="profile">Cancel</button>
        <button class="btn btn-primary" id="saveProfileBtn">Save Changes</button>
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
        <button class="btn btn-primary" id="loadAnalysisBtn">Load Candidates</button>
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
