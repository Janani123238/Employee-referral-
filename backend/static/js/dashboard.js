/* ------------------------------- Employee: Dashboard ------------------------------- */
function employeeDashboard(){
  const mine = state.referrals.filter(r=>r.referredBy===state.user.employeeId);
  const total = mine.length;
  const interview = mine.filter(r=>['Technical Round','Manager Round','HR Round'].includes(r.status)).length;
  const selected = mine.filter(r=>r.status==='Joined'||r.status==='Offer').length;
  const rejected = mine.filter(r=>r.status==='Rejected').length;
  const bonus = mine.filter(r=>r.status==='Joined').reduce((s,r)=> s + (jobById(r.jobId)?.bonus||0), 0);
  const ranked = [...state.employees].map(e=>({...e, count: state.referrals.filter(r=>r.referredBy===e.id).length})).sort((a,b)=>b.count-a.count);
  const myRankIdx = ranked.findIndex(e=>e.id===state.user.employeeId);
  const myRank = myRankIdx===-1 ? null : myRankIdx+1;
  const avgScore = mine.length ? Math.round(mine.reduce((s,r)=>s+(r.aiScore?.overall||0),0)/mine.length) : null;

  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:end;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 class="display" style="font-size:26px;margin:0 0 4px;">Welcome back, ${state.user.name.split(' ')[0]} 👋</h1>
        <div style="font-size:13.5px;color:var(--ink-soft);">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})} · ${state.jobs.length} open roles today</div>
      </div>
      <button class="btn btn-primary" data-nav="refer">➕ Refer a Candidate</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px;margin-bottom:22px;">
      ${statCard('Total Referrals', total, '📨', GRADS[0])}
      ${statCard('Interview Scheduled', interview, '🗓️', GRADS[1])}
      ${statCard('Selected / Offers', selected, '✅', GRADS[2])}
      ${statCard('Rejected', rejected, '❌', GRADS[3])}
      ${statCard('Referral Bonus', '₹'+bonus.toLocaleString('en-IN'), '💰', GRADS[4])}
      ${statCard('Leaderboard Rank', myRank===null?'—':'#'+myRank, '🏆', GRADS[5])}
      ${statCard('AI Score', avgScore===null?'—':avgScore, '🎯', GRADS[6])}
      ${statCard("Today's Open Jobs", state.jobs.length, '💼', GRADS[7])}
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px;">
      <div class="glass" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14.5px;">Monthly Referrals</h3><canvas id="chartMonthly" height="170"></canvas></div>
      <div class="glass" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14.5px;">Hiring Ratio</h3><canvas id="chartRatio" height="170"></canvas></div>
      <div class="glass" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14.5px;">Bonus Earned (₹ thousands)</h3><canvas id="chartBonus" height="170"></canvas></div>
      <div class="glass" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14.5px;">Department-wise Referrals</h3><canvas id="chartDept" height="170"></canvas></div>
    </div>
  </div>`;
}

function chartColors(){ return ['#2563EB','#0891B2','#DC2626','#059669','#D97706','#7C3AED']; }
// Builds the last N month labels/keys ending this month, e.g. ['Feb','Mar',...,'Jul']
function lastMonths(n){
  const out = [];
  const now = new Date();
  for(let i=n-1;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US',{month:'short'}) });
  }
  return out;
}
function monthlyCounts(referrals, months, dateField, filterFn){
  const buckets = Object.fromEntries(months.map(m=>[m.key,0]));
  referrals.forEach(r=>{
    if(filterFn && !filterFn(r)) return;
    const d = new Date(r[dateField]);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if(key in buckets) buckets[key]++;
  });
  return months.map(m=>buckets[m.key]);
}
function drawCharts(){
  if(!window.Chart) return;
  const months = lastMonths(6);
  const monthLabels = months.map(m=>m.label);

  const monthsEl = document.getElementById('chartMonthly');
  if(monthsEl){
    const mine = state.referrals.filter(r=>r.referredBy===state.user.employeeId);
    new Chart(monthsEl, {type:'line', data:{labels:monthLabels,
      datasets:[{label:'Referrals',data:monthlyCounts(mine, months, 'submittedDate'),borderColor:'#2563EB',backgroundColor:'rgba(37,99,235,0.08)',tension:0.4,fill:true,pointBackgroundColor:'#2563EB'}]},
      options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0},grid:{color:'#F1F5F9'}},x:{grid:{display:false}}}}});
  }
  const ratioEl = document.getElementById('chartRatio');
  if(ratioEl){
    const mine = state.referrals.filter(r=>r.referredBy===state.user.employeeId);
    const counts = {Selected: mine.filter(r=>r.status==='Joined'||r.status==='Offer').length,
      'In Process': mine.filter(r=>!['Joined','Offer','Rejected'].includes(r.status)).length,
      Rejected: mine.filter(r=>r.status==='Rejected').length};
    const hasData = Object.values(counts).some(v=>v>0);
    new Chart(ratioEl,{type:'doughnut',data:{labels:Object.keys(counts),datasets:[{data: hasData ? Object.values(counts) : [1,0,0],backgroundColor:['#059669','#7C3AED','#DC2626'],borderWidth:0}]},
      options:{plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:11}}}},cutout:'65%'}});
  }
  const bonusEl = document.getElementById('chartBonus');
  if(bonusEl){
    const mine = state.referrals.filter(r=>r.referredBy===state.user.employeeId && r.status==='Joined');
    const buckets = Object.fromEntries(months.map(m=>[m.key,0]));
    mine.forEach(r=>{
      const d = new Date(r.submittedDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if(key in buckets) buckets[key] += (jobById(r.jobId)?.bonus || 0) / 1000;
    });
    new Chart(bonusEl,{type:'bar',data:{labels:monthLabels,datasets:[{label:'Bonus (₹k)',data:months.map(m=>buckets[m.key]),backgroundColor:'#0891B2',borderRadius:6}]},
      options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'#F1F5F9'}},x:{grid:{display:false}}}}});
  }
  const deptEl = document.getElementById('chartDept');
  if(deptEl){
    const depts = {};
    state.referrals.forEach(r=>{ const emp = employeeById(r.referredBy); if(!emp) return; depts[emp.dept]=(depts[emp.dept]||0)+1; });
    const labels = Object.keys(depts); const values = Object.values(depts);
    new Chart(deptEl,{type:'bar',data:{labels: labels.length?labels:['No data yet'],datasets:[{label:'Referrals',data: values.length?values:[0],backgroundColor:chartColors(),borderRadius:6}]},
      options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{precision:0},grid:{color:'#F1F5F9'}},y:{grid:{display:false}}}}});
  }
  // HR-only charts
  const funnelEl = document.getElementById('chartFunnel');
  if(funnelEl){
    const stages = PIPELINE_STAGES;
    new Chart(funnelEl,{type:'bar',data:{labels:stages,datasets:[{label:'Candidates',data:stages.map(s=>state.referrals.filter(r=>r.status===s).length),backgroundColor:stages.map(s=>statusColor(s)),borderRadius:6}]},
      options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0},grid:{color:'#F1F5F9'}},x:{grid:{display:false},ticks:{font:{size:10}}}}}});
  }
  const sourceEl = document.getElementById('chartSource');
  if(sourceEl){
    const rel = {};
    state.referrals.forEach(r=>{ const k = r.relationship || 'Unspecified'; rel[k] = (rel[k]||0)+1; });
    const labels = Object.keys(rel); const values = Object.values(rel);
    new Chart(sourceEl,{type:'pie',data:{labels: labels.length?labels:['No referrals yet'],datasets:[{data: values.length?values:[1],backgroundColor:['#2563EB','#0891B2','#DC2626','#D97706','#059669','#7C3AED'],borderWidth:0}]},
      options:{plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:11}}}}}});
  }
  const joinEl = document.getElementById('chartJoining');
  if(joinEl){
    const joined = state.referrals.filter(r=>r.status==='Joined');
    new Chart(joinEl,{type:'line',data:{labels:monthLabels,datasets:[{label:'Joined',data:monthlyCounts(joined, months, 'submittedDate'),borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.15)',fill:true,tension:0.4}]},
      options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0},grid:{color:'#F1F5F9'}},x:{grid:{display:false}}}}});
  }
  const deptHrEl = document.getElementById('chartDeptHr');
  if(deptHrEl){
    const depts = {};
    state.referrals.forEach(r=>{ const j = jobById(r.jobId); if(!j) return; depts[j.dept]=(depts[j.dept]||0)+1; });
    const labels = Object.keys(depts); const values = Object.values(depts);
    new Chart(deptHrEl,{type:'doughnut',data:{labels: labels.length?labels:['No data yet'],datasets:[{data: values.length?values:[1],backgroundColor:chartColors(),borderWidth:0}]},
      options:{plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:11}}}},cutout:'60%'}});
  }
}

/* ------------------------------- HR: Dashboard ------------------------------- */
function hrDashboard(){
  const total = state.referrals.length;
  const openRoles = state.jobs.length;
  const interviews = state.referrals.filter(r=>['Technical Round','Manager Round','HR Round'].includes(r.status)).length;
  const offers = state.referrals.filter(r=>r.status==='Offer').length;
  const joined = state.referrals.filter(r=>r.status==='Joined').length;
  const bonusPaid = state.referrals.filter(r=>r.status==='Joined').reduce((s,r)=>s+(jobById(r.jobId)?.bonus||0),0);
  const topDept = (()=>{ const d={}; state.referrals.forEach(r=>{const j=jobById(r.jobId); if(j) d[j.dept]=(d[j.dept]||0)+1;}); return Object.entries(d).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'; })();
  const joinedRefs = state.referrals.filter(r=>r.status==='Joined');
  const avgPipelineDays = joinedRefs.length
    ? Math.round(joinedRefs.reduce((s,r)=> s + Math.max(0,(Date.now()-new Date(r.submittedDate).getTime())/86400000), 0) / joinedRefs.length)
    : null;
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:end;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div><h1 class="display" style="font-size:26px;margin:0 0 4px;">HR Dashboard</h1><div style="font-size:13.5px;color:var(--ink-soft);">Org-wide referral performance, live.</div></div>
      <button class="btn btn-primary" data-nav="manageJobs">➕ Post a Job</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px;margin-bottom:22px;">
      ${statCard('Total Referrals', total, '📨', GRADS[0])}
      ${statCard('Open Positions', openRoles, '💼', GRADS[1])}
      ${statCard('In Interviews', interviews, '🗓️', GRADS[2])}
      ${statCard('Offers Extended', offers, '📝', GRADS[3])}
      ${statCard('Joined', joined, '✅', GRADS[4])}
      ${statCard('Bonus Paid', '₹'+bonusPaid.toLocaleString('en-IN'), '💰', GRADS[5])}
      ${statCard('Top Department', topDept, '🏢', GRADS[6])}
      ${statCard('Days Since Referral (Joined, avg)', avgPipelineDays===null?'—':avgPipelineDays+'d', '⏱️', GRADS[7])}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px;">
      <div class="glass" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14.5px;">Hiring Pipeline Funnel</h3><canvas id="chartFunnel" height="180"></canvas></div>
      <div class="glass" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14.5px;">Referral Source</h3><canvas id="chartSource" height="180"></canvas></div>
      <div class="glass" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14.5px;">Monthly Joining Trend</h3><canvas id="chartJoining" height="180"></canvas></div>
      <div class="glass" style="padding:20px;"><h3 style="margin:0 0 12px;font-size:14.5px;">Department-wise Referrals</h3><canvas id="chartDeptHr" height="180"></canvas></div>
    </div>
  </div>`;
}
