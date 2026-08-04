/* ------------------------------- AI Chat Assistant Widget ------------------------------- */
const CHAT_LANGS = [
  ['en-US','English (US)'],['en-IN','English (India)'],['hi-IN','हिन्दी (Hindi)'],
  ['ta-IN','தமிழ் (Tamil)'],['te-IN','తెలుగు (Telugu)'],['kn-IN','ಕನ್ನಡ (Kannada)'],
  ['ml-IN','മലയാളം (Malayalam)'],['mr-IN','मराठी (Marathi)'],['bn-IN','বাংলা (Bengali)'],
  ['gu-IN','ગુજરાતી (Gujarati)'],['pa-IN','ਪੰਜਾਬੀ (Punjabi)'],['de-DE','Deutsch'],['fr-FR','Français'],['es-ES','Español'],
];
const SUGGESTED_PROMPTS = [
  'How many referrals have I made?',
  'Which job suits me best?',
  'What is the referral bonus policy?',
  'How do I submit a referral?',
];
function chatWidget(){
  return `
  <button class="copilot-fab" id="copilotFab" title="${state.chat.open?'Close assistant':'Open AI assistant'}" aria-label="AI assistant">
    <span class="copilot-fab-ico">${icon(state.chat.open ? 'x' : 'sparkles', 22)}</span>
    <span class="copilot-fab-ping"></span>
  </button>
  ${state.chat.open ? chatPanel() : ''}
  `;
}
function chatPanel(){
  const micActive = state.chat.listening ? ' chat-mic-on' : '';
  const volIco = state.chat.tts ? icon('volumeOn',15) : icon('volumeOff',15);
  return `
  <div class="copilot-panel pop-in" id="chatPanel" role="dialog" aria-label="AI Assistant">
    <div class="copilot-head">
      <div class="chat-head-info">
        <div class="chat-title-row">
          <span class="chat-sparkle">${icon('sparkles',15)}</span>
          <span class="chat-title">MuraAI Copilot</span>
          <span class="chat-dot" title="Online"></span>
        </div>
        <div class="chat-sub">Live data · role-aware · streaming</div>
      </div>
      <button class="chat-close" id="closeChatBtn" title="Close (Esc)">${icon('x',16)}</button>
    </div>
    <div class="chat-messages" id="chatMessages">
      ${state.chat.messages.length===0 ? `<div class="chat-empty">
          <div class="chat-empty-ico">${icon('sparkles',26)}</div>
          <div class="chat-empty-t">Ask me anything about the platform</div>
          <div class="chat-empty-h">Live answers from your data — referrals, jobs, bonuses, policy and more.</div>
          <div class="copilot-suggests">
            ${SUGGESTED_PROMPTS.map(p=>`<button class="copilot-suggest" data-suggest="${p}">${p}</button>`).join('')}
          </div>
        </div>` :
        state.chat.messages.map(m=> chatBubble(m)).join('')}
    </div>
    <div class="chat-voice" id="voiceStatus" style="display:${state.chat.listening?'flex':'none'}">${icon('mic',14)}<span>Listening…</span><span class="mic-wave"><i></i><i></i><i></i><i></i><i></i></span></div>
    <div class="chat-input-row">
      <button class="chat-tool-btn${micActive}" id="chatMicBtn" title="Speak your question">${icon('mic',16)}</button>
      <input class="chat-input" id="chatInput" placeholder="Ask about jobs, bonus, policy…" autocomplete="off"/>
      <button class="chat-send" id="chatSendBtn" title="Send (Enter)">${icon('send',15)}</button>
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
    : `<div class="bubble-meta"><span class="bubble-ai-tag">${icon('sparkles',11)} MuraAI</span><span class="bubble-ts">${ts}</span></div>`;
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
  const fab = document.getElementById('copilotFab');
  if(fab) fab.addEventListener('click', ()=>{ stopChatListening(); state.chat.open = !state.chat.open; render(); });
  const closeBtn = document.getElementById('closeChatBtn');
  if(closeBtn) closeBtn.addEventListener('click', ()=>{ stopChatListening(); state.chat.open=false; render(); });
  const sendBtn = document.getElementById('chatSendBtn');
  const input = document.getElementById('chatInput');
  const micBtn = document.getElementById('chatMicBtn');
  const ttsBtn = document.getElementById('chatTtsBtn');
  const langSel = document.getElementById('chatLangSel');
  if(langSel) langSel.addEventListener('change', ()=>{ state.chat.lang = langSel.value; stopChatListening(); });
  if(ttsBtn) ttsBtn.addEventListener('click', ()=>{ state.chat.tts = !state.chat.tts; render(); });
  if(micBtn) micBtn.addEventListener('click', ()=>{ state.chat.listening ? stopChatListening() : startChatListening(); render(); });
  if(!sendBtn || !input) return;
  const send = async (text)=>{
    if(!text || !text.trim()) return;
    state.chat.messages.push({role:'user', content:text.trim(), ts:Date.now()});
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
    sb.innerHTML = `<div class="bubble-meta"><span class="bubble-ai-tag">${icon('sparkles',11)} MuraAI</span><span class="bubble-ts">${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div><div class="bubble-body"><span class="typing-dots"><i></i><i></i><i></i></span><span class="stream-text"></span><span class="stream-caret"></span></div>`;
    msgsEl.appendChild(sb);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    const streamText = sb.querySelector('.stream-text');
    const dots = sb.querySelector('.typing-dots');
    try{
      const history = state.chat.messages.slice(0,-1).map(m=>({role:m.role, content:m.content}));
      const full = await aiChatStream(text.trim(), history, (delta)=>{
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
  sendBtn.addEventListener('click', ()=> send(input.value));
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') send(input.value); });
  document.querySelectorAll('.copilot-suggest').forEach(chip=>{
    chip.addEventListener('click', ()=>{ send(chip.dataset.suggest); });
  });
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
const PROFILE_ICONS = { department:'department', jobs:'briefcase', id:'hash', mail:'mail', phone:'phone', location:'mapPin' };
function profileItem(label, value, key){
  return `
  <div class="detail-row">
    <div class="detail-icon">${icon(PROFILE_ICONS[key]||'info',15)}</div>
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
        <button class="btn btn-outline profile-edit-btn" data-nav="editProfile">${icon('pencil',14)} Edit Profile</button>
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
