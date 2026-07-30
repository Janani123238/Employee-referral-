/* ------------------------------ Small UI helpers ------------------------------ */
function initials(name){ return name.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase(); }
function fmtDate(iso){ const d=new Date(iso); return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function fmtRelative(iso){
  const diff = Math.floor((Date.now()-new Date(iso).getTime())/86400000);
  if(diff<=0) return 'Today'; if(diff===1) return '1 day ago'; return diff+' days ago';
}
function statusColor(status){
  const map = {'Submitted':'#2563EB','HR Review':'#0891B2','Technical Round':'#7C3AED','Manager Round':'#D97706','HR Round':'#D97706','Offer':'#059669','Joined':'#059669','Rejected':'#DC2626','Applied':'#2563EB','Resume Screening':'#0891B2','Shortlisted':'#7C3AED','Interview Scheduled':'#7C3AED','Interview Completed':'#2563EB','Selected':'#059669','Offer Released':'#059669'};
  return map[status]||'#2563EB';
}
function currentUserEmployee(){ return state.employees.find(e=>e.id===state.user.employeeId); }
function jobById(id){ return state.jobs.find(j=>j.id===id); }
function employeeById(id){ return state.employees.find(e=>e.id===id); }

function attachTilt(root){
  root.querySelectorAll('.tilt-card').forEach(card=>{
    card.addEventListener('mousemove', e=>{
      const r = card.getBoundingClientRect();
      const x = (e.clientX-r.left)/r.width - 0.5, y=(e.clientY-r.top)/r.height - 0.5;
      card.style.transform = `perspective(700px) rotateX(${(-y*8).toFixed(2)}deg) rotateY(${(x*8).toFixed(2)}deg) translateZ(4px)`;
    });
    card.addEventListener('mouseleave', ()=>{ card.style.transform='perspective(700px) rotateX(0) rotateY(0)'; });
  });
}

function matchMeterSVG(percent, size=64, strokeW=7){
  const r = (size-strokeW)/2, c = 2*Math.PI*r, off = c - (percent/100)*c;
  const gradId = 'mm'+Math.random().toString(36).slice(2,7);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB"/><stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient></defs>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#E2E8F0" stroke-width="${strokeW}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="url(#${gradId})" stroke-width="${strokeW}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 ${size/2} ${size/2})">
      <animate attributeName="stroke-dashoffset" from="${c}" to="${off}" dur="1s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.2 1"/>
    </circle>
    <text x="50%" y="53%" text-anchor="middle" font-family="JetBrains Mono" font-size="${size*0.24}" font-weight="700" fill="#0F172A">${percent}%</text>
  </svg>`;
}

function skillTagColor(i){
  const cols = ['#2563EB','#0891B2','#DC2626','#059669','#D97706','#7C3AED'];
  return cols[i%cols.length];
}

function roleDisplay(role){
  const labels = {
    employee: 'Employee',
    manager: 'Manager',
    hr: 'HR',
    hr_manager: 'HR Manager',
    vp: 'VP',
    cto: 'CTO',
    ceo: 'CEO',
    system_admin: 'System Admin',
    admin: 'Admin',
  };
  return labels[role] || role;
}
