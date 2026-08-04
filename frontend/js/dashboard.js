/* ------------------------------- Employee: Dashboard ------------------------------- */
function employeeDashboard(){
  const mine = state.referrals.filter(r=>r.referredBy===state.user.employeeId);
  const total = mine.length;
  const interview = mine.filter(r=>['Technical Round','Manager Round','HR Round'].includes(r.status)).length;
  const selected = mine.filter(r=>r.status==='Joined'||r.status==='Offer').length;
  const rejected = mine.filter(r=>r.status==='Rejected').length;
  const bonus = mine.filter(r=>r.status==='Joined').reduce((s,r)=> s + (jobById(r.jobId)?.bonus||0), 0);

  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:end;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div>
        <h1 class="display" style="font-size:26px;margin:0 0 4px;">Welcome back, ${state.user.name.split(' ')[0]}</h1>
        <div style="font-size:13.5px;color:var(--text-secondary);">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
      </div>
      <button class="btn btn-primary" data-nav="refer">Refer a Candidate</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;">
      ${statCard('Total Referrals', total, 'referrals', GRADS[0])}
      ${statCard('Interview Scheduled', interview, 'interview', GRADS[1])}
      ${statCard('Selected / Offers', selected, 'selected', GRADS[2])}
      ${statCard('Rejected', rejected, 'rejected', GRADS[3])}
      ${statCard('Referral Bonus', '₹'+bonus.toLocaleString('en-IN'), 'bonus', GRADS[4])}
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
function chartCard(title, canvasId){
  return `
  <div class="glass chart-card" style="padding:18px 20px 14px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3 style="margin:0;font-size:13.5px;font-weight:700;">${title}</h3>
      <span class="chart-legend-dot" style="display:none;"></span>
    </div>
    <div class="chart-wrap">
      <div class="chart-load"><span class="chart-spinner"></span></div>
      <canvas id="${canvasId}" height="190"></canvas>
    </div>
  </div>`;
}

function drawCharts(){
  if(!window.Chart) return;
  const months = lastMonths(6);
  const monthLabels = months.map(m=>m.label);
  const gridColor = '#EEF2F7';
  const tooltip = {
    backgroundColor:'#0F172A', titleColor:'#F8FAFC', bodyColor:'#E2E8F0',
    padding:10, cornerRadius:8, boxPadding:6, titleFont:{size:12, weight:'700'}, bodyFont:{size:11.5}
  };

  const make = (canvasId, config)=>{
    const el = document.getElementById(canvasId);
    if(!el) return;
    const box = el.closest('.chart-card');
    new Chart(el, config);
    if(box){ const ld = box.querySelector('.chart-load'); if(ld) ld.remove(); }
  };

  const chartFunnel = document.getElementById('chartFunnel');
  if(chartFunnel){
    const stages = PIPELINE_STAGES;
    const counts = stages.map(s=>state.referrals.filter(r=>r.status===s).length);
    const max = Math.max(...counts, 1);
    make('chartFunnel', {
      type:'bar',
      data:{labels:stages, datasets:[
        {label:'_spacer', data:counts.map(c=>(max-c)/2), backgroundColor:'transparent', barPercentage:1, categoryPercentage:0.8, hoverBackgroundColor:'transparent'},
        {label:'Candidates', data:counts, borderRadius:8, borderSkipped:false, barPercentage:1, categoryPercentage:0.8,
          backgroundColor: stages.map((s,i)=>`rgba(${i===0?'37,99,235':i===1?'8,145,178':i===2?'220,38,38':i===3?'5,150,105':i===4?'217,119,6':'124,58,237'},${(1 - i*0.16).toFixed(2)})`)}
      ]},
      options:{
        indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}, tooltip:{...tooltip, callbacks:{
          label:(c)=>{ if(c.datasetIndex===0) return null; return ` ${c.raw} candidate${c.raw===1?'':'s'} (${Math.round(c.raw/max*100)}% of top stage)`; }
        }}},
        scales:{ x:{stacked:true, beginAtZero:true, max, grid:{color:gridColor}, ticks:{precision:0, color:'#64748B', font:{size:10}}},
                 y:{stacked:true, grid:{display:false}, ticks:{color:'#334155', font:{size:11}, fontStyle:'bold'}} },
        animation:{duration:900, easing:'easeOutQuart'}
      }
    });
  }

  const chartSource = document.getElementById('chartSource');
  if(chartSource){
    const rel = {};
    state.referrals.forEach(r=>{ const k = r.relationship || 'Unspecified'; rel[k] = (rel[k]||0)+1; });
    const labels = Object.keys(rel); const values = Object.values(rel);
    const total = values.reduce((a,b)=>a+b,0);
    const colors = ['#2563EB','#0891B2','#DC2626','#D97706','#059669','#7C3AED'];
    make('chartSource', {
      type:'doughnut',
      data:{labels: labels.length?labels:['No referrals yet'], datasets:[{data: values.length?values:[1], backgroundColor:colors, borderColor:'#fff', borderWidth:2, hoverOffset:6}]},
      options:{
        responsive:true, maintainAspectRatio:false, cutout:'62%',
        plugins:{legend:{position:'bottom', labels:{boxWidth:10, boxHeight:10, usePointStyle:true, pointStyle:'circle', font:{size:11}, color:'#475569'}},
          tooltip:{...tooltip, callbacks:{label:(c)=>` ${c.label}: ${c.raw} (${Math.round(c.raw/total*100)}%)`}}},
        animation:{animateRotate:true, duration:900, easing:'easeOutQuart'}
      }
    });
  }

  const chartJoining = document.getElementById('chartJoining');
  if(chartJoining){
    const joined = state.referrals.filter(r=>r.status==='Joined');
    make('chartJoining', {
      type:'line',
      data:{labels:monthLabels, datasets:[{label:'Joined', data:monthlyCounts(joined, months, 'submittedDate'),
        borderColor:'#10B981', borderWidth:2.5, pointBackgroundColor:'#fff', pointBorderColor:'#10B981', pointBorderWidth:2, pointRadius:4, pointHoverRadius:6,
        tension:0.45, fill:true,
        backgroundColor:(ctx)=>{ const {chart} = ctx; const {ctx:c, chartArea} = chart; if(!chartArea) return 'rgba(16,185,129,0.15)';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0,'rgba(16,185,129,0.32)'); g.addColorStop(1,'rgba(16,185,129,0.02)'); return g; }}]},
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}, tooltip:{...tooltip}},
        scales:{y:{beginAtZero:true, grid:{color:gridColor}, ticks:{precision:0, color:'#64748B', font:{size:10}}}, x:{grid:{display:false}, ticks:{color:'#64748B', font:{size:10}}}},
        animation:{duration:900, easing:'easeOutQuart'}
      }
    });
  }

  const chartDeptHr = document.getElementById('chartDeptHr');
  if(chartDeptHr){
    const depts = {};
    state.referrals.forEach(r=>{ const j = jobById(r.jobId); if(!j) return; depts[j.dept]=(depts[j.dept]||0)+1; });
    const labels = Object.keys(depts); const values = Object.values(depts);
    const colors = chartColors();
    make('chartDeptHr', {
      type:'bar',
      data:{labels: labels.length?labels:['No data yet'], datasets:[{label:'Referrals', data: values.length?values:[0],
        backgroundColor: labels.map((_,i)=>colors[i%colors.length]), borderRadius:6, borderSkipped:false}]},
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}, tooltip:{...tooltip}},
        scales:{y:{beginAtZero:true, grid:{color:gridColor}, ticks:{precision:0, color:'#64748B', font:{size:10}}}, x:{grid:{display:false}, ticks:{color:'#334155', font:{size:10}, maxRotation:0}}},
        animation:{duration:900, easing:'easeOutQuart'}
      }
    });
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
  const joinedRefs = state.referrals.filter(r=>r.status==='Joined');
  const avgPipelineDays = joinedRefs.length
    ? Math.round(joinedRefs.reduce((s,r)=> s + Math.max(0,(Date.now()-new Date(r.submittedDate).getTime())/86400000), 0) / joinedRefs.length)
    : null;
  return `
  <div class="fade-up">
    <div style="display:flex;justify-content:space-between;align-items:end;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div><h1 class="display" style="font-size:26px;margin:0 0 4px;">HR Dashboard</h1><div style="font-size:13.5px;color:var(--ink-soft);">Org-wide referral performance, live.</div></div>
      <button class="btn btn-primary" data-nav="manageJobs">Post a Job</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px;margin-bottom:22px;">
      ${statCard('Total Referrals', total, 'referrals', GRADS[0])}
      ${statCard('Open Positions', openRoles, 'jobs', GRADS[1])}
      ${statCard('In Interviews', interviews, 'interview', GRADS[2])}
      ${statCard('Offers Extended', offers, 'offers', GRADS[3])}
      ${statCard('Joined', joined, 'joined', GRADS[4])}
      ${statCard('Bonus Paid', '₹'+bonusPaid.toLocaleString('en-IN'), 'bonus', GRADS[5])}
      ${statCard('Pipeline (avg, joined)', avgPipelineDays===null?'—':avgPipelineDays+'d', 'days', GRADS[6])}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px;">
      ${chartCard('Hiring Pipeline Funnel', 'chartFunnel')}
      ${chartCard('Referral Source', 'chartSource')}
      ${chartCard('Monthly Joining Trend', 'chartJoining')}
      ${chartCard('Department-wise Referrals', 'chartDeptHr')}
    </div>
  </div>`;
}
