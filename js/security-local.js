// v7.3.2 Supabase security shim.
// Restores the top Supabase user bar while leaving Supabase Auth as the login authority.
(function(){
  'use strict';
  const AUTH_SESSION_KEY='kftp_v31_auth_session';
  const ADMIN_TABS=['admin','suppliers','vendorcheck','awardworksheet'];
  const $=id=>document.getElementById(id);

  window.masked = window.masked || 86400000;
  window.account = window.account || 0;

  function html(value){
    return String(value==null?'':value).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});
  }

  function session(){
    try{return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)||'null')}catch(e){return null}
  }

  function injectUserBarStyles(){
    if($('kftpUserBarRepairStyles')) return;
    const st=document.createElement('style');
    st.id='kftpUserBarRepairStyles';
    st.textContent=`
      #topUserBar,.topUserBar{background:linear-gradient(90deg,#054c51,#0a7d78);color:#fff;border-radius:0 0 16px 16px;padding:12px 16px;margin:0 -24px 22px;display:flex;justify-content:space-between;align-items:center;gap:14px;box-shadow:0 8px 18px rgba(0,0,0,.12);position:relative;z-index:50}
      #topUserBar .topUserLeft,#topUserBar .topUserRight,.topUserBar .topUserLeft,.topUserBar .topUserRight{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
      #topUserBar .pill,.topUserBar .pill{background:#dffbef;color:#075f41;border:0;border-radius:999px;padding:6px 10px;font-weight:900}
      #topUserBar .btn,.topUserBar .btn{background:#eef8fb;color:#073548;border:0;border-radius:10px;padding:8px 12px;font-weight:900;cursor:pointer}
      #topUserBar .small,.topUserBar .small{color:#dff6f4}
      #topUserBar .avatarIcon,.topUserBar .avatarIcon{background:#dff6f4;color:#073548;display:grid;place-items:center}
    `;
    document.head.appendChild(st);
  }

  function stateProfiles(){
    try{return (window.KFTP&&window.KFTP.state&&window.KFTP.state.familyProfiles)||[]}catch(e){return []}
  }

  function householdName(s){
    const raw=(s&&s.household_id)||'stephen_household';
    const names={stephen_household:'Stephen King Household',david_household:'David King Household',joshua_household:'Joshua King Household',michael_household:'Michael King Household',elaire_household:'Elaire Ward Household'};
    return names[raw]||String(raw).replace(/_/g,' ');
  }

  function householdMembers(s){
    const hh=(s&&s.household_id)||'stephen_household';
    const names=stateProfiles().filter(p=>p.household_id===hh).map(p=>p.name||p.display_name||p.id).filter(Boolean);
    return names.length?names.join(', '):'Stephen King, Selma Ward, Ashly King';
  }

  function ensureUserBar(){
    const s=session();
    if(!s){const old=$('topUserBar'); if(old) old.remove(); return;}
    injectUserBarStyles();
    let bar=$('topUserBar');
    if(!bar){
      const main=document.querySelector('.main')||document.querySelector('main')||document.body;
      bar=document.createElement('div');
      bar.id='topUserBar';
      bar.className='topUserBar';
      if(main.firstChild) main.insertBefore(bar,main.firstChild); else main.appendChild(bar);
    }
    bar.innerHTML=`<div class="topUserLeft"><div class="avatarIcon" style="width:42px;height:42px;border-radius:16px;font-size:24px">👤</div><div><b>Logged in as</b><br><strong>${html(s.name||'Supabase user')}</strong></div><span class="pill ok">${html(s.role||'user')}</span><div><b>${html(householdName(s))}</b><br><span class="small">${html(householdMembers(s))}</span></div></div><div class="topUserRight"><span class="small"><b>View</b></span><button class="btn sm ghost" type="button">Top</button><button class="btn sm ghost" type="button">Left</button><button class="btn sm ghost" type="button">Day</button><button class="btn sm ghost" id="topSwitchUserBtn" type="button">Switch User</button><button class="btn sm ghost" id="topLogoutBtn" type="button">Logout</button></div>`;
    const lo=$('topLogoutBtn'); if(lo) lo.onclick=logout;
    const sw=$('topSwitchUserBtn'); if(sw) sw.onclick=logout;
  }

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
      Object.keys(localStorage).forEach(k=>{
        const x=String(k).toLowerCase();
        if(x.startsWith('sb-') || x.includes('supabase') || x.includes('gotrue') || x.includes('vguuedcyfzgqbaakhurg')) localStorage.removeItem(k);
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
    const old=$('topUserBar'); if(old) old.remove();
    const url=new URL(window.location.href);
    url.hash='';
    url.searchParams.set('signedout', String(Date.now()));
    window.location.replace(url.toString());
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
          const result=orig(id);
          setTimeout(ensureUserBar,100);
          return result;
        };
        window.KFTP._supabaseAuthWrapped=true;
      }
    }
  }

  function logout(){ return hardLogout(); }

  function applyAccess(){
    if($('sbGate')){
      const o=$('authOverlay');
      if(o) o.remove();
      return;
    }
    const s=session();
    if(s){
      removeLocalOverlay();
      ensureUserBar();
      hideAdminForNonAdmin();
      window.KFTP_AUTH=window.KFTP_AUTH||{enabled:true,role:s.role,currentUser:s,requireAdmin:isAdmin,logout};
      window.KFTP_AUTH.enabled=true;
      window.KFTP_AUTH.role=s.role;
      window.KFTP_AUTH.currentUser=s;
      window.KFTP_AUTH.requireAdmin=isAdmin;
      window.KFTP_AUTH.logout=logout;
    }
  }

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

  window.KFTP_LOCAL_AUTH={applyAccess,isAdmin,currentProfile,logout,hardLogout,ensureUserBar};

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

  setInterval(applyAccess,700);
})();
