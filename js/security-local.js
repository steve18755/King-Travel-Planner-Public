// v7.2.8 Supabase security shim.
// Pass 1 repair: local password gate stays disabled; Supabase Auth owns login/logout/roles.
// This shim also makes Logout / Switch User a true hard sign-out so Supabase does not auto-restore the session.
(function(){
  'use strict';
  const AUTH_SESSION_KEY='kftp_v31_auth_session';
  const ADMIN_TABS=['admin','suppliers','vendorcheck','awardworksheet'];
  const $=id=>document.getElementById(id);

  // Keep the legacy dashboard arithmetic placeholder available as early as this file loads.
  window.masked = window.masked || 86400000;
  window.account = window.account || 0;

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

  function clearAuthStorage(){
    try{
      localStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem('kftp_v31_auth_users');
      localStorage.removeItem('kftp_admin_activity_log_v33');
      Object.keys(localStorage).forEach(k=>{
        const x=String(k).toLowerCase();
        if(x.startsWith('sb-') || x.includes('supabase') || x.includes('gotrue') || x.includes('vguuedcyfzgqbaakhurg')) localStorage.removeItem(k);
      });
    }catch(e){}
    try{
      sessionStorage.setItem('kftp_force_logout','1');
      Object.keys(sessionStorage).forEach(k=>{
        const x=String(k).toLowerCase();
        if(x.startsWith('sb-') || x.includes('supabase') || x.includes('gotrue') || x.includes('vguuedcyfzgqbaakhurg')) sessionStorage.removeItem(k);
      });
    }catch(e){}
  }

  async function hardLogout(){
    clearAuthStorage();
    try{
      if(window.KFTP_SUPABASE && window.KFTP_SUPABASE.client && window.KFTP_SUPABASE.client.auth){
        await window.KFTP_SUPABASE.client.auth.signOut({scope:'local'});
      }else if(window.supabase && window.KFTP_SUPABASE_CONFIG){
        const c=window.supabase.createClient(window.KFTP_SUPABASE_CONFIG.url, window.KFTP_SUPABASE_CONFIG.anonKey, {auth:{persistSession:true,autoRefreshToken:false}});
        await c.auth.signOut({scope:'local'});
      }
    }catch(e){}
    clearAuthStorage();
    const url=new URL(window.location.href);
    url.hash='';
    url.searchParams.set('signedout', String(Date.now()));
    window.location.replace(url.toString());
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

  function logout(){
    return hardLogout();
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

  // Capture logout/switch clicks before the older inline handlers or cloud-bar handler can reload and restore the session.
  document.addEventListener('click', function(e){
    const btn=e.target && e.target.closest ? e.target.closest('button') : null;
    if(!btn) return;
    const id=btn.id || '';
    const txt=(btn.textContent || '').trim().toLowerCase();
    const inAuthControl = id==='topLogoutBtn' || id==='topSwitchUserBtn' || id==='sbOut' ||
      (btn.closest && (btn.closest('#topUserBar') || btn.closest('#sbCloudBar')) && (txt==='logout' || txt==='switch user' || txt==='sign out'));
    if(inAuthControl){
      e.preventDefault();
      e.stopPropagation();
      if(typeof e.stopImmediatePropagation==='function') e.stopImmediatePropagation();
      hardLogout();
    }
  }, true);

  window.KFTP_LOCAL_AUTH={applyAccess,isAdmin,currentProfile,logout,hardLogout};

  window.addEventListener('DOMContentLoaded',()=>{
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
        showLoadingOverlay();
        clearInterval(timer);
      }
    },100);
  });

  setInterval(applyAccess,1000);
})();
