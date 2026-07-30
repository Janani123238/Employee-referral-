/* ================================ Landing Page ================================ */
let _landingJobs = [];
let _landingFilter = { keyword: '', location: '', dept: '', exp: '', type: '' };

async function loadPublicJobs(){
  try {
    const res = await fetch('/api/jobs/public');
    if(res.ok) _landingJobs = await res.json();
  } catch(e){ _landingJobs = []; }
  const grid = document.getElementById('lpJobGrid');
  if(grid) grid.innerHTML = renderLandingJobCards();
}

/* ================================ Main Render ================================ */
function renderLandingPage(){
  return `
  <div class="landing-page">
    ${lpHeader()}
    ${lpHero()}
    ${lpShowcaseCard()}
    ${lpSearchSection()}
    ${lpFeaturedJobs()}
    ${lpHowItWorks()}
    ${lpWhyRefer()}
    ${lpSuccessStories()}
    ${lpFaq()}
    ${lpNewsletter()}
    ${lpFooter()}
  </div>
  <div id="landingModals"></div>`;
}

/* ================================ Navigation ================================ */
function lpHeader(){
  const loggedIn = !!getToken();
  return `
  <header class="lp-header" id="lpHeader">
    <div class="lp-header-inner">
      <a href="#" class="lp-logo" onclick="event.preventDefault();window.scrollTo({top:0,behavior:'smooth'})">
        <div class="lp-logo-icon">M</div>
        <span class="lp-logo-text">MuraAI <span style="font-weight:400;color:var(--lp-accent);">Refer</span></span>
      </a>
      <nav class="lp-nav" id="lpNav">
        <a href="#hero" class="lp-nav-link active" data-section="hero">Home</a>
        <a href="#jobs" class="lp-nav-link" data-section="jobs">Jobs</a>
        <a href="#howItWorks" class="lp-nav-link" data-section="howItWorks">How It Works</a>
        <a href="#stories" class="lp-nav-link" data-section="stories">Success Stories</a>
        <a href="#whyRefer" class="lp-nav-link" data-section="whyRefer">About</a>
        <a href="#faq" class="lp-nav-link" data-section="faq">Contact</a>
      </nav>
      <div class="lp-header-actions">
        ${loggedIn
          ? `<button class="lp-btn lp-btn-primary lp-btn-nav" onclick="window.location.reload()">Dashboard</button>`
          : `<button class="lp-btn lp-btn-primary lp-btn-nav" onclick="showLoginModal()">Sign In</button>`
        }
        <button class="lp-hamburger" id="lpHamburger" onclick="toggleLpMenu()">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
    <div class="lp-header-glow"></div>
  </header>`;
}

function toggleLpMenu(){
  const nav = document.getElementById('lpNav');
  if(nav) nav.classList.toggle('open');
  const ham = document.getElementById('lpHamburger');
  if(ham) ham.classList.toggle('active');
}

/* ================================ Hero ================================ */
function lpHero(){
  return `
  <section class="lp-hero" id="hero">
    <div class="lp-hero-3d-wrap"><canvas id="hero3dCanvas"></canvas></div>
    <div class="lp-hero-bg"></div>
    <div class="lp-hero-geometric">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <div class="grid-lines"></div>
    </div>
    <div class="lp-hero-content">
      <div class="lp-hero-badge"><span class="badge-dot"></span> Employee Referral Portal</div>
      <h1 class="lp-hero-title">Refer <span class="accent-word">Great Talent</span>.<br>Build Strong Teams.</h1>
      <p class="lp-hero-sub">Join thousands of employees who've helped build world-class teams through our AI-powered referral platform.</p>
      <div class="lp-hero-actions">
        <a href="#jobs" class="lp-btn lp-btn-primary lp-btn-lg">Browse Open Positions</a>
        <a href="#howItWorks" class="lp-btn lp-btn-hero-outline lp-btn-lg">Learn How It Works</a>
      </div>
      <div class="lp-hero-stats">
        <div class="lp-stat">
          <span class="lp-stat-num" data-count="500">0</span>
          <div class="lp-stat-label">Open Positions</div>
        </div>
        <div class="lp-stat">
          <span class="lp-stat-num" data-count="10000" data-suffix="+">0</span>
          <div class="lp-stat-label">Referrals Made</div>
        </div>
        <div class="lp-stat">
          <span class="lp-stat-num" data-count="5" data-prefix="₹" data-suffix="Cr+">0</span>
          <div class="lp-stat-label">Rewards Paid</div>
        </div>
        <div class="lp-stat">
          <span class="lp-stat-num" data-count="95" data-suffix="%">0</span>
          <div class="lp-stat-label">Satisfaction</div>
        </div>
      </div>
    </div>
  </section>`;
}

/* ================================ 3D Showcase Card ================================ */
function lpShowcaseCard(){
  return `
  <section class="lp-showcase-section">
    <div class="lp-container">
      <div class="sc-scene" id="scScene">
        <div class="sc-glow"></div>
        <div class="sc-card" id="scCard">
          <div class="sc-card-inner">

            <div class="sc-content">
              <div class="sc-badge"><span class="sc-badge-dot"></span>AI-Powered Referrals</div>
              <h2 class="sc-title">Refer Smarter.<br>Hire <span class="sc-gradient-word">Faster</span>.</h2>
              <p class="sc-desc">Our AI engine analyzes resumes, scores match quality, and surfaces the best candidates — turning your network into your strongest hiring pipeline.</p>
              <div class="sc-stats-row">
                <div class="sc-stat"><span class="sc-stat-num">2</span><span class="sc-stat-unit">min</span><span class="sc-stat-label">Avg Referral</span></div>
                <div class="sc-stat-divider"></div>
                <div class="sc-stat"><span class="sc-stat-num">40</span><span class="sc-stat-unit">%</span><span class="sc-stat-label">Faster Hiring</span></div>
                <div class="sc-stat-divider"></div>
                <div class="sc-stat"><span class="sc-stat-num">94</span><span class="sc-stat-unit">%</span><span class="sc-stat-label">Match Accuracy</span></div>
              </div>
              <div class="sc-actions">
                <button class="lp-btn lp-btn-primary lp-btn-lg sc-btn-glow" onclick="showLoginModal()">Start Referring</button>
                <a href="#howItWorks" class="lp-btn lp-btn-outline lp-btn-lg sc-btn-light">See How It Works</a>
              </div>
            </div>

            <div class="sc-visual">
              <div class="sc-dashboard">
                <div class="sc-dash-header">
                  <div class="sc-dash-dot sc-dash-dot-r"></div>
                  <div class="sc-dash-dot sc-dash-dot-y"></div>
                  <div class="sc-dash-dot sc-dash-dot-g"></div>
                  <span class="sc-dash-title">Referral Dashboard</span>
                </div>
                <div class="sc-dash-body">
                  <div class="sc-dash-row">
                    <div class="sc-dash-stat">
                      <div class="sc-dash-stat-icon" style="background:linear-gradient(135deg,#1E40AF,#3B82F6);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                      <div><div class="sc-dash-stat-val">24</div><div class="sc-dash-stat-name">Referred</div></div>
                    </div>
                    <div class="sc-dash-stat">
                      <div class="sc-dash-stat-icon" style="background:linear-gradient(135deg,#059669,#10B981);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
                      <div><div class="sc-dash-stat-val">8</div><div class="sc-dash-stat-name">Hired</div></div>
                    </div>
                    <div class="sc-dash-stat">
                      <div class="sc-dash-stat-icon" style="background:linear-gradient(135deg,#D97706,#F59E0B);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
                      <div><div class="sc-dash-stat-val">₹3.2L</div><div class="sc-dash-stat-name">Earned</div></div>
                    </div>
                  </div>
                  <div class="sc-dash-bar-group">
                    <div class="sc-dash-bar-label"><span>Engineering</span><span>78%</span></div>
                    <div class="sc-dash-bar"><div class="sc-dash-bar-fill" style="width:78%;background:linear-gradient(90deg,#1E40AF,#3B82F6);"></div></div>
                    <div class="sc-dash-bar-label"><span>Product</span><span>62%</span></div>
                    <div class="sc-dash-bar"><div class="sc-dash-bar-fill" style="width:62%;background:linear-gradient(90deg,#059669,#10B981);"></div></div>
                    <div class="sc-dash-bar-label"><span>Design</span><span>45%</span></div>
                    <div class="sc-dash-bar"><div class="sc-dash-bar-fill" style="width:45%;background:linear-gradient(90deg,#D97706,#FBBF24);"></div></div>
                  </div>
                </div>
              </div>

              <div class="sc-float-card sc-float-1">
                <div class="sc-float-avatar" style="background:linear-gradient(135deg,#1E40AF,#60A5FA);">AK</div>
                <div class="sc-float-info"><div class="sc-float-name">Anil Kumar</div><div class="sc-float-meta">Senior Engineer • <span class="sc-float-match">96% Match</span></div></div>
              </div>
              <div class="sc-float-card sc-float-2">
                <div class="sc-float-avatar" style="background:linear-gradient(135deg,#7C3AED,#A78BFA);">PS</div>
                <div class="sc-float-info"><div class="sc-float-name">Priya Sharma</div><div class="sc-float-meta">Product Manager • <span class="sc-float-match">91% Match</span></div></div>
              </div>
              <div class="sc-float-card sc-float-3">
                <div class="sc-float-icon-wrap"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div><div class="sc-float-notif-title">Referral Hired!</div><div class="sc-float-notif-meta">Rahul M. joined Engineering • ₹50K bonus</div></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function initShowcaseCard(){
  const scene = document.getElementById('scScene');
  const card = document.getElementById('scCard');
  if(!scene || !card) return;

  let raf = null;
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  scene.addEventListener('mousemove', e=>{
    const rect = scene.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    targetX = y * -14;
    targetY = x * 14;
    const glow = scene.querySelector('.sc-glow');
    if(glow){
      glow.style.opacity = '1';
      glow.style.background = `radial-gradient(600px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(30,64,175,0.15), transparent 60%)`;
    }
    const card = document.getElementById('scCard');
    if(card){
      card.style.setProperty('--gx', ((e.clientX - rect.left) / rect.width * 100) + '%');
      card.style.setProperty('--gy', ((e.clientY - rect.top) / rect.height * 100) + '%');
    }
  });

  scene.addEventListener('mouseleave', ()=>{
    targetX = 0; targetY = 0;
    const glow = scene.querySelector('.sc-glow');
    if(glow) glow.style.opacity = '0';
  });

  function animate(){
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    card.style.transform = `perspective(1000px) rotateX(${currentX}deg) rotateY(${currentY}deg) scale3d(1.01,1.01,1.01)`;
    raf = requestAnimationFrame(animate);
  }
  animate();

  scene._scCleanup = ()=>{ cancelAnimationFrame(raf); };
}

function destroyShowcaseCard(){
  const scene = document.getElementById('scScene');
  if(scene && scene._scCleanup) scene._scCleanup();
}

/* ================================ Search Bar ================================ */
function lpSearchSection(){
  return `
  <section class="lp-search-section" id="searchBar">
    <div class="lp-container">
      <div class="lp-search-bar">
        <div class="lp-search-field lp-search-field-grow">
          <svg class="lp-search-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Job title, keyword, or skill" id="lpKeyword" oninput="filterLandingJobs()"/>
        </div>
        <div class="lp-search-divider"></div>
        <div class="lp-search-field">
          <svg class="lp-search-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <select id="lpLocationFilter" onchange="filterLandingJobs()" class="lp-search-select">
            <option value="">All Locations</option>
            <option>Bangalore</option><option>Mumbai</option><option>Delhi NCR</option>
            <option>Hyderabad</option><option>Pune</option><option>Chennai</option><option>Remote</option>
          </select>
        </div>
        <div class="lp-search-divider"></div>
        <div class="lp-search-field">
          <select id="lpDept" onchange="filterLandingJobs()" class="lp-search-select">
            <option value="">All Departments</option>
            <option>Engineering</option><option>Product</option><option>Design</option>
            <option>Data Science</option><option>Marketing</option><option>Sales</option>
            <option>Human Resources</option><option>Finance</option><option>Operations</option>
          </select>
        </div>
        <button class="lp-btn lp-btn-primary lp-search-btn" onclick="filterLandingJobs()">Search Jobs</button>
      </div>
    </div>
  </section>`;
}

/* ================================ Featured Jobs ================================ */
function lpFeaturedJobs(){
  return `
  <section class="lp-section" id="jobs">
    <div class="lp-container">
      <div class="lp-section-header">
        <span class="lp-section-badge">Open Positions</span>
        <h2 class="lp-section-title">Featured Job Openings</h2>
        <p class="lp-section-sub">Explore opportunities across teams and find the perfect role for you or your referral.</p>
      </div>
      <div class="lp-filters-bar" id="lpFiltersBar">
        <button class="lp-filter-chip lp-filter-chip-active" data-filter="all" onclick="setLandingFilter('all')">All</button>
        <button class="lp-filter-chip" data-filter="Engineering" onclick="setLandingFilter('Engineering')">Engineering</button>
        <button class="lp-filter-chip" data-filter="Product" onclick="setLandingFilter('Product')">Product</button>
        <button class="lp-filter-chip" data-filter="Design" onclick="setLandingFilter('Design')">Design</button>
        <button class="lp-filter-chip" data-filter="Data Science" onclick="setLandingFilter('Data Science')">Data Science</button>
        <button class="lp-filter-chip" data-filter="Marketing" onclick="setLandingFilter('Marketing')">Marketing</button>
        <button class="lp-filter-chip" data-filter="Sales" onclick="setLandingFilter('Sales')">Sales</button>
      </div>
      <div class="lp-job-grid" id="lpJobGrid">${renderSkeletons()}</div>
    </div>
  </section>`;
}

function renderSkeletons(){
  return Array(6).fill('').map(()=>`
    <div class="lp-skeleton-card">
      <div class="lp-skeleton lp-sk-header"></div>
      <div class="lp-skeleton lp-sk-line" style="width:60%"></div>
      <div class="lp-skeleton lp-sk-line" style="width:80%"></div>
      <div class="lp-skeleton lp-sk-line" style="width:40%"></div>
      <div class="lp-skeleton lp-sk-footer"></div>
    </div>
  `).join('');
}

function renderLandingJobCards(){
  let jobs = _landingJobs.filter(j => j.status === 'Open');
  if(_landingFilter.keyword) jobs = jobs.filter(j => (j.title||'').toLowerCase().includes(_landingFilter.keyword) || (j.skills||[]).some(s=>s.toLowerCase().includes(_landingFilter.keyword)));
  if(_landingFilter.location) jobs = jobs.filter(j => (j.location||'').toLowerCase().includes(_landingFilter.location));
  if(_landingFilter.dept) jobs = jobs.filter(j => (j.dept||'').toLowerCase().includes(_landingFilter.dept));
  if(_landingFilter.type) jobs = jobs.filter(j => (j.type||'').toLowerCase().includes(_landingFilter.type));
  if(_landingFilter.exp) jobs = jobs.filter(j => matchExpRange(j.exp, _landingFilter.exp));

  if(!jobs.length) return `<div class="lp-empty">No jobs match your search. Try adjusting your filters.</div>`;

  return jobs.map(j => {
    const gradIdx = Math.abs(hashStr(j.id)) % GRADS.length;
    const posted = j.posted ? new Date(j.posted) : null;
    const daysAgo = posted ? Math.floor((Date.now() - posted.getTime()) / 86400000) : null;
    const closingSoon = daysAgo !== null && daysAgo > 20;
    return `
    <div class="lp-job-card">
      <div class="lp-job-card-top">
        <div class="lp-job-icon" style="background:${GRADS[gradIdx]};">${(j.title||'J')[0]}</div>
        <div class="lp-job-card-info">
          <div class="lp-job-title">${j.title}</div>
          <div class="lp-job-dept">${j.dept || 'General'}</div>
        </div>
        ${closingSoon ? '<span class="lp-badge lp-badge-urgent">Closing Soon</span>' : '<span class="lp-badge lp-badge-open">Open</span>'}
      </div>
      <div class="lp-job-meta">
        <span class="lp-job-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${j.location || 'Remote'}
        </span>
        <span class="lp-job-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          ${j.exp || 'Any'} yrs
        </span>
        <span class="lp-job-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${j.type || 'Full-time'}
        </span>
        <span class="lp-job-meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          ${(j.bonus||0).toLocaleString('en-IN')} bonus
        </span>
      </div>
      <div class="lp-job-skills">${(j.skills||[]).slice(0,5).map(s=>`<span class="lp-skill-tag">${s}</span>`).join('')}</div>
      <div class="lp-job-footer">
        <span class="lp-job-date">${daysAgo !== null ? (daysAgo === 0 ? 'Posted today' : `${daysAgo}d ago`) : ''}</span>
        <div class="lp-job-actions">
          <button class="lp-btn lp-btn-sm lp-btn-outline" onclick="showJobDetail('${j.id}')">View Details</button>
          <button class="lp-btn lp-btn-sm lp-btn-primary" onclick="showApplyModal('${j.id}')">Apply</button>
          <button class="lp-btn lp-btn-sm lp-btn-indigo" onclick="showReferralModal('${j.id}')">Refer Now</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; } return h; }

function matchExpRange(jobExp, filterExp){
  if(!filterExp) return true;
  const num = parseInt(jobExp) || 0;
  if(filterExp === '10+') return num >= 10;
  const [min, max] = filterExp.split('-').map(Number);
  return num >= min && num <= max;
}

function setLandingFilter(dept){
  _landingFilter.dept = dept === 'all' ? '' : dept;
  document.querySelectorAll('.lp-filter-chip').forEach(c => {
    c.classList.toggle('lp-filter-chip-active', c.dataset.filter === dept);
  });
  const grid = document.getElementById('lpJobGrid');
  if(grid) grid.innerHTML = renderLandingJobCards();
}

function filterLandingJobs(){
  _landingFilter.keyword = (document.getElementById('lpKeyword')?.value || '').toLowerCase();
  _landingFilter.location = (document.getElementById('lpLocationFilter')?.value || '').toLowerCase();
  _landingFilter.dept = (document.getElementById('lpDept')?.value || '').toLowerCase();
  const grid = document.getElementById('lpJobGrid');
  if(grid) grid.innerHTML = renderLandingJobCards();
}

/* ================================ How It Works ================================ */
function lpHowItWorks(){
  const steps = [
    {
      num: '01',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      title: 'Employee Refers',
      desc: 'Share your unique referral link with talented candidates in your network. One click is all it takes to start the process.'
    },
    {
      num: '02',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
      title: 'Candidate Applies',
      desc: 'The candidate fills out a streamlined application with their resume, experience, and portfolio details.'
    },
    {
      num: '03',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20.66 7A10 10 0 0 0 14 2v6h6.66z" fill="currentColor" opacity="0.2"/><polyline points="12 8 12 12 14 14"/></svg>`,
      title: 'AI Matches',
      desc: 'Our AI engine analyzes the resume against job requirements, scores the match, and surfaces the best-fit candidates.'
    }
  ];
  return `
  <section class="lp-section lp-section-alt" id="howItWorks">
    <div class="lp-container">
      <div class="lp-section-header">
        <span class="lp-section-badge">How It Works</span>
        <h2 class="lp-section-title">Three Simple Steps</h2>
        <p class="lp-section-sub">Our streamlined process makes referring candidates easier than ever before.</p>
      </div>
      <div class="lp-steps-grid">
        ${steps.map((s,i) => `
          <div class="lp-step-card">
            <div class="lp-step-num">${s.num}</div>
            <div class="lp-step-icon">${s.icon}</div>
            <h3 class="lp-step-title">${s.title}</h3>
            <p class="lp-step-desc">${s.desc}</p>
            ${i < steps.length - 1 ? '<div class="lp-step-connector"></div>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

/* ================================ Why Refer Through Us ================================ */
function lpWhyRefer(){
  const features = [
    { icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20.66 7A10 10 0 0 0 14 2v6h6.66z"/></svg>`, title: 'AI Resume Matching', desc: 'Intelligent matching that analyzes skills, experience, and cultural fit to connect the right candidates with the right roles.' },
    { icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`, title: 'Quick Referral Process', desc: 'Submit a referral in under 2 minutes. Our simplified workflow eliminates unnecessary friction and paperwork.' },
    { icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`, title: 'Real-Time Tracking', desc: 'Track every referral from submission to onboarding with live status updates and transparent pipeline visibility.' },
    { icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`, title: 'Reward Up to ₹1 Lakh', desc: 'Earn competitive referral bonuses for every successful hire. The more you refer, the more you earn.' },
    { icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`, title: 'Transparent Process', desc: 'Complete visibility into where your referral stands at every stage. No more guessing or follow-up emails.' },
    { icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>`, title: 'Career Growth', desc: 'Help your network grow while advancing your own career. Build your reputation as a top referrer in the organization.' }
  ];
  return `
  <section class="lp-section" id="whyRefer">
    <div class="lp-container">
      <div class="lp-section-header">
        <span class="lp-section-badge">Why Choose Us</span>
        <h2 class="lp-section-title">Why Refer Through MuraAI</h2>
        <p class="lp-section-sub">We make employee referrals smarter, faster, and more rewarding.</p>
      </div>
      <div class="lp-features-grid">
        ${features.map(f => `
          <div class="lp-feature-card">
            <div class="lp-feature-icon">${f.icon}</div>
            <h3 class="lp-feature-title">${f.title}</h3>
            <p class="lp-feature-desc">${f.desc}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

/* ================================ Success Stories ================================ */
function lpSuccessStories(){
  const stories = [
    { name: 'Priya Sharma', role: 'Senior Software Engineer', avatar: 'PS', grad: 'linear-gradient(135deg,#2563EB,#0891B2)', quote: 'I referred my former colleague and she got hired within 3 weeks. The AI matching was incredibly accurate — it flagged skills I hadn\'t even mentioned. The bonus was a wonderful surprise.', referredBy: 'John D.', rating: 5 },
    { name: 'Rahul Verma', role: 'Product Manager', avatar: 'RV', grad: 'linear-gradient(135deg,#059669,#0891B2)', quote: 'The entire referral process took less than 5 minutes. I pasted my referral\'s resume, the AI scored the match at 94%, and the hiring team reached out the same day. Best referral platform I\'ve used.', referredBy: 'Anita K.', rating: 5 },
    { name: 'Deepa Nair', role: 'UX Designer', avatar: 'DN', grad: 'linear-gradient(135deg,#1E40AF,#38BDF8)', quote: 'I\'ve referred three people so far and two got hired. The real-time tracking is amazing — I always knew exactly where each candidate was in the pipeline. Highly recommended!', referredBy: 'Vikram R.', rating: 5 }
  ];
  return `
  <section class="lp-section lp-section-alt" id="stories">
    <div class="lp-container">
      <div class="lp-section-header">
        <span class="lp-section-badge">Success Stories</span>
        <h2 class="lp-section-title">What Our Referrers Say</h2>
        <p class="lp-section-sub">Hear from employees who've successfully referred top talent through our platform.</p>
      </div>
      <div class="lp-testimonials-grid">
        ${stories.map(s => `
          <div class="lp-testimonial-card">
            <div class="lp-testimonial-stars">
              ${Array(s.rating).fill('<svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>').join('')}
            </div>
            <p class="lp-testimonial-text">"${s.quote}"</p>
            <div class="lp-testimonial-author">
              <div class="lp-testimonial-avatar" style="background:${s.grad};">${s.avatar}</div>
              <div>
                <div class="lp-testimonial-name">${s.name}</div>
                <div class="lp-testimonial-role">${s.role}</div>
                <div class="lp-testimonial-ref">Referred by ${s.referredBy}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

/* ================================ FAQ ================================ */
function lpFaq(){
  const faqs = [
    { q: 'How do I refer a candidate?', a: 'Simply log in to the portal, browse open positions, and click "Refer Now" on any job posting. You can paste the candidate\'s resume directly or share your unique referral link. The entire process takes under 2 minutes.' },
    { q: 'What is the referral bonus amount?', a: 'Referral bonuses range from ₹25,000 to ₹1,00,000 depending on the role level. Junior roles offer ₹25,000-₹50,000, mid-level roles offer ₹50,000-₹75,000, and senior/leadership roles offer up to ₹1,00,000. The bonus is paid after the candidate completes 90 days.' },
    { q: 'How long does the hiring process take?', a: 'On average, referred candidates move through the pipeline 40% faster than external applicants. The typical timeline is 2-3 weeks from referral submission to offer, depending on the role and interview scheduling.' },
    { q: 'Can I refer multiple candidates?', a: 'Yes, there is no limit on the number of referrals you can submit. In fact, top referrers earn additional recognition and exclusive rewards through our leaderboard program. Many employees refer 5-10 candidates per quarter.' },
    { q: 'What happens if my referral is rejected?', a: 'If your referral is not selected, you will receive a notification with the general reason. You can refer the same person again for a different role after 6 months. The AI matching system will also suggest other roles that may be a better fit.' },
    { q: 'How does the AI matching work?', a: 'Our AI engine analyzes the candidate\'s resume against the job description, evaluating skills match, experience relevance, education alignment, and cultural fit indicators. It generates a detailed match score with strengths, gaps, and a recommendation — all in seconds.' },
    { q: 'When is the referral bonus paid?', a: 'The referral bonus is credited to your account within 30 days of the referred candidate completing their 90-day probation period. You can track the bonus status in the Rewards section of your dashboard.' },
    { q: 'Can I refer someone who previously applied?', a: 'If the candidate has not applied in the last 6 months, you can submit a referral for them. The system will check for duplicates and notify you if the candidate is already in our pipeline. Re-referrals for different positions are welcome.' }
  ];
  return `
  <section class="lp-section" id="faq">
    <div class="lp-container">
      <div class="lp-section-header">
        <span class="lp-section-badge">FAQ</span>
        <h2 class="lp-section-title">Frequently Asked Questions</h2>
        <p class="lp-section-sub">Everything you need to know about our referral program.</p>
      </div>
      <div class="lp-faq-list">
        ${faqs.map((f, i) => `
          <div class="lp-faq-item" data-faq="${i}">
            <div class="lp-faq-q" onclick="toggleFaq(${i})">
              <span>${f.q}</span>
              <svg class="lp-faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="lp-faq-a"><p>${f.a}</p></div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function toggleFaq(i){
  const item = document.querySelector(`[data-faq="${i}"]`);
  if(item) item.classList.toggle('open');
}

/* ================================ Newsletter ================================ */
function lpNewsletter(){
  return `
  <section class="lp-newsletter-section">
    <div class="lp-container">
      <div class="lp-newsletter-card">
        <div class="lp-newsletter-content">
          <h2 class="lp-newsletter-title">Stay Updated</h2>
          <p class="lp-newsletter-desc">Get notified about new job openings, referral rewards, and platform updates.</p>
        </div>
        <div class="lp-newsletter-form">
          <input type="email" class="lp-input lp-newsletter-input" placeholder="Enter your email address" id="lpNewsletterEmail"/>
          <button class="lp-btn lp-btn-primary lp-newsletter-btn" onclick="handleNewsletterSubscribe()">Subscribe</button>
        </div>
      </div>
    </div>
  </section>`;
}

function handleNewsletterSubscribe(){
  const email = document.getElementById('lpNewsletterEmail')?.value;
  if(!email || !email.includes('@')) return toast('Please enter a valid email address', 'error');
  toast('Subscribed! We will notify you of new openings.', 'success');
  const input = document.getElementById('lpNewsletterEmail');
  if(input) input.value = '';
}

/* ================================ Footer ================================ */
function lpFooter(){
  return `
  <footer class="lp-footer">
    <div class="lp-container">
      <div class="lp-footer-grid">
        <div class="lp-footer-col lp-footer-about">
          <div class="lp-logo" style="margin-bottom:16px;">
            <div class="lp-logo-icon">M</div>
            <span class="lp-logo-text" style="color:#fff;">MuraAI Refer</span>
          </div>
          <p class="lp-footer-desc">AI-powered employee referral platform connecting great talent with great companies. Refer smarter, hire faster.</p>
          <div class="lp-social-links">
            <a href="#" class="lp-social-icon" title="LinkedIn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
            <a href="#" class="lp-social-icon" title="Twitter">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
            </a>
            <a href="#" class="lp-social-icon" title="Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="#" class="lp-social-icon" title="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
          </div>
        </div>
        <div class="lp-footer-col">
          <h4 class="lp-footer-heading">Quick Links</h4>
          <a href="#jobs" class="lp-footer-link">Search Jobs</a>
          <a href="#howItWorks" class="lp-footer-link">How It Works</a>
          <a href="#whyRefer" class="lp-footer-link">Why MuraAI</a>
          <a href="#stories" class="lp-footer-link">Success Stories</a>
          <a href="#faq" class="lp-footer-link">FAQ</a>
        </div>
        <div class="lp-footer-col">
          <h4 class="lp-footer-heading">Careers</h4>
          <a href="#jobs" class="lp-footer-link" onclick="setLandingFilter('Engineering')">Engineering</a>
          <a href="#jobs" class="lp-footer-link" onclick="setLandingFilter('Product')">Product</a>
          <a href="#jobs" class="lp-footer-link" onclick="setLandingFilter('Design')">Design</a>
          <a href="#jobs" class="lp-footer-link" onclick="setLandingFilter('Marketing')">Marketing</a>
          <a href="#jobs" class="lp-footer-link">View All Roles</a>
        </div>
        <div class="lp-footer-col">
          <h4 class="lp-footer-heading">Contact</h4>
          <p class="lp-footer-contact">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:6px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            MuraAI Technologies Pvt. Ltd.<br/>HSR Layout, Bengaluru, India 560102
          </p>
          <p class="lp-footer-contact">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:6px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            careers@muraai.com
          </p>
          <p class="lp-footer-contact">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:6px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            +91 80 4567 8900
          </p>
        </div>
      </div>
      <div class="lp-footer-bottom">
        <span>&copy; 2026 MuraAI Technologies. All Rights Reserved.</span>
      </div>
    </div>
  </footer>`;
}

/* ================================ Job Detail Modal ================================ */
function showJobDetail(jobId){
  const j = _landingJobs.find(x=>x.id===jobId);
  if(!j) return;
  const gradIdx = Math.abs(hashStr(j.id)) % GRADS.length;
  const modal = document.getElementById('landingModals');
  modal.innerHTML = `
  <div class="lp-modal-overlay" onclick="if(event.target===this)this.remove()">
    <div class="lp-modal pop-in">
      <div class="lp-modal-header" style="background:${GRADS[gradIdx]};">
        <div>
          <h2 class="lp-modal-title">${j.title}</h2>
          <div class="lp-modal-sub">${j.dept} &middot; ${j.location} &middot; ${j.type || 'Full-time'}</div>
        </div>
        <button class="lp-modal-close" onclick="this.closest('.lp-modal-overlay').remove()">&times;</button>
      </div>
      <div class="lp-modal-body">
        <div class="lp-detail-grid">
          <div class="lp-detail-item"><span class="lp-detail-label">Job ID</span><span class="lp-detail-val">${j.id}</span></div>
          <div class="lp-detail-item"><span class="lp-detail-label">Department</span><span class="lp-detail-val">${j.dept}</span></div>
          <div class="lp-detail-item"><span class="lp-detail-label">Location</span><span class="lp-detail-val">${j.location}</span></div>
          <div class="lp-detail-item"><span class="lp-detail-label">Experience</span><span class="lp-detail-val">${j.exp || 'Any'} years</span></div>
          <div class="lp-detail-item"><span class="lp-detail-label">Employment</span><span class="lp-detail-val">${j.type || 'Full-time'}</span></div>
          <div class="lp-detail-item"><span class="lp-detail-label">Referral Bonus</span><span class="lp-detail-val">₹${(j.bonus||0).toLocaleString('en-IN')}</span></div>
          <div class="lp-detail-item"><span class="lp-detail-label">Openings</span><span class="lp-detail-val">${j.openings || 1}</span></div>
          <div class="lp-detail-item"><span class="lp-detail-label">Status</span><span class="lp-detail-val"><span class="lp-badge lp-badge-open">${j.status}</span></span></div>
        </div>
        ${j.description ? `<div class="lp-detail-section"><h3>Job Description</h3><p>${j.description}</p></div>` : ''}
        <div class="lp-detail-section"><h3>Required Skills</h3><div class="lp-job-skills">${(j.skills||[]).map(s=>`<span class="lp-skill-tag">${s}</span>`).join('')}</div></div>
        <div class="lp-detail-section"><h3>Responsibilities</h3>
          <ul class="lp-detail-list">
            <li>Design, develop, and maintain scalable systems</li>
            <li>Collaborate with cross-functional teams</li>
            <li>Participate in code reviews and mentor peers</li>
            <li>Contribute to technical architecture decisions</li>
          </ul>
        </div>
        <div class="lp-detail-section"><h3>Benefits</h3>
          <ul class="lp-detail-list">
            <li>Competitive salary and stock options</li>
            <li>Health, dental, and vision insurance</li>
            <li>Flexible PTO and remote work options</li>
            <li>Learning and development budget</li>
            <li>Employee referral bonus program</li>
          </ul>
        </div>
        <div class="lp-detail-actions">
          <button class="lp-btn lp-btn-outline" onclick="this.closest('.lp-modal-overlay').remove();showApplyModal('${j.id}')">Apply</button>
          <button class="lp-btn lp-btn-primary" onclick="this.closest('.lp-modal-overlay').remove();showReferralModal('${j.id}')">Refer Now</button>
        </div>
      </div>
    </div>
  </div>`;
}

/* ================================ Apply Modal ================================ */
function showApplyModal(jobId){
  const j = _landingJobs.find(x=>x.id===jobId);
  if(!j) return;
  const loggedIn = !!getToken();
  const modal = document.getElementById('landingModals');

  if(!loggedIn){
    modal.innerHTML = `
    <div class="lp-modal-overlay" onclick="if(event.target===this)this.remove()">
      <div class="lp-modal lp-modal-sm pop-in">
        <div class="lp-modal-header" style="background:linear-gradient(135deg,#1E3A8A,#1E40AF,#2563EB);">
          <div>
            <h2 class="lp-modal-title">Candidate Sign In</h2>
            <div class="lp-modal-sub">Sign in with your candidate account to apply</div>
          </div>
          <button class="lp-modal-close" onclick="this.closest('.lp-modal-overlay').remove()">&times;</button>
        </div>
        <div class="lp-modal-body">
          <div class="lp-auth-tabs">
            <button class="lp-auth-tab lp-auth-tab-active" onclick="showApplyModal('${jobId}')" id="lpApplyLoginTab">Sign In</button>
            <button class="lp-auth-tab" onclick="showApplyRegisterForJob('${jobId}')">Register</button>
          </div>
          <form id="lpApplyLoginForm" onsubmit="handleLpApplyLogin(event,'${jobId}')">
            <div class="lp-form-group"><label class="lp-label">Email</label><input class="lp-input" name="email" type="email" required placeholder="your@email.com" id="lpApplyLoginEmail"/></div>
            <div class="lp-form-group"><label class="lp-label">Password</label><input class="lp-input" name="password" type="password" required placeholder="Enter your password" id="lpApplyLoginPass"/></div>
            <div class="lp-form-actions"><button type="submit" class="lp-btn lp-btn-primary" style="width:100%;justify-content:center;" id="lpApplyLoginBtn">Sign In</button></div>
            <div id="lpApplyLoginError" class="lp-form-error"></div>
          </form>
        </div>
      </div>
    </div>`;
    return;
  }

  modal.innerHTML = `
  <div class="lp-modal-overlay" onclick="if(event.target===this)this.remove()">
    <div class="lp-modal pop-in">
      <div class="lp-modal-header" style="background:linear-gradient(135deg,#1E3A8A,#1E40AF,#2563EB);">
        <div>
          <h2 class="lp-modal-title">Apply for ${j.title}</h2>
          <div class="lp-modal-sub">${j.dept} &middot; ${j.location}</div>
        </div>
        <button class="lp-modal-close" onclick="this.closest('.lp-modal-overlay').remove()">&times;</button>
      </div>
      <div class="lp-modal-body">
        <form id="lpCandidateApplyForm" onsubmit="handleCandidateApply(event,'${jobId}')">
          <div class="lp-form-group">
            <label class="lp-label">Resume (paste text)</label>
            <textarea class="lp-input lp-textarea" name="resumeText" rows="6" placeholder="Paste your resume content here..." id="lpApplyResumeText"></textarea>
          </div>
          <div class="lp-form-group">
            <label class="lp-label">Upload Resume (PDF/DOC)</label>
            <input type="file" class="lp-input lp-file-input" accept=".pdf,.doc,.docx,.txt" id="lpApplyResumeFile"/>
          </div>
          <div class="lp-form-row">
            <div class="lp-form-group"><label class="lp-label">LinkedIn Profile</label><input class="lp-input" name="linkedin" placeholder="linkedin.com/in/yourprofile"/></div>
            <div class="lp-form-group"><label class="lp-label">GitHub Profile</label><input class="lp-input" name="github" placeholder="github.com/yourprofile"/></div>
          </div>
          <div class="lp-form-group"><label class="lp-label">Portfolio URL</label><input class="lp-input" name="portfolio" placeholder="https://yourportfolio.com"/></div>
          <div class="lp-form-row">
            <div class="lp-form-group"><label class="lp-label">Phone *</label><input class="lp-input" name="phone" required placeholder="+91 98765 43210"/></div>
            <div class="lp-form-group"><label class="lp-label">Location</label><input class="lp-input" name="location" placeholder="City, Country"/></div>
          </div>
          <div class="lp-form-row">
            <div class="lp-form-group"><label class="lp-label">Years of Experience</label><input class="lp-input" name="experience" type="number" min="0" placeholder="e.g. 5"/></div>
            <div class="lp-form-group"><label class="lp-label">Education</label><input class="lp-input" name="education" placeholder="e.g. B.Tech Computer Science"/></div>
          </div>
          <div class="lp-form-group"><label class="lp-label">Skills (comma separated)</label><input class="lp-input" name="skills" placeholder="e.g. Python, React, AWS, SQL"/></div>
          <div class="lp-form-actions">
            <button type="button" class="lp-btn lp-btn-outline" onclick="this.closest('.lp-modal-overlay').remove()">Cancel</button>
            <button type="submit" class="lp-btn lp-btn-primary" id="lpApplySubmitBtn">Submit Application</button>
          </div>
        </form>
        <div id="lpApplyResult"></div>
      </div>
    </div>
  </div>`;
}

function showApplyRegisterForJob(jobId){
  const modal = document.getElementById('landingModals');
  modal.innerHTML = `
  <div class="lp-modal-overlay" onclick="if(event.target===this)this.remove()">
    <div class="lp-modal lp-modal-sm pop-in">
      <div class="lp-modal-header" style="background:linear-gradient(135deg,#1E3A8A,#1E40AF,#2563EB);">
        <div>
          <h2 class="lp-modal-title">Create Candidate Account</h2>
          <div class="lp-modal-sub">Join MuraAI Refer to apply</div>
        </div>
        <button class="lp-modal-close" onclick="this.closest('.lp-modal-overlay').remove()">&times;</button>
      </div>
      <div class="lp-modal-body">
        <div class="lp-auth-tabs">
          <button class="lp-auth-tab" onclick="showApplyModal('${jobId}')">Sign In</button>
          <button class="lp-auth-tab lp-auth-tab-active">Register</button>
        </div>
        <form id="lpApplyRegForm" onsubmit="handleLpApplyRegister(event,'${jobId}')">
          <div class="lp-form-group"><label class="lp-label">Full Name</label><input class="lp-input" name="name" required placeholder="Your full name" id="lpApplyRegName"/></div>
          <div class="lp-form-group"><label class="lp-label">Email</label><input class="lp-input" name="email" type="email" required placeholder="your@email.com" id="lpApplyRegEmail"/></div>
          <div class="lp-form-group"><label class="lp-label">Password</label><input class="lp-input" name="password" type="password" required placeholder="Min 8 chars" id="lpApplyRegPass"/></div>
          <div class="lp-form-actions"><button type="submit" class="lp-btn lp-btn-primary" style="width:100%;justify-content:center;" id="lpApplyRegBtn">Create Account</button></div>
          <div id="lpApplyRegError" class="lp-form-error"></div>
        </form>
      </div>
    </div>
  </div>`;
}

async function handleLpApplyLogin(e, jobId){
  e.preventDefault();
  const btn = document.getElementById('lpApplyLoginBtn');
  const errEl = document.getElementById('lpApplyLoginError');
  btn.disabled = true; btn.textContent = 'Signing in...'; errEl.textContent = '';
  try{
    const email = document.getElementById('lpApplyLoginEmail').value.trim();
    const password = document.getElementById('lpApplyLoginPass').value;
    const data = await api('/api/candidates/login', {method:'POST', body:{email, password}, auth:false});
    setToken(data.access_token);
    state.user = data.user; state.role = 'candidate';
    showApplyModal(jobId);
  }catch(err){
    errEl.textContent = err.message || 'Login failed';
    btn.disabled = false; btn.textContent = 'Sign In';
  }
}

async function handleLpApplyRegister(e, jobId){
  e.preventDefault();
  const btn = document.getElementById('lpApplyRegBtn');
  const errEl = document.getElementById('lpApplyRegError');
  btn.disabled = true; btn.textContent = 'Creating account...'; errEl.textContent = '';
  try{
    const name = document.getElementById('lpApplyRegName').value.trim();
    const email = document.getElementById('lpApplyRegEmail').value.trim();
    const password = document.getElementById('lpApplyRegPass').value;
    const data = await api('/api/candidates/register', {method:'POST', body:{name, email, password, phone:''}, auth:false});
    setToken(data.access_token);
    state.user = data.user; state.role = 'candidate';
    showApplyModal(jobId);
  }catch(err){
    errEl.textContent = err.message || 'Registration failed';
    btn.disabled = false; btn.textContent = 'Create Account';
  }
}

async function handleCandidateApply(e, jobId){
  e.preventDefault();
  const btn = document.getElementById('lpApplySubmitBtn');
  const resultEl = document.getElementById('lpApplyResult');
  btn.disabled = true; btn.textContent = 'Submitting...';
  const fd = new FormData(e.target);
  const job = _landingJobs.find(x=>x.id===jobId);

  const applyBody = {
    jobId,
    candidateName: state.user?.name || 'Candidate',
    email: state.user?.email || '',
    phone: fd.get('phone') || '',
    location: fd.get('location') || '',
    experience: fd.get('experience') || '',
    education: fd.get('education') || '',
    skills: (fd.get('skills') || '').split(',').map(s=>s.trim()).filter(Boolean),
    resumeText: fd.get('resumeText') || '',
    linkedin: fd.get('linkedin') || '',
    github: fd.get('github') || '',
    portfolio: fd.get('portfolio') || '',
    referredBy: 'self',
  };

  try{
    const appResult = await api('/api/candidates/apply', { method:'POST', body: applyBody });

    const appJob = _landingJobs.find(x=>x.id===jobId);
    const confirmId = appResult.id || '—';
    resultEl.innerHTML = `
    <div style="text-align:center;padding:16px 0;">
      <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#059669,#10B981);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:24px;color:#fff;">✓</div>
      <h3 style="margin:0 0 6px;font-size:17px;color:#059669;">Application Submitted!</h3>
      <p style="color:var(--ink-soft);font-size:13px;margin:0 0 16px;">Your application has been recorded. Analyzing your match score...</p>
      <div class="glass" style="padding:14px;text-align:left;max-width:420px;margin:0 auto 16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12.5px;">
          <div><span style="color:var(--ink-soft);">Application ID:</span><div class="mono" style="font-weight:700;margin-top:2px;">${confirmId}</div></div>
          <div><span style="color:var(--ink-soft);">Job ID:</span><div class="mono" style="font-weight:700;margin-top:2px;">${jobId}</div></div>
          <div><span style="color:var(--ink-soft);">Job Title:</span><div style="font-weight:700;margin-top:2px;">${appJob?.title || '—'}</div></div>
          <div><span style="color:var(--ink-soft);">Email:</span><div style="font-weight:700;margin-top:2px;">${state.user?.email || '—'}</div></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
        <button class="lp-btn lp-btn-primary lp-btn-sm" onclick="document.querySelector('.lp-modal-overlay')?.remove();_cpLastApplication={id:'${confirmId}',jobId:'${jobId}',jobTitle:'${(appJob?.title||'').replace(/'/g,"\\'")}'};_cpView='confirmation';render();">Track Application</button>
        <button class="lp-btn lp-btn-outline lp-btn-sm" onclick="document.querySelector('.lp-modal-overlay')?.remove();_cpView='dashboard';loadCandidateData().then(()=>render());">Go to Dashboard</button>
      </div>
    </div>`;

    try{
      const matchResult = await api('/api/ai/detailed-match', { method:'POST', body:{ resumeText: applyBody.resumeText, jobId } });
      const overall = matchResult.overall_match || matchResult.overallMatch || 0;
      const skillsMatch = matchResult.skills_match || matchResult.skillsMatch || 0;
      const expMatch = matchResult.experience_match || matchResult.experienceMatch || 0;
      const eduMatch = matchResult.education_match || matchResult.educationMatch || 0;
      const missing = matchResult.missing_skills || matchResult.missingSkills || [];
      const strengths = matchResult.strengths || [];
      const weaknesses = matchResult.weaknesses || [];
      const recommendation = matchResult.recommendation || 'No recommendation available';

      const scoreColor = overall >= 75 ? '#059669' : overall >= 50 ? '#D97706' : '#DC2626';
      resultEl.innerHTML += `
      <div class="lp-match-result" style="margin-top:16px;">
        <h3 class="lp-match-title">AI Match Score</h3>
        <div class="lp-match-score" style="color:${scoreColor};">
          <span class="lp-match-pct">${overall}%</span>
          <span class="lp-match-label">Overall Match</span>
        </div>
        <div class="lp-match-bars">
          <div class="lp-match-bar-row"><span class="lp-match-bar-label">Skills Match</span><div class="lp-match-bar"><div class="lp-match-fill" style="width:${skillsMatch}%;background:${skillsMatch>=75?'#059669':skillsMatch>=50?'#D97706':'#DC2626'}"></div></div><span class="lp-match-bar-pct">${skillsMatch}%</span></div>
          <div class="lp-match-bar-row"><span class="lp-match-bar-label">Experience Match</span><div class="lp-match-bar"><div class="lp-match-fill" style="width:${expMatch}%;background:${expMatch>=75?'#059669':expMatch>=50?'#D97706':'#DC2626'}"></div></div><span class="lp-match-bar-pct">${expMatch}%</span></div>
          <div class="lp-match-bar-row"><span class="lp-match-bar-label">Education Match</span><div class="lp-match-bar"><div class="lp-match-fill" style="width:${eduMatch}%;background:${eduMatch>=75?'#059669':eduMatch>=50?'#D97706':'#DC2626'}"></div></div><span class="lp-match-bar-pct">${eduMatch}%</span></div>
        </div>
        ${strengths.length ? `<div class="lp-match-section"><h4>Strengths</h4><div class="lp-match-tags">${strengths.map(s=>`<span class="lp-match-tag lp-match-tag-positive">${s}</span>`).join('')}</div></div>` : ''}
        ${weaknesses.length ? `<div class="lp-match-section"><h4>Areas for Improvement</h4><div class="lp-match-tags">${weaknesses.map(s=>`<span class="lp-match-tag lp-match-tag-negative">${s}</span>`).join('')}</div></div>` : ''}
        ${missing.length ? `<div class="lp-match-section"><h4>Missing Skills</h4><div class="lp-match-tags">${missing.map(s=>`<span class="lp-match-tag lp-match-tag-warning">${s}</span>`).join('')}</div></div>` : ''}
        <div class="lp-match-section"><h4>Recommendation</h4><p class="lp-match-recommendation">${recommendation}</p></div>
      </div>`;
    }catch(matchErr){
      /* AI match unavailable, confirmation already shown */
    }
  }catch(err){
    resultEl.innerHTML = `<div class="lp-error-box">${err.message || 'Could not submit application. Please try again.'}</div>`;
    btn.disabled = false; btn.textContent = 'Submit Application';
  }
}

/* ================================ Referral Modal ================================ */
function showReferralModal(jobId){
  const j = _landingJobs.find(x=>x.id===jobId);
  if(!j) return;
  const loggedIn = !!getToken();
  const modal = document.getElementById('landingModals');

  if(!loggedIn){
    modal.innerHTML = `
    <div class="lp-modal-overlay" onclick="if(event.target===this)this.remove()">
      <div class="lp-modal lp-modal-sm pop-in">
        <div class="lp-modal-header" style="background:linear-gradient(135deg,#1E40AF,#38BDF8);">
          <div>
            <h2 class="lp-modal-title">Sign In Required</h2>
            <div class="lp-modal-sub">Sign in as an employee to refer candidates</div>
          </div>
          <button class="lp-modal-close" onclick="this.closest('.lp-modal-overlay').remove()">&times;</button>
        </div>
        <div class="lp-modal-body" style="text-align:center;padding:32px 28px;">
          <p style="color:var(--text-secondary);font-size:14px;margin-bottom:20px;">You need an employee account to generate referral links and track your referrals.</p>
          <button class="lp-btn lp-btn-primary lp-btn-lg" onclick="this.closest('.lp-modal-overlay').remove();showLoginModal()">Sign In as Employee</button>
          <p style="font-size:12px;color:var(--text-muted);margin-top:14px;">Don't have an account? <a href="#" onclick="showRegisterModal();event.preventDefault()" style="color:var(--primary);font-weight:600;">Register here</a></p>
        </div>
      </div>
    </div>`;
    return;
  }

  const referralLink = `${window.location.origin}/refer?job=${jobId}&ref=${state.user?.employeeId || state.user?.id || 'unknown'}`;
  modal.innerHTML = `
  <div class="lp-modal-overlay" onclick="if(event.target===this)this.remove()">
    <div class="lp-modal lp-modal-sm pop-in">
      <div class="lp-modal-header" style="background:linear-gradient(135deg,#1E40AF,#38BDF8);">
        <div>
          <h2 class="lp-modal-title">Refer a Candidate</h2>
          <div class="lp-modal-sub">For: ${j.title} (${j.dept})</div>
        </div>
        <button class="lp-modal-close" onclick="this.closest('.lp-modal-overlay').remove()">&times;</button>
      </div>
      <div class="lp-modal-body">
        <div class="lp-referral-link-box">
          <label class="lp-label">Your Referral Link</label>
          <div class="lp-referral-link-row">
            <input class="lp-input" value="${referralLink}" readonly id="lpReferralLinkInput"/>
            <button class="lp-btn lp-btn-primary" onclick="copyReferralLink()">Copy</button>
          </div>
        </div>
        <div class="lp-referral-share">
          <button class="lp-btn lp-btn-outline lp-btn-share" onclick="shareReferralEmail('${j.title}','${referralLink}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Share via Email
          </button>
        </div>
        <div class="lp-referral-form-divider"></div>
        <h4 style="font-size:14px;font-weight:700;margin-bottom:14px;">Or submit directly</h4>
        <form id="lpReferralForm" onsubmit="submitLpReferral(event,'${jobId}')">
          <div class="lp-form-group"><label class="lp-label">Candidate Name *</label><input class="lp-input" name="candidateName" required placeholder="Full name"/></div>
          <div class="lp-form-row">
            <div class="lp-form-group"><label class="lp-label">Email *</label><input class="lp-input" name="email" type="email" required placeholder="email@example.com"/></div>
            <div class="lp-form-group"><label class="lp-label">Phone</label><input class="lp-input" name="phone" placeholder="+91 98765 43210"/></div>
          </div>
          <div class="lp-form-group"><label class="lp-label">LinkedIn Profile</label><input class="lp-input" name="linkedin" placeholder="linkedin.com/in/candidate"/></div>
          <div class="lp-form-group"><label class="lp-label">Resume Text</label><textarea class="lp-input lp-textarea" name="resumeText" rows="4" placeholder="Paste resume content or key qualifications..."></textarea></div>
          <div class="lp-form-group"><label class="lp-label">Why is this candidate a good fit?</label><textarea class="lp-input lp-textarea" name="notes" rows="3" placeholder="Your recommendation..."></textarea></div>
          <div class="lp-form-actions">
            <button type="button" class="lp-btn lp-btn-outline" onclick="this.closest('.lp-modal-overlay').remove()">Cancel</button>
            <button type="submit" class="lp-btn lp-btn-primary" id="lpSubmitRefBtn">Submit Referral</button>
          </div>
        </form>
        <div id="lpReferralResult"></div>
      </div>
    </div>
  </div>`;
}

function copyReferralLink(){
  const input = document.getElementById('lpReferralLinkInput');
  if(input){
    input.select();
    navigator.clipboard.writeText(input.value).then(()=> toast('Referral link copied!', 'success')).catch(()=> toast('Failed to copy', 'error'));
  }
}

function shareReferralEmail(jobTitle, link){
  const subject = encodeURIComponent(`Refer a candidate for ${jobTitle} at MuraAI`);
  const body = encodeURIComponent(`Hi,\n\nI thought you might be interested in this role at MuraAI:\n\n${jobTitle}\n\nApply through my referral link: ${link}\n\nBest regards`);
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
}

async function submitLpReferral(e, jobId){
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('lpSubmitRefBtn');
  const resultEl = document.getElementById('lpReferralResult');
  btn.disabled = true; btn.textContent = 'Submitting...';
  const fd = new FormData(form);
  try{
    await api('/api/referrals', { method:'POST', body:{
      candidateName: fd.get('candidateName'), email: fd.get('email'), phone: fd.get('phone'),
      linkedin: fd.get('linkedin'), resumeText: fd.get('resumeText') || 'No resume provided.',
      notes: fd.get('notes'), jobId: jobId,
    }});
    resultEl.innerHTML = `<div class="lp-success-box">Referral submitted successfully! Our HR team will review it shortly.</div>`;
    form.style.display = 'none';
  }catch(err){
    resultEl.innerHTML = `<div class="lp-error-box">${err.message || 'Could not submit referral. Please try again.'}</div>`;
    btn.disabled = false; btn.textContent = 'Submit Referral';
  }
}

/* ================================ Login Modal ================================ */

function showLoginModal(){
  const modal = document.getElementById('landingModals');
  modal.innerHTML = `
  <div class="lp-modal-overlay" onclick="if(event.target===this)this.remove()">
    <div class="lp-modal lp-modal-sm pop-in">
      <div class="lp-modal-header" style="background:linear-gradient(135deg,#1E3A8A,#1E40AF,#2563EB);">
        <div>
          <h2 class="lp-modal-title">Employee Login</h2>
          <div class="lp-modal-sub">Sign in to your MuraAI Refer account</div>
        </div>
        <button class="lp-modal-close" onclick="this.closest('.lp-modal-overlay').remove()">&times;</button>
      </div>
      <div class="lp-modal-body">
        <button class="lp-btn lp-btn-sso" onclick="ssoLogin()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>
          Continue with SSO
        </button>
        <div class="lp-divider"><span>or sign in with email</span></div>
        <form id="lpLoginForm" onsubmit="handleLpLogin(event)">
          <div class="lp-form-group"><label class="lp-label">Work Email</label><input class="lp-input" name="email" type="email" required placeholder="you@company.com" id="lpLoginEmail"/></div>
          <div class="lp-form-group"><label class="lp-label">Password</label><input class="lp-input" name="password" type="password" required placeholder="Enter your password" id="lpLoginPass"/></div>
          <div class="lp-form-actions" style="flex-direction:column;gap:10px;">
            <button type="submit" class="lp-btn lp-btn-primary" style="width:100%;justify-content:center;" id="lpLoginBtn">Sign In</button>
          </div>
          <div id="lpLoginError" class="lp-form-error"></div>
        </form>
        <div style="text-align:center;margin-top:14px;font-size:13px;">
          <a href="#" onclick="showForgotModal();event.preventDefault()" style="color:var(--primary);font-weight:600;">Forgot Password?</a>
        </div>
        <div style="text-align:center;margin-top:8px;font-size:12.5px;color:var(--text-secondary);">
          Don't have an account? <a href="#" onclick="showLpEmployeeRegister();event.preventDefault()" style="color:var(--primary);font-weight:600;">Create one</a>
        </div>
      </div>
    </div>
  </div>`;
}

function showLpEmployeeRegister(){
  const modal = document.getElementById('landingModals');
  modal.innerHTML = `
  <div class="lp-modal-overlay" onclick="if(event.target===this)this.remove()">
    <div class="lp-modal lp-modal-sm pop-in">
      <div class="lp-modal-header" style="background:linear-gradient(135deg,#1E3A8A,#1E40AF,#2563EB);">
        <div>
          <h2 class="lp-modal-title">Create Employee Account</h2>
          <div class="lp-modal-sub">Join MuraAI Refer as an Employee</div>
        </div>
        <button class="lp-modal-close" onclick="this.closest('.lp-modal-overlay').remove()">&times;</button>
      </div>
      <div class="lp-modal-body">
        <form id="lpEmpRegForm" onsubmit="handleLpEmployeeRegister(event)">
          <div class="lp-form-group"><label class="lp-label">Full Name</label><input class="lp-input" name="name" required placeholder="Your full name" id="lpEmpRegName"/></div>
          <div class="lp-form-group"><label class="lp-label">Work Email</label><input class="lp-input" name="email" type="email" required placeholder="you@company.com" id="lpEmpRegEmail"/></div>
          <div class="lp-form-group"><label class="lp-label">Password</label><input class="lp-input" name="password" type="password" required placeholder="Min 8 chars, upper, lower, number, symbol" id="lpEmpRegPass"/></div>
          <div class="lp-form-actions" style="flex-direction:column;gap:10px;">
            <button type="submit" class="lp-btn lp-btn-primary" style="width:100%;justify-content:center;" id="lpEmpRegBtn">Create Account</button>
          </div>
          <div id="lpEmpRegError" class="lp-form-error"></div>
          <div style="text-align:center;margin-top:14px;font-size:13px;">
            <a href="#" onclick="showLoginModal();event.preventDefault()" style="color:var(--primary);font-weight:600;">Already have an account? Sign In</a>
          </div>
        </form>
      </div>
    </div>
  </div>`;
}

async function handleLpEmployeeRegister(e){
  e.preventDefault();
  const btn = document.getElementById('lpEmpRegBtn');
  const errEl = document.getElementById('lpEmpRegError');
  btn.disabled = true; btn.textContent = 'Creating account...'; errEl.textContent = '';
  try{
    const name = document.getElementById('lpEmpRegName').value.trim();
    const email = document.getElementById('lpEmpRegEmail').value.trim();
    const password = document.getElementById('lpEmpRegPass').value;
    const data = await api('/api/auth/register', {method:'POST', body:{name, email, password, role:'employee', dept:'General'}, auth:false});
    setToken(data.access_token);
    state.user = data.user;
    state.role = data.user.role;
    document.querySelector('.lp-modal-overlay')?.remove();
    toast('Account created! Welcome to MuraAI Refer.', 'success');
    window.location.reload();
  }catch(err){
    errEl.textContent = err.message || 'Registration failed';
    btn.disabled = false; btn.textContent = 'Create Account';
  }
}

async function handleLpLogin(e){
  e.preventDefault();
  const btn = document.getElementById('lpLoginBtn');
  const errEl = document.getElementById('lpLoginError');
  btn.disabled = true; btn.textContent = 'Signing in...'; errEl.textContent = '';
  try{
    const email = document.getElementById('lpLoginEmail').value.trim();
    const password = document.getElementById('lpLoginPass').value;
    const data = await api('/api/auth/login', {method:'POST', body:{email, password}, auth:false});
    setToken(data.access_token);
    state.user = data.user;
    state.role = data.user.role;
    document.querySelector('.lp-modal-overlay')?.remove();
    toast('Signed in successfully!', 'success');
    render();
  }catch(err){
    errEl.textContent = err.message || 'Login failed';
    btn.disabled = false; btn.textContent = 'Sign In';
  }
}

function ssoLogin(){
  toast('SSO integration coming soon!', 'info');
}

function showForgotModal(){
  const modal = document.getElementById('landingModals');
  modal.innerHTML = `
  <div class="lp-modal-overlay" onclick="if(event.target===this)this.remove()">
    <div class="lp-modal lp-modal-sm pop-in">
      <div class="lp-modal-header" style="background:linear-gradient(135deg,#1E3A8A,#1E40AF,#2563EB);">
        <div>
          <h2 class="lp-modal-title">Reset Password</h2>
          <div class="lp-modal-sub">We'll email you a link to get back in</div>
        </div>
        <button class="lp-modal-close" onclick="this.closest('.lp-modal-overlay').remove()">&times;</button>
      </div>
      <div class="lp-modal-body">
        <form id="lpForgotForm" onsubmit="handleLpForgot(event)">
          <div class="lp-form-group"><label class="lp-label">Work Email</label><input class="lp-input" name="email" type="email" required placeholder="you@company.com" id="lpForgotEmail"/></div>
          <div class="lp-form-actions" style="flex-direction:column;gap:10px;">
            <button type="submit" class="lp-btn lp-btn-primary" style="width:100%;justify-content:center;" id="lpForgotBtn">Send reset link</button>
          </div>
          <div id="lpForgotError" class="lp-form-error"></div>
          <div id="lpForgotSuccess" style="color:#059669;font-size:12.5px;margin-top:10px;text-align:center;"></div>
          <div style="text-align:center;margin-top:14px;font-size:13px;">
            <a href="#" onclick="showLoginModal();event.preventDefault()" style="color:var(--primary);font-weight:600;">Back to sign in</a>
          </div>
        </form>
      </div>
    </div>
  </div>`;
}

async function handleLpForgot(e){
  e.preventDefault();
  const btn = document.getElementById('lpForgotBtn');
  const errEl = document.getElementById('lpForgotError');
  const okEl = document.getElementById('lpForgotSuccess');
  btn.disabled = true; btn.textContent = 'Sending...'; errEl.textContent = ''; okEl.textContent = '';
  try{
    const email = document.getElementById('lpForgotEmail').value.trim();
    const res = await api('/api/auth/forgot-password', {method:'POST', body:{email}, auth:false});
    okEl.textContent = res.message || 'If an account exists for that email, a reset link has been sent.';
  }catch(err){
    errEl.textContent = err.message || 'Could not send reset link';
  }finally{
    btn.disabled = false; btn.textContent = 'Send reset link';
  }
}

function showResetModal(){
  const modal = document.getElementById('landingModals');
  modal.innerHTML = `
  <div class="lp-modal-overlay" onclick="if(event.target===this)this.remove()">
    <div class="lp-modal lp-modal-sm pop-in">
      <div class="lp-modal-header" style="background:linear-gradient(135deg,#1E3A8A,#1E40AF,#2563EB);">
        <div>
          <h2 class="lp-modal-title">Choose a New Password</h2>
          <div class="lp-modal-sub">Enter and confirm your new password</div>
        </div>
        <button class="lp-modal-close" onclick="this.closest('.lp-modal-overlay').remove()">&times;</button>
      </div>
      <div class="lp-modal-body">
        <form id="lpResetForm" onsubmit="handleLpReset(event)">
          <div class="lp-form-group"><label class="lp-label">New Password</label><input class="lp-input" name="newPass" type="password" required placeholder="8+ chars, upper, lower, number, symbol" id="lpResetPass"/></div>
          <div class="lp-form-group"><label class="lp-label">Confirm New Password</label><input class="lp-input" name="confirmPass" type="password" required placeholder="Re-enter your new password" id="lpResetPassConfirm"/></div>
          <div class="lp-form-actions" style="flex-direction:column;gap:10px;">
            <button type="submit" class="lp-btn lp-btn-primary" style="width:100%;justify-content:center;" id="lpResetBtn">Update password</button>
          </div>
          <div id="lpResetError" class="lp-form-error"></div>
          <div style="text-align:center;margin-top:14px;font-size:13px;">
            <a href="#" onclick="showLoginModal();event.preventDefault()" style="color:var(--primary);font-weight:600;">Back to sign in</a>
          </div>
        </form>
      </div>
    </div>
  </div>`;
}

async function handleLpReset(e){
  e.preventDefault();
  const btn = document.getElementById('lpResetBtn');
  const errEl = document.getElementById('lpResetError');
  const newPass = document.getElementById('lpResetPass').value;
  const confirmPass = document.getElementById('lpResetPassConfirm').value;
  if(newPass !== confirmPass){ errEl.textContent = 'Passwords do not match'; return; }
  if(!state.resetToken){ errEl.textContent = 'Reset link is missing its token — request a new one'; return; }
  btn.disabled = true; btn.textContent = 'Updating...'; errEl.textContent = '';
  try{
    await api('/api/auth/reset-password', {method:'POST', body:{token: state.resetToken, newPassword: newPass}, auth:false});
    toast('Password updated — sign in with your new password', 'success');
    state.resetToken = null; state.loginMode = 'login';
    showLoginModal();
  }catch(err){
    errEl.textContent = err.message || 'Could not update password';
  }finally{
    btn.disabled = false; btn.textContent = 'Update password';
  }
}

function showRegisterModal(){
  const modal = document.getElementById('landingModals');
  modal.innerHTML = `
  <div class="lp-modal-overlay" onclick="if(event.target===this)this.remove()">
    <div class="lp-modal lp-modal-sm pop-in">
      <div class="lp-modal-header" style="background:linear-gradient(135deg,#1E3A8A,#1E40AF,#2563EB);">
        <div>
          <h2 class="lp-modal-title">Create Account</h2>
          <div class="lp-modal-sub">Join MuraAI Refer as an Employee</div>
        </div>
        <button class="lp-modal-close" onclick="this.closest('.lp-modal-overlay').remove()">&times;</button>
      </div>
      <div class="lp-modal-body">
        <form id="lpRegForm" onsubmit="handleLpRegister(event)">
          <div class="lp-form-group"><label class="lp-label">Full Name</label><input class="lp-input" name="name" required placeholder="Your full name" id="lpRegName"/></div>
          <div class="lp-form-group"><label class="lp-label">Work Email</label><input class="lp-input" name="email" type="email" required placeholder="you@company.com" id="lpRegEmail"/></div>
          <div class="lp-form-group"><label class="lp-label">Password</label><input class="lp-input" name="password" type="password" required placeholder="Min 8 chars, upper, lower, number, symbol" id="lpRegPass"/></div>
          <div class="lp-form-actions" style="flex-direction:column;gap:10px;">
            <button type="submit" class="lp-btn lp-btn-primary" style="width:100%;justify-content:center;" id="lpRegBtn">Create Account</button>
          </div>
          <div id="lpRegError" class="lp-form-error"></div>
          <div style="text-align:center;margin-top:14px;font-size:13px;">
            <a href="#" onclick="showLoginModal();event.preventDefault()" style="color:var(--primary);font-weight:600;">Already have an account? Sign In</a>
          </div>
        </form>
      </div>
    </div>
  </div>`;
}

async function handleLpRegister(e){
  e.preventDefault();
  const btn = document.getElementById('lpRegBtn');
  const errEl = document.getElementById('lpRegError');
  btn.disabled = true; btn.textContent = 'Creating account...'; errEl.textContent = '';
  try{
    const name = document.getElementById('lpRegName').value.trim();
    const email = document.getElementById('lpRegEmail').value.trim();
    const password = document.getElementById('lpRegPass').value;
    const data = await api('/api/auth/register', {method:'POST', body:{name, email, password, role:'employee', dept:'General'}, auth:false});
    setToken(data.access_token);
    state.user = data.user;
    state.role = data.user.role;
    document.querySelector('.lp-modal-overlay')?.remove();
    toast('Account created! You can now apply for jobs.', 'success');
  }catch(err){
    errEl.textContent = err.message || 'Registration failed';
    btn.disabled = false; btn.textContent = 'Create Account';
  }
}

/* ================================ Scroll Effects ================================ */
function initLandingScroll(){
  let ticking = false;
  window.addEventListener('scroll', ()=>{
    if(!ticking){
      requestAnimationFrame(()=>{
        const header = document.getElementById('lpHeader');
        if(header) header.classList.toggle('scrolled', window.scrollY > 50);

        document.querySelectorAll('.lp-nav-link').forEach(link=>{
          const section = link.dataset.section;
          if(!section) return;
          const el = document.getElementById(section);
          if(!el) return;
          const rect = el.getBoundingClientRect();
          link.classList.toggle('active', rect.top <= 200 && rect.bottom >= 200);
        });

        animateCounters();

        ticking = false;
      });
      ticking = true;
    }
  });

  /* Scroll-reveal with IntersectionObserver */
  const revealObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('lp-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  setTimeout(()=>{
    document.querySelectorAll('.lp-section-header, .lp-step-card, .lp-feature-card, .lp-testimonial-card, .lp-faq-item, .lp-job-card, .lp-newsletter-card, .lp-filter-chip').forEach((el, i)=>{
      el.classList.add('lp-reveal');
      el.style.transitionDelay = `${Math.min(i % 6 * 80, 400)}ms`;
      revealObserver.observe(el);
    });
    document.querySelectorAll('.lp-feature-card, .lp-step-card').forEach(card=>{
      card.addEventListener('mousemove', e=>{
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
      });
    });
  }, 100);
}

function animateCounters(){
  document.querySelectorAll('.lp-stat-num[data-count]').forEach(el=>{
    if(el.dataset.animated) return;
    const rect = el.getBoundingClientRect();
    if(rect.top > window.innerHeight || rect.bottom < 0) return;
    el.dataset.animated = '1';
    const target = parseInt(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = 2000;
    const startTime = performance.now();
    function step(now){
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = prefix + current.toLocaleString('en-IN') + suffix;
      if(progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/* ================================ Smooth Scroll ================================ */
function initLandingAnchors(){
  document.addEventListener('click', e=>{
    const a = e.target.closest('a[href^="#"]');
    if(!a) return;
    const id = a.getAttribute('href').replace('#','');
    const el = document.getElementById(id);
    if(el){
      e.preventDefault();
      el.scrollIntoView({behavior:'smooth', block:'start'});
      const nav = document.getElementById('lpNav');
      if(nav) nav.classList.remove('open');
      const ham = document.getElementById('lpHamburger');
      if(ham) ham.classList.remove('active');
    }
  });
}
