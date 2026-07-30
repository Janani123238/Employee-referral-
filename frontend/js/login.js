/* ------------------------------- Router / Render ------------------------------- */
function nav(view){ state.view=view; state.chat.open=false; render(); window.scrollTo({top:0,behavior:'smooth'}); }
function render(){
  const app = document.getElementById('app');
  if(!state.user){
    destroyHero3D();
    destroyShowcaseCard();
    app.innerHTML = renderLandingPage();
    initLandingScroll();
    initLandingAnchors();
    setTimeout(function(){ initHero3D(); initShowcaseCard(); }, 50);
    loadPublicJobs().then(()=>{ const grid=document.getElementById('lpJobGrid'); if(grid) grid.innerHTML=renderLandingJobCards(); });
    if(state.loginMode){
      setTimeout(()=>{
        if(state.loginMode==='forgot') showForgotModal();
        else if(state.loginMode==='reset') showResetModal();
        else showLoginModal();
      }, 100);
    }
    return;
  }
  if(!state.role) state.role = state.user.role || 'employee';

  app.innerHTML = shell();
  bindShell();
}

