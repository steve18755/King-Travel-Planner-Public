// King Family Travel Planner v3.1 configuration
// For GitHub Pages, this stays client-side only. Secure backend settings will be added in v3.1+.
(function(){
  // Dashboard compatibility: bundled dashboard uses masked-account date math.
  window.masked = window.masked || 86400000;
  window.account = window.account || 0;

  const AUTH_SESSION_KEY = 'kftp_v31_auth_session';
  const SUPABASE_AUTH_KEY = 'sb-vguuedcyfzgqbaakhurg-auth-token';
  let topLogoutInProgress = false;

  function clearBrowserLogin(){
    try{
      localStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem(SUPABASE_AUTH_KEY);
    }catch(e){}
  }

  async function fallbackLogout(){
    clearBrowserLogin();
    try{
      if(window.KFTP_SUPABASE && typeof window.KFTP_SUPABASE.signOut === 'function'){
        await window.KFTP_SUPABASE.signOut();
        return;
      }
      if(window.KFTP_SUPABASE && window.KFTP_SUPABASE.client && window.KFTP_SUPABASE.client.auth){
        await window.KFTP_SUPABASE.client.auth.signOut();
      }
    }catch(e){}
    clearBrowserLogin();
    window.location.reload();
  }

  function useBottomSupabaseSignout(){
    if(topLogoutInProgress) return;
    topLogoutInProgress = true;

    // The bottom-right Supabase Sign out already works correctly. Route the top bar's
    // Logout / Switch User through that same handler instead of the older local handler.
    setTimeout(function(){
      const bottom = document.getElementById('sbOut');
      if(bottom && typeof bottom.click === 'function'){
        bottom.click();
        return;
      }
      fallbackLogout();
    }, 0);
  }

  function isTopLogoutControl(target){
    const el = target && target.closest ? target.closest('button,a,[role="button"],input') : null;
    if(!el) return false;
    const txt = ((el.textContent || el.value || '') + '').trim().toLowerCase();
    const id = el.id || '';
    const inTopBar = !!(el.closest && (el.closest('#topUserBar') || el.closest('.topUserBar')));
    return inTopBar && (id === 'topLogoutBtn' || id === 'topSwitchUserBtn' || txt === 'logout' || txt === 'switch user');
  }

  function captureTopLogout(e){
    if(!isTopLogoutControl(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    useBottomSupabaseSignout();
  }

  // Capture before older inline/local handlers get the event.
  ['pointerdown','mousedown','touchstart','click'].forEach(function(evt){
    document.addEventListener(evt, captureTopLogout, true);
  });

  // Also overwrite the top buttons directly after they appear. This covers handlers
  // attached with onclick/onmousedown on the old user bar.
  function bindTopButtons(){
    const nodes = document.querySelectorAll('#topUserBar button, .topUserBar button, #topUserBar a, .topUserBar a');
    nodes.forEach(function(el){
      const txt = ((el.textContent || el.value || '') + '').trim().toLowerCase();
      if(el.id === 'topLogoutBtn' || el.id === 'topSwitchUserBtn' || txt === 'logout' || txt === 'switch user'){
        el.onclick = function(ev){ if(ev){ev.preventDefault(); ev.stopPropagation();} useBottomSupabaseSignout(); return false; };
        el.onmousedown = el.onclick;
        el.onpointerdown = el.onclick;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    bindTopButtons();
    setInterval(bindTopButtons, 500);
  });
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