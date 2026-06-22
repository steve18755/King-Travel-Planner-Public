// v5.2 local login gate.
// This is a client-side access gate for the GitHub prototype. True security still requires Supabase/Firebase/other backend auth + database RLS.
(function(){
  'use strict';
  const AUTH_USERS_KEY='kftp_v31_auth_users';
  const AUTH_SESSION_KEY='kftp_v31_auth_session';
  const ADMIN_LOG_KEY='kftp_admin_activity_log_v33';
  const cfg=window.KFTP_CONFIG||{};
  // Supabase mode owns authentication. Do not display the old v5.2 local login gate
  // when the secure Supabase bridge/config is present.
  function supabaseModeActive(){
    const sc = window.KFTP_SUPABASE_CONFIG || {};
    return !!(sc && sc.mode === 'supabase' && sc.url && sc.anonKey);
  }
  function localGateDisabled(){
    return supabaseModeActive() || !!(cfg.localSecurity && cfg.localSecurity.enabled === false);
  }
  function removeLocalOverlayOnly(){
    const o=document.getElementById('authOverlay');
    if(o) o.remove();
    document.body.classList.remove('authLocked');
  }
  const family=[
    {id:'stephen',name:'Stephen King',email:'stephen.private@example.com',role:'admin'},
    {id:'selma',name:'Selma Ward',email:'selma.private@example.com',role:'family'},
    {id:'ashly',name:'Ashly King',email:'ashly.private@example.com',role:'family'},
    {id:'david',name:'David King',email:'david.private@example.com',role:'admin'},
    {id:'elaire',name:'Elaire Ward',email:'',role:'extended_family'},
    {id:'joshua',name:'Joshua King',email:'joshua.private@example.com',role:'extended_family'},
    {id:'christine',name:'Christine King',email:'',role:'extended_family'},
    {id:'daniel',name:'Daniel King',email:'',role:'child'},
    {id:'michael',name:'Michael King',email:'michael.private@example.com',role:'extended_family'},
    {id:'quintin',name:'Quintin King',email:'',role:'child'},
    {id:'adelaide',name:'Adelaide King',email:'',role:'child'}
  ];
  const $=id=>document.getElementById(id);
  function users(){try{return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)||'{}')}catch(e){return {}}}
  function saveUsers(u){localStorage.setItem(AUTH_USERS_KEY,JSON.stringify(u));}
  function session(){try{return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)||'null')}catch(e){return null}}
  function setSession(s){localStorage.setItem(AUTH_SESSION_KEY,JSON.stringify(s));}
  function clearSession(){localStorage.removeItem(AUTH_SESSION_KEY);}
  function enc(buf){return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');}
  async function hash(pw,salt){let data=new TextEncoder().encode(String(salt||'')+'|'+String(pw||''));let buf=await crypto.subtle.digest('SHA-256',data);return enc(buf);}
  function salt(){return crypto.getRandomValues(new Uint8Array(16)).reduce((s,b)=>s+b.toString(16).padStart(2,'0'),'');}
  
  function localLog(action, detail){
    try{
      const rec={id:'log_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),at:new Date().toISOString(),user:detail&&detail.name?detail.name:'Unknown/local',role:detail&&detail.role?detail.role:'unknown',action:String(action||''),detail:detail&&detail.detail?String(detail.detail):'',url:location.href.split('#')[0]};
      const arr=JSON.parse(localStorage.getItem(ADMIN_LOG_KEY)||'[]'); arr.unshift(rec); localStorage.setItem(ADMIN_LOG_KEY,JSON.stringify(arr.slice(0,500)));
    }catch(e){}
  }

  function currentProfile(){let s=session();return s&&family.find(f=>f.id===s.profileId);}
  function isAdmin(){let p=currentProfile();return !!(p&&p.role==='admin');}
  function authBox(){
    const u=users();
    const options=family.map(f=>`<option value="${f.id}">${f.name}${u[f.id]?' — login':' — first setup'}</option>`).join('');
    return `<div id="authOverlay" class="authOverlay"><div class="authCard"><div class="authBrand"><span>🛡️</span><div><h1>King Family Travel Planner</h1><p>v5.2 local login gate</p></div></div><form id="authForm" class="authForm"><label>Family member</label><select name="profileId" id="authProfile">${options}</select><label>Username</label><input name="username" autocomplete="username" required placeholder="Create or enter username"><label>Password</label><input type="password" name="password" autocomplete="current-password" required placeholder="Create or enter password"><label id="confirmLabel" class="authConfirm">Confirm password</label><input id="authConfirm" class="authConfirm" type="password" name="confirm" autocomplete="new-password" placeholder="Confirm first-login password"><button class="btn primary fullBtn">Continue</button><p class="muted small">First login for each family member creates that member's local username/password. Stephen and David are admin roles for this local prototype.</p></form></div></div>`;
  }
  function updateConfirmVisibility(){let u=users();let pid=($('authProfile')||{}).value;let first=!u[pid];document.querySelectorAll('.authConfirm').forEach(el=>el.style.display=first?'block':'none');}
  async function handleAuth(e){
    e.preventDefault();
    const fd=new FormData(e.target), pid=fd.get('profileId'), username=String(fd.get('username')||'').trim(), password=String(fd.get('password')||''), confirm=String(fd.get('confirm')||'');
    let all=users(), prof=family.find(f=>f.id===pid);
    if(!prof){alert('Profile not recognized.');return;}
    if(!all[pid]){
      if(password.length<8){alert('Password must be at least 8 characters.');return;}
      if(password!==confirm){alert('Passwords do not match.');return;}
      const s=salt(); all[pid]={profileId:pid,username,salt:s,hash:await hash(password,s),role:prof.role,createdAt:new Date().toISOString(),lastLogin:null};
      saveUsers(all);
    }else{
      const rec=all[pid];
      if(username!==rec.username || await hash(password,rec.salt)!==rec.hash){alert('Login failed. Check username/password.');return;}
    }
    all=users(); all[pid].lastLogin=new Date().toISOString(); saveUsers(all);
    setSession({profileId:pid,name:prof.name,role:prof.role,loginAt:new Date().toISOString()});
    localLog('Login', {name:prof.name, role:prof.role, detail: all[pid]&&all[pid].createdAt===all[pid].lastLogin?'First login/setup':'User login'});
    applyAccess();
  }

  function authToProfileId(pid){return ({stephen:'stephen_king',selma:'selma_ward',ashly:'ashly_king',david:'david_king',elaire:'elaire_ward',joshua:'joshua_king',christine:'christine_king',daniel:'daniel_king',michael:'michael_king',quintin:'quintin_king',adelaide:'adelaide_king'})[pid]||pid;}
  function householdLabelForSession(s){try{const p=(window.KFTP&&window.KFTP.state&&window.KFTP.state.familyProfiles||[]).find(x=>x.id===authToProfileId(s.profileId)); const hh=p&&p.household_id; const map={stephen_household:'Stephen King Household',joshua_household:'Joshua King Household',michael_household:'Michael King Household',david_household:'David King Household',elaire_household:'Elaire Ward Household'}; return map[hh]||'';}catch(e){return '';}}
  function householdMembersForSession(s){try{const pid=authToProfileId(s.profileId); const profiles=(window.KFTP&&window.KFTP.state&&window.KFTP.state.familyProfiles)||[]; const p=profiles.find(x=>x.id===pid); if(!p||!p.household_id)return ''; return profiles.filter(x=>x.household_id===p.household_id).map(x=>x.name).join(', ');}catch(e){return '';}}

  function addLoginControls(){
    const s=session(); if(!s)return;
    let bar=document.getElementById('topUserBar');
    if(!bar){
      const main=document.querySelector('.main')||document.body;
      bar=document.createElement('div');
      bar.id='topUserBar';
      bar.className='topUserBar';
      main.insertBefore(bar, main.firstChild);
    }
    bar.innerHTML=`<div class="topUserLeft"><b>Logged in:</b> ${s.name} <span class="pill ${s.role==='admin'?'ok':'readonlyPill'}">${s.role}</span>${householdLabelForSession(s)?` <span class="pill">${householdLabelForSession(s)}</span>`:''}${householdMembersForSession(s)?` <span class="householdBarMembers">Household: ${householdMembersForSession(s)}</span>`:''}</div><div class="topUserRight"><button class="btn sm ghost" id="topSwitchUserBtn">Switch user</button><button class="btn sm ghost" id="topLogoutBtn">Logout</button></div>`;
    const logout=()=>{localLog('Logout',{name:s.name,role:s.role,detail:'User clicked logout'});clearSession();location.reload();};
    const sw=()=>{localLog('Switch user',{name:s.name,role:s.role,detail:'User switched account'});clearSession();location.reload();};
    const lo=document.getElementById('topLogoutBtn'); if(lo)lo.onclick=logout;
    const su=document.getElementById('topSwitchUserBtn'); if(su)su.onclick=sw;
    // Keep a compact sidebar status for small screens but do not duplicate controls repeatedly.
    let side=document.getElementById('authStatus');
    if(!side){
      const aside=document.querySelector('.side');
      if(aside){
        side=document.createElement('div'); side.id='authStatus'; side.className='sideBox authStatus'; aside.appendChild(side);
      }
    }
    if(side)side.innerHTML=`<b>Logged in:</b><br>${s.name}<br><span class="pill ${s.role==='admin'?'ok':'readonlyPill'}">${s.role}</span>`;
  }
  function hideAdminForNonAdmin(){
    const admin=isAdmin();
    document.body.classList.toggle('nonAdmin',!admin);
    document.querySelectorAll('#nav button').forEach(b=>{if(['admin','suppliers','vendorcheck','awardworksheet'].includes(b.dataset.tab))b.style.display=admin?'':'none';});
    if(window.KFTP && !window.KFTP._authWrapped){
      const orig=window.KFTP.switchTab;
      window.KFTP.switchTab=function(id){ if(['admin','suppliers','vendorcheck','awardworksheet'].includes(id)&&!isAdmin()){alert('This tab is restricted to admins.'); return orig('dash');} return orig(id); };
      window.KFTP._authWrapped=true;
    }
  }
  function showGate(){
    if(localGateDisabled()){ removeLocalOverlayOnly(); return; }
    if(!$('authOverlay'))document.body.insertAdjacentHTML('beforeend',authBox());
    $('authForm').onsubmit=handleAuth;
    $('authProfile').onchange=updateConfirmVisibility;
    updateConfirmVisibility();
    document.body.classList.add('authLocked');
  }
  function applyAccess(){
    if(localGateDisabled()){ removeLocalOverlayOnly(); return; }
    const s=session();
    const overlay=$('authOverlay'); if(overlay)overlay.remove();
    if(!s){showGate(); return;}
    document.body.classList.remove('authLocked');
    addLoginControls();
    hideAdminForNonAdmin();
    window.KFTP_AUTH={enabled:true,role:s.role,currentUser:s,requireAdmin:isAdmin,logout:()=>{let s=session()||{};localLog('Logout',{name:s.name,role:s.role,detail:'Programmatic logout'});clearSession();location.reload();}};
  }
  window.KFTP_LOCAL_AUTH={applyAccess,isAdmin,currentProfile,logout:()=>{let s=session()||{};localLog('Logout',{name:s.name,role:s.role,detail:'Programmatic logout'});clearSession();location.reload();}};
  window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{
    if(localGateDisabled()){ removeLocalOverlayOnly(); return; }
    applyAccess();
  },80));
  // In case supabase-config.js loads after this file, keep the prototype gate suppressed once Supabase mode is detected.
  setInterval(()=>{ if(localGateDisabled()) removeLocalOverlayOnly(); }, 500);
})();
