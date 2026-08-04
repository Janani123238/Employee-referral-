function isAdminExperience(role){
  return ['admin','system_admin','ceo','cto','vp','chro'].includes(role);
}
function navItemsFor(role){
  if(role==='employee') return [
    ['dashboard','Dashboard'],['refer','Refer Candidate'],['match','AI Job Match'],
    ['jobs','Open Positions'],['tracking','My Referrals'],['leaderboard','Leaderboard'],
    ['rewards','Rewards'],['policy','Referral Policy'],
  ];
  if(role==='manager') return [
    ['dashboard','Dashboard'],['refer','Refer Candidate'],['match','AI Job Match'],
    ['jobs','Open Positions'],['tracking','My Referrals'],['teamInsights','Team Referral Insights'],
    ['leaderboard','Leaderboard'],['rewards','Rewards'],['policy','Referral Policy'],
  ];
  if(isAdminExperience(role)) return [
    ['dashboard','Dashboard'],['manageJobs','Job Management'],['allReferrals','Referral Management'],
    ['shortlist','AI Shortlisting'],['resumeAnalysis','Resume Analysis'],['bulkImport','Bulk Resume Import'],
    ['employees','Employee Management'],
    ['interviews','Interview Management'],['reports','Reports & Analytics'],
    ['adminSettings','System Config'],['aiSettings','AI Settings'],
    ['userManagement','User Management'],['emailTemplates','Email Templates'],['emailCenter','Email Center'],['auditLogs','Audit Logs'],['policy','Referral Policy'],
  ];
  return [
    ['dashboard','Dashboard'],['manageJobs','Job Management'],['allReferrals','Referral Management'],
    ['shortlist','AI Shortlisting'],['resumeAnalysis','Resume Analysis'],['bulkImport','Bulk Resume Import'],
    ['employees','Employees'],
    ['interviews','Interview Management'],['reports','Reports & Analytics'],['emailTemplates','Email Templates'],
    ['policy','Referral Policy'],
  ];
}
function shell(){
  const items = navItemsFor(state.role);
  const emp = currentUserEmployee();
  return `
  <div style="display:flex;min-height:100vh;">
    <aside class="app-sidebar" style="width:var(--sidebar-width);padding:16px 12px;position:sticky;top:0;height:100vh;background:var(--bg-sidebar);border-right:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:10px;padding:6px 8px 18px;">
        <div class="app-logo-mark" style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#0F2A5C,#0F766E);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;font-family:'Space Grotesk',sans-serif;">M</div>
        <div>
          <div style="font-weight:700;font-size:15px;color:var(--text-primary);line-height:1.1;">MuraAI <span style="color:var(--primary);">Refer</span></div>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${items.map(([id,label])=>`<div class="sidebar-link ${state.view===id?'active':''}" data-nav="${id}">${label}</div>`).join('')}
        ${state.role==='employee'?`<div class="sidebar-link" onclick="clearToken();state.user=null;state.role=null;render();" style="margin-top:8px;color:var(--info);cursor:pointer;">Browse Jobs (Landing Page)</div>`:''}
      </nav>
      <div class="sidebar-assist" style="margin-top:22px;padding:14px 14px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-elevated);">
        <div style="font-size:11.5px;font-weight:700;color:var(--text-secondary);margin-bottom:4px;">AI ASSISTANT</div>
        <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:10px;">Ask about jobs, bonus, or status</div>
        <button class="btn btn-primary" id="openChatSidebar" style="width:100%;padding:9px;font-size:12.5px;">Open Chat</button>
      </div>
    </aside>
    <div style="flex:1;min-width:0;">
      <div class="app-topbar" style="margin:16px 18px 0;padding:12px 20px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:space-between;position:sticky;top:16px;z-index:20;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:13px;color:var(--text-secondary);font-weight:600;">${state.role==='employee'||state.role==='manager'?'Employee Portal':isAdminExperience(state.role)?'Admin Portal':'HR Portal'}</div>
          <div class="chip" style="background:rgba(5,150,105,0.12);color:#059669;">Live</div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;">
          <div class="chip" style="background:var(--primary-light);color:var(--primary);cursor:pointer;" id="notifBtn">Notifications ${state.unreadCount>0?`<span style="background:var(--rose);color:#fff;border-radius:99px;padding:1px 7px;font-size:11px;">${state.unreadCount}</span>`:''}</div>
          <div style="position:relative;">
            <div style="display:flex;align-items:center;gap:8px;cursor:pointer;" id="userMenuBtn">
              <div style="width:34px;height:34px;border-radius:50%;background:${emp?emp.color:'#60A5FA'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;">${initials(state.user.name)}</div>
              <div style="font-size:13px;font-weight:600;">${state.user.name.split(' ')[0]}</div>
            </div>
            <div id="userMenuDropdown" class="glass-strong" style="display:none;position:absolute;right:0;top:44px;width:200px;padding:8px;z-index:30;">
              <div class="sidebar-link" data-nav="profile">Profile</div>
              <div class="sidebar-link" data-nav="editProfile">Edit Profile</div>
              <div style="height:1px;background:var(--border);margin:4px 0;"></div>
              <div class="sidebar-link" data-logout="1">Logout</div>
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
  const relevant = isHrRole(state.role) ? state.referrals : state.referrals.filter(r=>r.referredBy===state.user.employeeId);
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
  if(state.role==='employee' || state.role==='manager'){
    switch(state.view){
      case 'dashboard': return employeeDashboard();
      case 'refer': return referCandidateView();
      case 'match': return aiJobMatchView();
      case 'jobs': return openPositionsView();
      case 'tracking': return myReferralsView();
      case 'teamInsights': return teamInsightsView();
      case 'leaderboard': return leaderboardView();
      case 'rewards': return rewardsView();
      case 'policy': return policyView();
      case 'profile': return profileView();
      case 'editProfile': return editProfileView();
      default: return employeeDashboard();
    }
  } else {
    if(isAdminExperience(state.role)){
      switch(state.view){
        case 'dashboard': return hrDashboard();
        case 'manageJobs': return manageJobsView();
        case 'allReferrals': return allReferralsView();
        case 'shortlist': return aiShortlistView();
        case 'resumeAnalysis': return resumeAnalysisView();
        case 'bulkImport': return bulkImportView();
        case 'employees': return employeesView();
        case 'interviews': return interviewsView();
        case 'reports': return reportsView();
        case 'aiSettings': return aiSettingsView();
        case 'adminSettings': return adminSettingsView();
        case 'userManagement': return userManagementView();
        case 'emailTemplates': return emailTemplatesView();
        case 'emailCenter': return emailCenterView();
        case 'auditLogs': return auditLogsView();
        case 'policy': return policyView();
        case 'profile': return profileView();
        case 'editProfile': return editProfileView();
        default: return hrDashboard();
      }
    }
    switch(state.view){
      case 'dashboard': return hrDashboard();
      case 'manageJobs': return manageJobsView();
      case 'allReferrals': return allReferralsView();
      case 'shortlist': return aiShortlistView();
      case 'resumeAnalysis': return resumeAnalysisView();
      case 'bulkImport': return bulkImportView();
      case 'employees': return employeesView();
      case 'interviews': return interviewsView();
      case 'reports': return reportsView();
      case 'emailTemplates': return emailTemplatesView();
      case 'emailCenter': return emailCenterView();
      case 'policy': return policyView();
      case 'profile': return profileView();
      case 'editProfile': return editProfileView();
      default: return hrDashboard();
    }
  }
}
function teamInsightsView(){
  const team = state.referrals || [];
  const shortlisted = team.filter(r=>['Shortlisted','Interview Scheduled','Interview Completed','Selected','Offer','Offer Released','Joined'].includes(r.status)).length;
  const interviews = team.filter(r=>['Interview Scheduled','Interview Completed','Selected','Offer','Offer Released','Joined'].includes(r.status)).length;
  const hires = team.filter(r=>r.status==='Joined').length;
  const total = team.length;
  const rate = total ? Math.round(hires / total * 100) : 0;
  const byReferrer = {};
  team.forEach(r=>{ const name=(employeeById(r.referredBy)||{}).name || 'Team member'; byReferrer[name]=(byReferrer[name]||0)+1; });
  return `<div class="fade-up">
    <div style="margin-bottom:18px;"><h1 class="display" style="font-size:24px;margin:0 0 4px;">Team Referral Insights</h1><p style="color:var(--ink-soft);font-size:13px;margin:0;">Live referral performance for your department.</p></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:18px;">
      ${statCard('Team Referrals',total,'team',GRADS[0])}${statCard('Shortlisted',shortlisted,'shortlist',GRADS[1])}${statCard('Interviews',interviews,'interview',GRADS[2])}${statCard('Hiring Rate',rate+'%','conversion',GRADS[5])}
    </div>
    <div class="glass" style="padding:18px;"><h3 style="font-size:14px;margin:0 0 12px;">Referrals by team member</h3>
      ${Object.entries(byReferrer).sort((a,b)=>b[1]-a[1]).map(([name,count])=>`<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(226,232,240,.08);font-size:13px;"><span>${name}</span><strong class="mono">${count}</strong></div>`).join('') || '<div style="color:var(--ink-soft);font-size:13px;">No team referrals yet.</div>'}
    </div>
  </div>`;
}

function bindShell(){
  document.querySelectorAll('[data-nav]').forEach(el=> el.addEventListener('click', ()=> nav(el.dataset.nav)) );
  const userMenuBtn = document.getElementById('userMenuBtn');
  const dropdown = document.getElementById('userMenuDropdown');
  if(userMenuBtn) userMenuBtn.addEventListener('click', (e)=>{ e.stopPropagation(); dropdown.style.display = dropdown.style.display==='none'?'block':'none'; });
  document.addEventListener('click', ()=>{ if(dropdown) dropdown.style.display='none'; const nd=document.getElementById('notifDropdown'); if(nd) nd.style.display='none'; }, {once:true});
  const logout = document.querySelector('[data-logout]');
  if(logout) logout.addEventListener('click', ()=>{
    clearToken(); if(pollTimer){clearInterval(pollTimer); pollTimer=null;}
    state.user=null; state.role=null; state.jobs=[]; state.referrals=[]; state.employees=[];
    // End the Microsoft session too (redirects to Entra logout, then back home).
    window.location.href = '/api/auth/microsoft/logout';
  });
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

const ICONS = {
  referrals: '<path d="M12 2C9.243 2 7 4.243 7 7c0 2.757 2.243 5 5 5s5-2.243 5-5c0-2.757-2.243-5-5-5z"/><path d="M3 20c0-3.866 3.582-7 9-7s9 3.134 9 7"/>',
  team: '<path d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11z"/><path d="M6 11c1.657 0 3-1.567 3-3.5S7.657 4 6 4 3 5.567 3 7.5 4.343 11 6 11z"/><path d="M2 20c0-2.761 2.686-5 6-5s6 2.239 6 5"/>',
  interview: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/>',
  selected: '<path d="M20 6L9 17l-5-5"/>',
  rejected: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  bonus: '<path d="M12 1v22"/><path d="M5 5h14v6H5z"/>',
  jobs: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7v12"/>',
  offers: '<path d="M21 8V6a2 2 0 0 0-2-2h-4"/><rect x="3" y="8" width="14" height="12" rx="2"/>',
  joined: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  department: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10"/>',
  days: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  score: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5"/>',
  match: '<path d="M21 21l-6-6"/><circle cx="10" cy="10" r="7"/>',
  conversion: '<path d="M3 3v10h10"/><path d="M21 21V11H11"/>',
  active: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>',
  shortlist: '<path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M21 21l-4.5-4.5"/>',
};
function icon(name){
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.referrals}</svg>`;
}
function statCard(label, value, ic, grad){
  return `<div class="glass fade-up" style="padding:16px 18px;display:flex;align-items:center;gap:13px;">
    <div style="flex-shrink:0;width:38px;height:38px;border-radius:9px;background:var(--bg-card-hover);color:var(--navy);display:flex;align-items:center;justify-content:center;">${icon(ic)}</div>
    <div style="min-width:0;">
      <div class="mono" style="font-size:20px;font-weight:700;color:var(--text-primary);line-height:1.15;">${value}</div>
      <div style="font-size:11.5px;color:var(--text-secondary);margin-top:3px;line-height:1.3;">${label}</div>
    </div>
  </div>`;
}
const GRADS = ['linear-gradient(135deg,#2563EB,#60A5FA)','linear-gradient(135deg,#0891B2,#1D4ED8)','linear-gradient(135deg,#059669,#059669)',
  'linear-gradient(135deg,#DC2626,#E11D48)','linear-gradient(135deg,#D97706,#D97706)','linear-gradient(135deg,#60A5FA,#0891B2)',
  'linear-gradient(135deg,#1D4ED8,#2563EB)','linear-gradient(135deg,#0891B2,#059669)'];
