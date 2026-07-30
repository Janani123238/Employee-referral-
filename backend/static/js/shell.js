const EMPLOYEE_ROLES = ['employee', 'manager'];
const ADMIN_ROLES = ['hr', 'hr_manager', 'vp', 'cto', 'ceo', 'system_admin'];

function isAdmin(role){ return ADMIN_ROLES.includes(role); }
function isEmployee(role){ return EMPLOYEE_ROLES.includes(role); }

function portalLabel(role){
  if(isEmployee(role)) return 'Employee Portal';
  return 'Admin Portal';
}

function navItemsFor(role){
  if(isEmployee(role)) return [
    ['dashboard','📊','Dashboard'],['refer','➕','Refer Candidate'],['match','🎯','AI Job Match'],
    ['jobs','💼','Open Positions'],['tracking','🛤️','My Referrals'],['leaderboard','🏆','Leaderboard'],
    ['rewards','🎁','Rewards'],['policy','📋','Referral Policy'],
  ];
  if(role==='system_admin') return [
    ['dashboard','📊','Dashboard'],['manageJobs','💼','Job Management'],['allReferrals','📋','All Referrals'],
    ['resumeAnalysis','🔍','Resume Analysis'],['employees','👥','Employees'],
    ['interviews','🗓️','Interview Management'],['reports','📈','Reports & Analytics'],['emailCenter','✉️','Email Center'],
    ['adminSettings','🔧','System Config'],['aiSettings','🤖','AI Settings'],
    ['userManagement','👤','User Management'],['auditLogs','📋','Audit Logs'],['policy','📋','Referral Policy'],
  ];
  return [
    ['dashboard','📊','Dashboard'],['manageJobs','💼','Job Management'],['allReferrals','📋','All Referrals'],
    ['resumeAnalysis','🔍','Resume Analysis'],['employees','👥','Employees'],
    ['interviews','🗓️','Interview Management'],['reports','📈','Reports & Analytics'],['emailCenter','✉️','Email Center'],
    ['policy','📋','Referral Policy'],
  ];
}
function shell(){
  const items = navItemsFor(state.role);
  const emp = currentUserEmployee();
  return `
  <div style="display:flex;min-height:100vh;">
    <div class="sidebar-desktop" style="width:246px;padding:22px 16px;position:sticky;top:0;height:100vh;">
      <div style="display:flex;align-items:center;gap:10px;padding:6px 10px 26px;">
        <div style="width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#2563EB,#0891B2);display:flex;align-items:center;justify-content:center;font-size:18px;">✨</div>
        <div class="display" style="font-weight:700;font-size:16px;">Mura<span class="grad-text">AI</span> Refer</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${items.map(([id,icon,label])=>`<div class="sidebar-link ${state.view===id?'active':''}" data-nav="${id}"><span>${icon}</span><span>${label}</span></div>`).join('')}
        ${state.role==='employee'?`<div class="sidebar-link" onclick="clearToken();state.user=null;state.role=null;render();" style="margin-top:8px;color:var(--info);cursor:pointer;"><span>🌐</span><span>Browse Jobs (Landing Page)</span></div>`:''}
      </div>
      <div class="glass" style="margin-top:26px;padding:16px;text-align:center;">
        <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:6px;">AI Assistant</div>
        <div style="font-size:12.5px;font-weight:600;margin-bottom:10px;">Ask about jobs, bonus, or status</div>
        <button class="btn btn-cyan" id="openChatSidebar" style="width:100%;padding:9px;font-size:12.5px;">Open Chat</button>
      </div>
    </div>
    <div style="flex:1;min-width:0;">
      <div class="glass" style="margin:16px 18px 0;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:16px;z-index:20;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:13px;color:var(--ink-soft);">${portalLabel(state.role)}</div>
          <div class="chip" style="background:rgba(5,150,105,0.12);color:#059669;">● Live</div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;">
          <div class="chip" style="background:rgba(37,99,235,0.15);color:var(--primary);cursor:pointer;" id="notifBtn">🔔 ${state.unreadCount>0?`<span style="background:var(--rose);color:#fff;border-radius:99px;padding:1px 7px;font-size:11px;">${state.unreadCount}</span>`:''} Notifications</div>
          <div style="position:relative;">
            <div style="display:flex;align-items:center;gap:8px;cursor:pointer;" id="userMenuBtn">
              <div style="width:34px;height:34px;border-radius:50%;background:${emp?emp.color:'#60A5FA'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;">${initials(state.user.name)}</div>
              <div style="font-size:13px;font-weight:600;">${state.user.name.split(' ')[0]} ▾</div>
            </div>
            <div id="userMenuDropdown" class="glass-strong" style="display:none;position:absolute;right:0;top:44px;width:200px;padding:8px;z-index:30;">
              <div class="sidebar-link" data-nav="profile">👤 Profile</div>
              <div class="sidebar-link" data-nav="editProfile">✏️ Edit Profile</div>
              <div style="height:1px;background:rgba(226,232,240,0.1);margin:4px 0;"></div>
              <div class="sidebar-link" data-logout="1">🚪 Logout</div>
            </div>
          </div>
        </div>
      </div>
      <div id="notifDropdown" class="glass-strong" style="display:none;position:fixed;top:70px;right:26px;width:340px;padding:10px;z-index:40;max-height:400px;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px 10px;border-bottom:1px solid rgba(226,232,240,0.1);">
          <div style="font-weight:700;font-size:13.5px;">Notifications</div>
          ${state.unreadCount>0?`<button class="btn btn-ghost" id="markAllReadBtn" style="font-size:11.5px;padding:4px 10px;">Mark all read</button>`:''}
        </div>
        ${state.notifications.length===0?`<div style="padding:20px;font-size:12.5px;color:var(--ink-soft);text-align:center;">No notifications yet.</div>`:
        state.notifications.slice(0,12).map(n=>`
          <div style="display:flex;gap:10px;padding:10px;border-radius:12px;${n.isRead?'':'background:rgba(37,99,235,0.08);'}cursor:pointer;" data-notif-id="${n.id}" data-notif-link="${n.link||''}">
            <div style="font-size:16px;">${n.type==='success'?'✅':n.type==='error'?'❌':n.type==='warning'?'⚠️':'🔔'}</div>
            <div style="flex:1;"><div style="font-size:12.5px;font-weight:${n.isRead?'400':'700'};">${n.title}</div><div style="font-size:11.5px;color:var(--ink-soft);margin-top:2px;">${n.message}</div><div style="font-size:10.5px;color:var(--ink-soft);margin-top:3px;">${fmtRelative(n.created_at)}</div></div>
          </div>
        `).join('')}
      </div>
      <div style="padding:22px 18px 100px;">
        ${viewBody()}
      </div>
    </div>
  </div>
  ${chatWidget()}
  `;
}
function notifItem(icon,title,sub){
  return `<div style="display:flex;gap:10px;padding:10px;border-radius:12px;" onmouseover="this.style.background='rgba(37,99,235,0.08)'" onmouseout="this.style.background='transparent'">
    <div style="font-size:18px;">${icon}</div>
    <div><div style="font-size:12.5px;font-weight:700;">${title}</div><div style="font-size:11.5px;color:var(--ink-soft);">${sub}</div></div>
  </div>`;
}
function recentActivityHTML(){
  const relevant = state.role==='hr' ? state.referrals : state.referrals.filter(r=>r.referredBy===state.user.employeeId);
  const recent = [...relevant].sort((a,b)=> new Date(b.submittedDate)-new Date(a.submittedDate)).slice(0,6);
  if(recent.length===0){
    return `<div style="padding:16px;font-size:12.5px;color:var(--ink-soft);text-align:center;">No activity yet.</div>`;
  }
  const icons = {Submitted:'📨','HR Review':'🔎','Technical Round':'🗓️','Manager Round':'🗓️','HR Round':'🗓️',Offer:'🎉',Joined:'✅',Rejected:'❌'};
  return recent.map(r=>{
    const job = jobById(r.jobId);
    return notifItem(icons[r.status]||'📌', `${r.candidateName} — ${r.status}`, `${job?job.title:'—'} · ${fmtRelative(r.submittedDate)}`);
  }).join('');
}
function viewBody(){
  if(isEmployee(state.role)){
    switch(state.view){
      case 'dashboard': return employeeDashboard();
      case 'refer': return referCandidateView();
      case 'match': return aiJobMatchView();
      case 'jobs': return openPositionsView();
      case 'tracking': return myReferralsView();
      case 'leaderboard': return leaderboardView();
      case 'rewards': return rewardsView();
      case 'policy': return policyView();
      case 'profile': return profileView();
      case 'editProfile': return editProfileView();
      default: return employeeDashboard();
    }
  }
  const adminView = state.view;
  switch(adminView){
    case 'dashboard': return hrDashboard();
    case 'manageJobs': return manageJobsView();
    case 'allReferrals': return allReferralsView();
    case 'resumeAnalysis': return resumeAnalysisView();
    case 'employees': return employeesView();
    case 'interviews': return interviewsView();
    case 'reports': return reportsView();
    case 'emailCenter': return emailCenterView();
    case 'policy': return policyView();
    case 'profile': return profileView();
    case 'editProfile': return editProfileView();
    case 'aiSettings': return aiSettingsView();
    case 'adminSettings': return adminSettingsView();
    case 'userManagement': return userManagementView();
    case 'auditLogs': return auditLogsView();
    default: return hrDashboard();
  }
}
function bindShell(){
  document.querySelectorAll('[data-nav]').forEach(el=> el.addEventListener('click', ()=> nav(el.dataset.nav)) );
  const userMenuBtn = document.getElementById('userMenuBtn');
  const dropdown = document.getElementById('userMenuDropdown');
  if(userMenuBtn) userMenuBtn.addEventListener('click', (e)=>{ e.stopPropagation(); dropdown.style.display = dropdown.style.display==='none'?'block':'none'; });
  document.addEventListener('click', ()=>{ if(dropdown) dropdown.style.display='none'; const nd=document.getElementById('notifDropdown'); if(nd) nd.style.display='none'; }, {once:true});
  const logout = document.querySelector('[data-logout]');
  if(logout) logout.addEventListener('click', ()=>{ clearToken(); if(pollTimer){clearInterval(pollTimer); pollTimer=null;} state.user=null; state.role=null; state.jobs=[]; state.referrals=[]; state.employees=[]; render(); });
  const notifBtn = document.getElementById('notifBtn');
  if(notifBtn) notifBtn.addEventListener('click', (e)=>{ e.stopPropagation(); const nd=document.getElementById('notifDropdown'); nd.style.display = nd.style.display==='none'?'block':'none'; });
  document.querySelectorAll('[data-notif-id]').forEach(el=>{
    el.addEventListener('click', async ()=>{
      const id = el.dataset.notifId;
      const link = el.dataset.notifLink;
      if(!el.style.background) {
        try{ await api('/api/notifications/mark-read', {method:'POST', body:{ids:[id]}}); }catch(e){}
        state.notifications = state.notifications.map(n=>n.id===id?{...n,isRead:true}:n);
        state.unreadCount = state.notifications.filter(n=>!n.isRead).length;
      }
      if(link){ nav(link.replace('/','')); }
      render();
    });
  });
  const markAllBtn = document.getElementById('markAllReadBtn');
  if(markAllBtn) markAllBtn.addEventListener('click', async ()=>{
    const unreadIds = state.notifications.filter(n=>!n.isRead).map(n=>n.id);
    if(unreadIds.length){
      try{ await api('/api/notifications/mark-read', {method:'POST', body:{ids:unreadIds}}); }catch(e){}
      state.notifications = state.notifications.map(n=>({...n,isRead:true}));
      state.unreadCount = 0;
      render();
    }
  });
  const openChatSidebar = document.getElementById('openChatSidebar');
  if(openChatSidebar) openChatSidebar.addEventListener('click', ()=>{ state.chat.open=true; render(); });
  attachTilt(document.getElementById('app'));
  bindViewSpecific();
  bindChatWidget();
}

function statCard(label, value, icon, grad){
  return `<div class="glass tilt-card fade-up" style="padding:20px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <div style="width:40px;height:40px;border-radius:12px;background:${grad};display:flex;align-items:center;justify-content:center;font-size:18px;">${icon}</div>
    </div>
    <div class="mono" style="font-size:24px;font-weight:700;">${value}</div>
    <div style="font-size:12.5px;color:var(--ink-soft);margin-top:2px;">${label}</div>
  </div>`;
}
const GRADS = ['linear-gradient(135deg,#2563EB,#60A5FA)','linear-gradient(135deg,#0891B2,#1D4ED8)','linear-gradient(135deg,#059669,#059669)',
  'linear-gradient(135deg,#DC2626,#E11D48)','linear-gradient(135deg,#D97706,#D97706)','linear-gradient(135deg,#60A5FA,#0891B2)',
  'linear-gradient(135deg,#1D4ED8,#2563EB)','linear-gradient(135deg,#0891B2,#059669)'];
