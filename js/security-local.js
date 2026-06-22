// v7.2.1 Supabase security shim.
// Pass 1: the old browser-only local gate is disabled.
// Supabase Auth + app.app_users approval now own login/logout/roles.
(function(){
  var hn='mas'+'ked';
  if(!window[hn]){
    window[hn]=function(value, keepLast){
      var text=String(value==null?'':value);
      var keep=typeof keepLast==='number'?keepLast:4;
      if(!text) return '';
      if(text.length<=keep) return '*'.repeat(text.length);
      return '*'.repeat(Math.max(0,text.length-keep))+text.slice(-keep);
    };
  }
})();
(function(){
  'use strict';
  const AUTH_SESSION_KEY='kftp_v31_auth_session';
  const ADMIN_TABS=['admin','suppliers','vendorcheck','awardworksheet'];
  const $=id=>document.getElementById(id);

  function removeLocalOverlay(){
    const o=$('authOverlay');
    if(o) o.remove();
    document.body.classList.remove('authLocked');
  }

  function showLoadingOverlay(){
    if($('authOverlay') || $('sbGate')) return;
    document.body.classList.add('authLocked');
    document.body.insertAdjacentHTML('beforeend',
      `<div id="authOverlay" class="authOverlay"><div class="authCard"><div class="authBrand"><span>🛡️</span><div><h1>King Family Travel Planner</h1><p>Loading secure Supabase login…</p></div></div><p class="muted small">The local prototype password gate has been replaced by Supabase Auth.</p></div></div>`
    );
  }

  function session(){
    try{return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)||'null')}catch(e){return null}
  }

  function isAdmin(){
    const auth=window.KFTP_AUTH||{};
    const s=session()||auth.currentUser||{};
    return auth.role==='admin' || s.role==='admin';
  }

  function currentProfile(){
    const s=session();
    if(!s) return null;
    return { id:s.profileId, name:s.name, role:s.role, household_id:s.household_id, supabase:true };
  }

  function hideAdminForNonAdmin(){
    const admin=isAdmin();
    document.body.classList.toggle('nonAdmin',!admin);
    document.querySelectorAll('#nav button').forEach(b=>{
      if(ADMIN_TABS.includes(b.dataset.tab)) b.style.display=admin?'':'none';
    });
    if(window.KFTP && !window.KFTP._supabaseAuthWrapped){
      const orig=window.KFTP.switchTab;
      if(typeof orig==='function'){
        window.KFTP.switchTab=function(id){
          if(ADMIN_TABS.includes(id)&&!isAdmin()){
            alert('This tab is restricted to admins.');
            return orig('dash');
          }
          return orig(id);
        };
        window.KFTP._supabaseAuthWrapped=true;
      }
    }
  }

  async function logout(){
    if(window.KFTP_SUPABASE && typeof window.KFTP_SUPABASE.signOut==='function'){
      return window.KFTP_SUPABASE.signOut();
    }
    localStorage.removeItem(AUTH_SESSION_KEY);
    location.reload();
  }

  function applyAccess(){
    // Supabase bridge owns the actual gate. This shim only mirrors role-based UI restrictions.
    if($('sbGate')){
      const o=$('authOverlay');
      if(o) o.remove();
      return;
    }
    const s=session();
    if(s){
      removeLocalOverlay();
      hideAdminForNonAdmin();
      window.KFTP_AUTH=window.KFTP_AUTH||{enabled:true,role:s.role,currentUser:s,requireAdmin:isAdmin,logout};
      window.KFTP_AUTH.enabled=true;
      window.KFTP_AUTH.role=s.role;
      window.KFTP_AUTH.currentUser=s;
      window.KFTP_AUTH.requireAdmin=isAdmin;
      window.KFTP_AUTH.logout=logout;
    }
  }

  window.KFTP_LOCAL_AUTH={applyAccess,isAdmin,currentProfile,logout};

  window.addEventListener('DOMContentLoaded',()=>{
    // Briefly block the app shell until the Supabase bridge either shows its gate or restores a session.
    showLoadingOverlay();
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(window.KFTP_SUPABASE || $('sbGate') || session()){
        removeLocalOverlay();
        applyAccess();
        clearInterval(timer);
        return;
      }
      if(tries>40){
        // Keep the page locked if the Supabase bridge failed to load; this prevents silently falling back to local-only access.
        showLoadingOverlay();
        clearInterval(timer);
      }
    },100);
  });

  setInterval(applyAccess,1000);
})();
