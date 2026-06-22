// v7.2.2 Supabase security shim.
// Pass 1: the old browser-only local password gate is disabled.
// Supabase Auth + app.app_users approval now own login/logout/roles.
// Pass 2 hotfix: restore top user bar and load dashboard repair if dashboard renderer is blank.
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

  function loadDashboardRepair(){
    if(window.KFTP_DASH_REPAIR || document.getElementById('kftpDashboardRepairScript')) return;
    const s=document.createElement('script');
    s.id='kftpDashboardRepairScript';
    s.src='js/kftp-dashboard-repair_v7_2.js?v=7.2.2';
    s.onerror=()=>console.warn('KFTP dashboard repair module failed to load.');
    document.head.appendChild(s);
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

  function authToProfileId(pid){
    return ({stephen:'stephen_king',selma:'selma_ward',ashly:'ashly_king',david:'david_king',elaire:'elaire_ward',joshua:'joshua_king',christine:'christine_king',daniel:'daniel_king',michael:'michael_king',quintin:'quintin_king',adelaide:'adelaide_king'})[pid]||pid;
  }

  function profiles(){
    try{return (window.KFTP && window.KFTP.state && window.KFTP.state.familyProfiles) || [];}catch(e){return [];}
  }

  function householdLabelForSession(s){
    const hh=s && s.household_id;
    if(hh){
      const map={stephen_household:'Stephen King Household',joshua_household:'Joshua King Household',michael_household:'Michael King Household',david_household:'David King Household',elaire_household:'Elaire Ward Household'};
      return map[hh]||hh.replace(/_/g,' ');
    }
    try{
      const p=profiles().find(x=>x.id===authToProfileId(s.profileId));
      const map={stephen_household:'Stephen King Household',joshua_household:'Joshua King Household',michael_household:'Michael King Household',david_household:'David King Household',elaire_household:'Elaire Ward Household'};
      return p&&p.household_id?(map[p.household_id]||p.household_id):'';
    }catch(e){return '';}
  }

  function householdMembersForSession(s){
    try{
      const pid=authToProfileId(s.profileId);
      const list=profiles();
      const p=list.find(x=>x.id===pid);
      const hh=(s&&s.household_id) || (p&&p.household_id);
      if(!hh) return '';
      return list.filter(x=>x.household_id===hh).map(x=>x.name||x.display_name||x.id).filter(Boolean).join(', ');
    }catch(e){return '';}
  }

  function addLoginControls(){
    const s=session();
    if(!s) return;
    let bar=document.getElementById('topUserBar');
    if(!bar){
      const main=document.querySelector('.main') || document.body;
      bar=document.createElement('div');
      bar.id='topUserBar';
      bar.className='topUserBar';
      if(main.firstChild) main.insertBefore(bar, main.firstChild); else main.appendChild(bar);
    }
    const hh=householdLabelForSession(s);
    const members=householdMembersForSession(s);
    bar.innerHTML=`<div class="topUserLeft"><div class="avatarIcon" style="width:42px;height:42px;border-radius:16px;font-size:24px">👤</div><div><b>Logged in as</b><br><strong>${escapeHtml(s.name||'Supabase user')}</strong></div><span class="pill ${s.role==='admin'?'ok':'readonlyPill'}">${escapeHtml(s.role||'user')}</span>${hh?`<div><b>${escapeHtml(hh)}</b><br><span class="small">${escapeHtml(members||'Household access active')}</span></div>`:''}</div><div class="topUserRight"><button class="btn sm ghost" id="topSwitchUserBtn">Switch User</button><button class="btn sm ghost" id="topLogoutBtn">Logout</button></div>`;
    const lo=document.getElementById('topLogoutBtn'); if(lo)lo.onclick=logout;
    const su=document.getElementById('topSwitchUserBtn'); if(su)su.onclick=logout;
  }

  function escapeHtml(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

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
    // Supabase bridge owns the actual gate. This shim mirrors role-based UI restrictions and restores the user bar.
    if($('sbGate')){
      const o=$('authOverlay');
      if(o) o.remove();
      return;
    }
    const s=session();
    if(s){
      removeLocalOverlay();
      addLoginControls();
      hideAdminForNonAdmin();
      loadDashboardRepair();
      if(window.KFTP_DASH_REPAIR && typeof window.KFTP_DASH_REPAIR.patchDashboard==='function'){
        setTimeout(()=>window.KFTP_DASH_REPAIR.patchDashboard(false),50);
      }
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
    loadDashboardRepair();
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
