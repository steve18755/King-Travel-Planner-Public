// King Family Travel Planner v3.1 configuration
// For GitHub Pages, this stays client-side only. Secure backend settings will be added in v3.1+.
(function(){
  // Dashboard compatibility: bundled dashboard uses masked-account date math.
  window.masked = window.masked || 86400000;
  window.account = window.account || 0;

  const AUTH_SESSION_KEY = 'kftp_v31_auth_session';
  const SUPABASE_AUTH_KEY = 'sb-vguuedcyfzgqbaakhurg-auth-token';

  function clearBrowserLogin(){
    try{
      localStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem(SUPABASE_AUTH_KEY);
    }catch(e){}
    try{
      sessionStorage.setItem('kftp_signed_out','1');
    }catch(e){}
  }

  async function realLogout(){
    clearBrowserLogin();
    try{
      if(window.KFTP_SUPABASE && window.KFTP_SUPABASE.client && window.KFTP_SUPABASE.client.auth){
        await window.KFTP_SUPABASE.client.auth.signOut();
      }
    }catch(e){}
    clearBrowserLogin();
    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.set('signedout', Date.now().toString());
    window.location.replace(url.toString());
  }

  // If the user intentionally signed out, keep the page from auto-restoring the prior session.
  if(new URL(window.location.href).searchParams.has('signedout')){
    clearBrowserLogin();
  }

  // Capture all top-bar and cloud-bar logout/switch controls before older inline handlers run.
  document.addEventListener('click', function(e){
    const el = e.target && e.target.closest ? e.target.closest('button,a') : null;
    if(!el) return;
    const txt = (el.textContent || '').trim().toLowerCase();
    const id = el.id || '';
    if(id === 'topLogoutBtn' || id === 'topSwitchUserBtn' || id === 'sbOut' || txt === 'logout' || txt === 'switch user' || txt === 'sign out'){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      realLogout();
    }
  }, true);
})();

window.KFTP_CONFIG = {
  appName: 'King Family Travel Planner',
  version: '3.1',
  mode: 'local-login-secure-ready',
  storageKey: 'kingTravelPlannerV31',
  priorStorageKeys: ['kingTravelPlannerV30','kingTravelPlannerV29'],
  secureBackend: { enabled: false, provider: 'planned-supabase' },
  localSecurity: { enabled: true, adminProfileId: 'stephen', firstLoginSetup: true },
  defaultTimezone: 'America/Chicago',
  adminOwner: 'Stephen King'
};