/* King Family Travel Planner v7.0 Supabase bridge
   Purpose: move the working single-file planner from local-only data to Supabase-backed login and online state.
   Canonical state is app.planner_state. localStorage is used only as a browser cache/runtime buffer.
*/
(function(){
  const CFG = window.KFTP_SUPABASE_CONFIG || {};
  const STORAGE_KEY = (window.KFTP_CONFIG && window.KFTP_CONFIG.storageKey) || 'kingTravelPlannerV30';
  const AUTH_SESSION_KEY = 'kftp_v31_auth_session';
  const PROFILE_TO_LOCAL = {
    stephen_king:'stephen', selma_ward:'selma', ashly_king:'ashly', david_king:'david', elaire_ward:'elaire',
    joshua_king:'joshua', christine_king:'christine', daniel_king:'daniel', michael_king:'michael', quintin_king:'quintin', adelaide_king:'adelaide'
  };
  const LOCAL_TO_PROFILE = Object.fromEntries(Object.entries(PROFILE_TO_LOCAL).map(([k,v])=>[v,k]));
  let client=null, appUser=null, initialized=false, autosaveTimer=null;
  function configured(){ return !!(CFG && CFG.mode !== 'local-demo' && CFG.url && CFG.anonKey && window.supabase && window.supabase.createClient); }
  function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function qs(sel){return document.querySelector(sel)}
  function sessionToLocal(row){
    if(!row) return null;
    const localId = PROFILE_TO_LOCAL[row.profile_id] || row.profile_id;
    const name = (row.profiles && row.profiles.display_name) || localId;
    const s = { profileId: localId, name, role: row.role, loginAt: new Date().toISOString(), supabase:true, household_id: row.household_id, profile_uuid: row.profile_id };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(s));
    window.KFTP_AUTH = { enabled:true, role:row.role, currentUser:s, requireAdmin:()=>row.role==='admin', logout:signOut };
    return s;
  }
  function injectStyles(){
    if(document.getElementById('kftpSupabaseStyles')) return;
    const st=document.createElement('style'); st.id='kftpSupabaseStyles';
    st.textContent=`
      .sbGate{position:fixed;inset:0;z-index:999999;background:linear-gradient(135deg,#073f4c,#0a766e);display:flex;align-items:center;justify-content:center;padding:24px;color:#12202b}
      .sbCard{width:min(520px,96vw);background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.35);font-family:system-ui,-apple-system,Segoe UI,sans-serif}
      .sbCard h1{margin:0 0 6px;font-size:28px}.sbCard p{color:#4b6372}.sbCard label{display:block;font-weight:700;margin:14px 0 6px}.sbCard input{width:100%;padding:13px 14px;border:1px solid #cfe0e6;border-radius:12px;font:16px system-ui}.sbRow{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.sbBtn{border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer;background:#0a7d87;color:#fff}.sbBtn.secondary{background:#edf6f8;color:#0a4550}.sbMsg{margin-top:12px;padding:10px 12px;border-radius:12px;background:#f4f8fa;color:#244}.sbWarn{background:#fff5d8;color:#5a4300}.sbErr{background:#ffe3e3;color:#7a1111}.sbCloudBar{position:fixed;right:14px;bottom:14px;z-index:99998;background:#fff;border:1px solid #cfe0e6;border-radius:18px;box-shadow:0 12px 32px rgba(0,0,0,.16);padding:10px 12px;display:flex;align-items:center;gap:8px;font:13px system-ui}.sbCloudBar button{border:0;border-radius:10px;padding:8px 10px;font-weight:800;cursor:pointer}.sbCloudBar .save{background:#0a7d87;color:#fff}.sbCloudBar .load{background:#edf6f8;color:#0a4550}.sbCloudBar .out{background:#ffe9e9;color:#7a1111}.sbStatusDot{width:10px;height:10px;border-radius:99px;background:#bbb}.sbStatusDot.ok{background:#10b981}.sbStatusDot.warn{background:#f59e0b}.sbStatusDot.err{background:#ef4444}
    `;
    document.head.appendChild(st);
  }
  function removeLocalGate(){ const o=document.getElementById('authOverlay'); if(o) o.remove(); document.body.classList.remove('authLocked'); }
  function showGate(message, kind){
    injectStyles(); removeLocalGate();
    let gate=document.getElementById('sbGate');
    if(!gate){
      gate=document.createElement('div'); gate.id='sbGate'; gate.className='sbGate';
      gate.innerHTML=`<div class="sbCard"><h1>King Family Travel Planner</h1><p>Secure Supabase login</p><form id="sbLoginForm"><label>Email</label><input id="sbEmail" type="email" autocomplete="email" required placeholder="name@example.com"><label>Password</label><input id="sbPassword" type="password" autocomplete="current-password" required placeholder="Password"><div class="sbRow"><button class="sbBtn" type="submit">Sign in</button><button class="sbBtn secondary" type="button" id="sbSignup">Create account</button><button class="sbBtn secondary" type="button" id="sbMagic">Email magic link</button></div><div id="sbMsg" class="sbMsg">Sign in with the account approved in Supabase.</div></form></div>`;
      document.body.appendChild(gate);
      document.getElementById('sbLoginForm').onsubmit=async e=>{e.preventDefault(); await signIn(document.getElementById('sbEmail').value, document.getElementById('sbPassword').value);};
      document.getElementById('sbSignup').onclick=async()=>{await signUp(document.getElementById('sbEmail').value, document.getElementById('sbPassword').value);};
      document.getElementById('sbMagic').onclick=async()=>{await magic(document.getElementById('sbEmail').value);};
    }
    if(message) setMsg(message,kind);
  }
  function setMsg(text,kind){const m=document.getElementById('sbMsg'); if(m){m.className='sbMsg '+(kind==='error'?'sbErr':kind==='warn'?'sbWarn':''); m.textContent=text;}}
  async function signIn(email,password){
    setMsg('Signing in...');
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error){setMsg(error.message,'error');return;}
    await completeLogin(true);
  }
  async function signUp(email,password){
    setMsg('Creating account...');
    const {error}=await client.auth.signUp({email,password});
    if(error){setMsg(error.message,'error');return;}
    setMsg('Account created. If email confirmation is enabled, confirm the email. Then ask an admin to link/approve the profile in app.app_users.','warn');
  }
  async function magic(email){
    setMsg('Sending magic link...');
    const {error}=await client.auth.signInWithOtp({email, options:{emailRedirectTo:location.href.split('#')[0]}});
    if(error){setMsg(error.message,'error');return;}
    setMsg('Magic link sent. Check email.','warn');
  }
  async function fetchAppUser(){
    const {data,error}=await client.from('app_users').select('auth_user_id,profile_id,household_id,role,approved,profiles(display_name)').single();
    if(error) throw error;
    if(!data || !data.approved) throw new Error('This login exists, but it is not linked/approved in app.app_users yet.');
    return data;
  }
  async function completeLogin(reload){
    try{
      appUser = await fetchAppUser();
      sessionToLocal(appUser);
      await loadPlannerState(false);
      await logAudit('login','Supabase login completed');
      removeLocalGate();
      injectCloudBar();
      if(reload) location.reload();
    }catch(e){
      showGate(e.message || String(e),'error');
    }
  }
  async function loadPlannerState(showAlert){
    if(!appUser) appUser=await fetchAppUser();
    const scope=CFG.plannerStateScope || 'household';
    let q=client.from('planner_state').select('*').eq('scope',scope).order('updated_at',{ascending:false}).limit(1);
    if(scope==='household') q=q.eq('household_id',appUser.household_id);
    if(scope==='user') q=q.eq('owner_profile_id',appUser.profile_id);
    const {data,error}=await q;
    if(error) throw error;
    if(data && data[0] && data[0].state){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data[0].state));
      setCloudStatus('ok','Loaded from Supabase '+new Date(data[0].updated_at).toLocaleString());
      if(showAlert) alert('Loaded planner state from Supabase. The page will refresh.');
      if(showAlert) location.reload();
      return true;
    }
    setCloudStatus('warn','No Supabase planner state found yet. Use Save to Supabase after verifying the current data.');
    return false;
  }
  async function savePlannerState(showAlert){
    if(!appUser) appUser=await fetchAppUser();
    const liveState=(window.KFTP && window.KFTP.state) || JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    const scope=CFG.plannerStateScope || 'household';
    const row={scope, household_id: scope==='household'?appUser.household_id:null, owner_profile_id: scope==='user'?appUser.profile_id:null, state: liveState, version:'v7.0', updated_by:(await client.auth.getUser()).data.user.id, updated_at:new Date().toISOString()};
    const {error}=await client.from('planner_state').upsert(row,{onConflict:'scope,household_id,owner_profile_id'});
    if(error) throw error;
    await logAudit('planner_state_save','Saved full planner state to Supabase');
    setCloudStatus('ok','Saved to Supabase '+new Date().toLocaleTimeString());
    if(showAlert) alert('Saved to Supabase.');
  }
  async function logAudit(action,detail){
    try{await client.from('audit_log').insert({actor_user_id:(await client.auth.getUser()).data.user.id, actor_profile_id:appUser&&appUser.profile_id, household_id:appUser&&appUser.household_id, action, table_name:null, detail:{message:detail, url:location.href.split('#')[0]}});}catch(e){}
  }
  function injectCloudBar(){
    injectStyles();
    let bar=document.getElementById('sbCloudBar');
    if(!bar){bar=document.createElement('div');bar.id='sbCloudBar';bar.className='sbCloudBar';document.body.appendChild(bar);}
    bar.innerHTML=`<span id="sbDot" class="sbStatusDot warn"></span><span id="sbText">Supabase connected</span><button class="save" id="sbSave">Save</button><button class="load" id="sbLoad">Load</button><button class="out" id="sbOut">Sign out</button>`;
    document.getElementById('sbSave').onclick=()=>savePlannerState(true).catch(e=>{setCloudStatus('err',e.message);alert(e.message);});
    document.getElementById('sbLoad').onclick=()=>loadPlannerState(true).catch(e=>{setCloudStatus('err',e.message);alert(e.message);});
    document.getElementById('sbOut').onclick=signOut;
  }
  function setCloudStatus(kind,text){const d=document.getElementById('sbDot'), t=document.getElementById('sbText'); if(d)d.className='sbStatusDot '+(kind||''); if(t)t.textContent=text||'';}
  async function signOut(){try{await logAudit('logout','Supabase logout'); await client.auth.signOut();}catch(e){} localStorage.removeItem(AUTH_SESSION_KEY); location.reload();}
  function startAutosave(){
    const secs=Number(CFG.autosaveSeconds||0); if(!secs || secs<20) return;
    if(autosaveTimer) clearInterval(autosaveTimer);
    autosaveTimer=setInterval(()=>savePlannerState(false).catch(e=>setCloudStatus('err','Autosave failed: '+e.message)), secs*1000);
  }
  async function init(){
    if(initialized) return; initialized=true;
    if(!configured()){ console.warn('KFTP Supabase bridge not configured. Using public-safe local demo mode.'); return; }
    injectStyles();
    client=window.supabase.createClient(CFG.url, CFG.anonKey, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}});
    // Remove local gate that may be inserted by the prototype auth script.
    setInterval(()=>{ if(!appUser) removeLocalGate(); }, 250);
    const {data}=await client.auth.getSession();
    if(!data.session){ showGate('Sign in to load the secure online planner.'); return; }
    await completeLogin(false);
    startAutosave();
  }
  window.KFTP_SUPABASE = { init, savePlannerState, loadPlannerState, signOut, get client(){return client}, get appUser(){return appUser} };
  window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>init().catch(e=>showGate(e.message||String(e),'error')),120));
})();
