/* King Family Travel Planner v7.2 Supabase bridge
   Pass 1: Supabase Auth owns login/logout while preserving the family-member login UX.
   Canonical state is app.planner_state. localStorage is used only as a browser cache/runtime buffer.
*/
(function(){
  const CFG = window.KFTP_SUPABASE_CONFIG || {};
  const DB_SCHEMA = CFG.dbSchema || 'app';
  const STORAGE_KEY = (window.KFTP_CONFIG && window.KFTP_CONFIG.storageKey) || 'kingTravelPlannerV30';
  const AUTH_SESSION_KEY = 'kftp_v31_auth_session';
  const PROFILE_TO_LOCAL = {
    stephen_king:'stephen', selma_ward:'selma', ashly_king:'ashly', david_king:'david', elaire_ward:'elaire',
    joshua_king:'joshua', christine_king:'christine', daniel_king:'daniel', michael_king:'michael', quintin_king:'quintin', adelaide_king:'adelaide'
  };
  const LOCAL_TO_PROFILE = Object.fromEntries(Object.entries(PROFILE_TO_LOCAL).map(([k,v])=>[v,k]));
  const FAMILY_LOGIN_OPTIONS = [
    {local:'stephen', profile_id:'stephen_king', name:'Stephen King', role:'admin', email:'steve18755@gmail.com', aliases:['steve','stephen','steve18755','steve18755@gmail.com']},
    {local:'selma', profile_id:'selma_ward', name:'Selma Ward', role:'family', email:'', aliases:['selma']},
    {local:'ashly', profile_id:'ashly_king', name:'Ashly King', role:'family', email:'', aliases:['ashly']},
    {local:'david', profile_id:'david_king', name:'David King', role:'admin', email:'', aliases:['david']},
    {local:'elaire', profile_id:'elaire_ward', name:'Elaire Ward', role:'extended_family', email:'', aliases:['elaire']},
    {local:'joshua', profile_id:'joshua_king', name:'Joshua King', role:'extended_family', email:'', aliases:['joshua']},
    {local:'christine', profile_id:'christine_king', name:'Christine King', role:'extended_family', email:'', aliases:['christine']},
    {local:'daniel', profile_id:'daniel_king', name:'Daniel King', role:'child', email:'', aliases:['daniel']},
    {local:'michael', profile_id:'michael_king', name:'Michael King', role:'extended_family', email:'', aliases:['michael']},
    {local:'quintin', profile_id:'quintin_king', name:'Quintin King', role:'child', email:'', aliases:['quintin']},
    {local:'adelaide', profile_id:'adelaide_king', name:'Adelaide King', role:'child', email:'', aliases:['adelaide']}
  ];
  let client=null, appUser=null, initialized=false, autosaveTimer=null, expectedProfileId=null;

  function configured(){ return !!(CFG && CFG.mode !== 'local-demo' && CFG.url && CFG.anonKey && window.supabase && window.supabase.createClient); }
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function qs(sel){return document.querySelector(sel)}
  function db(){ return client && typeof client.schema === 'function' ? client.schema(DB_SCHEMA) : client; }
  function familyByLocal(local){ return FAMILY_LOGIN_OPTIONS.find(f=>f.local===local) || FAMILY_LOGIN_OPTIONS[0]; }
  function normalizeLogin(s){ return String(s||'').trim().toLowerCase(); }
  function emailLooksValid(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'')); }
  function resolveEmail(local, usernameOrEmail){
    const fam=familyByLocal(local);
    const raw=String(usernameOrEmail||'').trim();
    const norm=normalizeLogin(raw);
    if(emailLooksValid(raw)) return raw;
    const aliases=(fam.aliases||[]).map(normalizeLogin);
    if(fam.email && (aliases.includes(norm) || norm===normalizeLogin(fam.local) || norm===normalizeLogin(fam.name))) return fam.email;
    throw new Error('Enter the approved Supabase email for '+fam.name+'. For Stephen, username "steve" is mapped to steve18755@gmail.com.');
  }
  function selectedFamily(){
    const local=(document.getElementById('sbProfile')||{}).value || 'stephen';
    return familyByLocal(local);
  }
  function sessionToLocal(row){
    if(!row) return null;
    const profile = row.profiles || row.profile || {};
    const localId = PROFILE_TO_LOCAL[row.profile_id] || row.profile_id;
    const displayName =
      profile.display_name ||
      profile.name ||
      [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
      localId;
    const s = { profileId: localId, name: displayName, role: row.role, loginAt: new Date().toISOString(), supabase:true, household_id: row.household_id, profile_uuid: row.profile_id };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(s));
    window.KFTP_AUTH = { enabled:true, role:row.role, currentUser:s, requireAdmin:()=>row.role==='admin', logout:signOut };
    if(window.KFTP_LOCAL_AUTH && typeof window.KFTP_LOCAL_AUTH.applyAccess==='function'){
      setTimeout(()=>window.KFTP_LOCAL_AUTH.applyAccess(),50);
    }
    return s;
  }
  function injectStyles(){
    if(document.getElementById('kftpSupabaseStyles')) return;
    const st=document.createElement('style'); st.id='kftpSupabaseStyles';
    st.textContent=`
      .sbGate{position:fixed;inset:0;z-index:999999;background:linear-gradient(135deg,rgba(4,37,50,.88),rgba(28,95,160,.76));display:flex;align-items:center;justify-content:center;padding:24px;color:#12202b}
      .sbCard{width:min(540px,96vw);background:#fff;border-radius:26px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.35);font-family:system-ui,-apple-system,Segoe UI,sans-serif;border:1px solid rgba(255,255,255,.55)}
      .sbBrand{display:flex;gap:14px;align-items:center;margin-bottom:14px}.sbBrand span{width:58px;height:58px;border-radius:18px;background:linear-gradient(135deg,#c8fff0,#deecff);display:grid;place-items:center;font-size:32px}.sbBrand h1{margin:0;font-size:26px}.sbBrand p{margin:2px 0 0;color:#5a6f7b}
      .sbCard label{display:block;font-weight:900;color:#324c59;margin:12px 0 6px}.sbCard input,.sbCard select{width:100%;padding:13px 14px;border:1px solid #cfe0e6;border-radius:14px;font:16px system-ui;background:#fff}.sbRow{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.sbBtn{border:0;border-radius:12px;padding:12px 16px;font-weight:900;cursor:pointer;background:#0a7d87;color:#fff}.sbBtn.secondary{background:#edf6f8;color:#0a4550}.sbMsg{margin-top:12px;padding:10px 12px;border-radius:12px;background:#f4f8fa;color:#244}.sbWarn{background:#fff5d8;color:#5a4300}.sbErr{background:#ffe3e3;color:#7a1111}.sbHint{font-size:12px;color:#647887;margin-top:10px;line-height:1.35}
      .sbCloudBar{position:fixed;right:14px;bottom:14px;z-index:99998;background:#fff;border:1px solid #cfe0e6;border-radius:18px;box-shadow:0 12px 32px rgba(0,0,0,.16);padding:10px 12px;display:flex;align-items:center;gap:8px;font:13px system-ui}.sbCloudBar button{border:0;border-radius:10px;padding:8px 10px;font-weight:800;cursor:pointer}.sbCloudBar .save{background:#0a7d87;color:#fff}.sbCloudBar .load{background:#edf6f8;color:#0a4550}.sbCloudBar .out{background:#ffe9e9;color:#7a1111}.sbStatusDot{width:10px;height:10px;border-radius:99px;background:#bbb}.sbStatusDot.ok{background:#10b981}.sbStatusDot.warn{background:#f59e0b}.sbStatusDot.err{background:#ef4444}
    `;
    document.head.appendChild(st);
  }
  function removeLocalGate(){ const o=document.getElementById('authOverlay'); if(o) o.remove(); document.body.classList.remove('authLocked'); }
  function familyOptions(){ return FAMILY_LOGIN_OPTIONS.map(f=>`<option value="${esc(f.local)}">${esc(f.name)} — secure login</option>`).join(''); }
  function showGate(message, kind){
    injectStyles(); removeLocalGate();
    let gate=document.getElementById('sbGate');
    if(!gate){
      gate=document.createElement('div'); gate.id='sbGate'; gate.className='sbGate';
      gate.innerHTML=`<div class="sbCard"><div class="sbBrand"><span>🛡️</span><div><h1>King Family Travel Planner</h1><p>Supabase secure family login</p></div></div><form id="sbLoginForm"><label>Family member</label><select id="sbProfile" name="profileId">${familyOptions()}</select><label>Username / email</label><input id="sbUsername" type="text" autocomplete="username" required placeholder="steve or approved email"><label>Password</label><input id="sbPassword" type="password" autocomplete="current-password" required placeholder="Supabase password"><div class="sbRow"><button class="sbBtn" type="submit">Continue</button><button class="sbBtn secondary" type="button" id="sbSignup">Create account</button><button class="sbBtn secondary" type="button" id="sbMagic">Email magic link</button></div><div id="sbMsg" class="sbMsg">Select your family member and sign in with the approved Supabase account.</div><p class="sbHint">Stephen username: <b>steve</b>. Other family members can use their approved Supabase email after the profile is linked and approved in <code>app.app_users</code>.</p></form></div>`;
      document.body.appendChild(gate);
      const profile=document.getElementById('sbProfile');
      const username=document.getElementById('sbUsername');
      profile.onchange=()=>{
        const fam=selectedFamily();
        if(fam.local==='stephen' && !username.value.trim()) username.value='steve';
        else if(fam.email && !username.value.trim()) username.value=fam.email;
      };
      if(!username.value.trim()) username.value='steve';
      document.getElementById('sbLoginForm').onsubmit=async e=>{e.preventDefault(); const fam=selectedFamily(); await signIn(fam.local, username.value, document.getElementById('sbPassword').value);};
      document.getElementById('sbSignup').onclick=async()=>{const fam=selectedFamily(); await signUp(fam.local, username.value, document.getElementById('sbPassword').value);};
      document.getElementById('sbMagic').onclick=async()=>{const fam=selectedFamily(); await magic(fam.local, username.value);};
    }
    if(message) setMsg(message,kind);
  }
  function setMsg(text,kind){const m=document.getElementById('sbMsg'); if(m){m.className='sbMsg '+(kind==='error'?'sbErr':kind==='warn'?'sbWarn':''); m.textContent=text;}}
  async function signIn(local,username,password){
    try{
      const fam=familyByLocal(local);
      expectedProfileId=fam.profile_id || LOCAL_TO_PROFILE[local];
      const email=resolveEmail(local,username);
      setMsg('Signing in as '+fam.name+'...');
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error){setMsg(error.message,'error');return;}
      await completeLogin(true, expectedProfileId);
    }catch(e){setMsg(e.message||String(e),'error');}
  }
  async function signUp(local,username,password){
    try{
      const fam=familyByLocal(local);
      expectedProfileId=fam.profile_id || LOCAL_TO_PROFILE[local];
      const email=resolveEmail(local,username);
      if(!password || password.length<8){setMsg('Password must be at least 8 characters.','error');return;}
      setMsg('Creating Supabase account for '+fam.name+'...');
      const {error}=await client.auth.signUp({email,password,options:{data:{profile_id:expectedProfileId, family_member:fam.local, display_name:fam.name}, emailRedirectTo:location.href.split('#')[0]}});
      if(error){setMsg(error.message,'error');return;}
      setMsg('Account created. If email confirmation is enabled, confirm the email. Then the account must be linked/approved in app.app_users before login completes.','warn');
    }catch(e){setMsg(e.message||String(e),'error');}
  }
  async function magic(local,username){
    try{
      const fam=familyByLocal(local);
      expectedProfileId=fam.profile_id || LOCAL_TO_PROFILE[local];
      const email=resolveEmail(local,username);
      setMsg('Sending magic link to '+email+'...');
      const {error}=await client.auth.signInWithOtp({email, options:{emailRedirectTo:location.href.split('#')[0], data:{profile_id:expectedProfileId, family_member:fam.local}}});
      if(error){setMsg(error.message,'error');return;}
      setMsg('Magic link sent. Check email.','warn');
    }catch(e){setMsg(e.message||String(e),'error');}
  }
  async function fetchAppUser(){
    const {data:userData,error:userError}=await client.auth.getUser();
    if(userError) throw userError;
    const user = userData && userData.user;
    if(!user) throw new Error('No active Supabase Auth user session.');

    const {data,error}=await db()
      .from('app_users')
      .select('auth_user_id,profile_id,household_id,role,approved')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if(error) throw error;
    if(!data) throw new Error('This login exists in Supabase Auth, but it is not linked in app.app_users yet.');
    if(!data.approved) throw new Error('This login exists, but it is not approved in app.app_users yet.');
    if(expectedProfileId && data.profile_id !== expectedProfileId){
      try{await client.auth.signOut();}catch(e){}
      throw new Error('This Supabase account is linked to '+data.profile_id+', not '+expectedProfileId+'. Select the correct family member or use the correct account.');
    }

    try{
      const {data:profile,error:profileError}=await db()
        .from('profiles')
        .select('*')
        .eq('id', data.profile_id)
        .maybeSingle();
      if(!profileError) data.profiles = profile || {};
    }catch(e){
      data.profiles = {};
    }
    return data;
  }
  async function completeLogin(reload, expected){
    try{
      if(expected) expectedProfileId=expected;
      appUser = await fetchAppUser();
      sessionToLocal(appUser);
      await loadPlannerState(false);
      await logAudit('login','Supabase login completed');
      removeLocalGate();
      const gate=document.getElementById('sbGate'); if(gate) gate.remove();
      injectCloudBar();
      if(reload) location.reload();
    }catch(e){
      showGate(e.message || String(e),'error');
    }
  }
  async function loadPlannerState(showAlert){
    if(!appUser) appUser=await fetchAppUser();
    const scope=CFG.plannerStateScope || 'household';
    let q=db().from('planner_state').select('*').eq('scope',scope).order('updated_at',{ascending:false}).limit(1);
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
    const row={scope, household_id: scope==='household'?appUser.household_id:null, owner_profile_id: scope==='user'?appUser.profile_id:null, state: liveState, version:'v7.2', updated_by:(await client.auth.getUser()).data.user.id, updated_at:new Date().toISOString()};
    const {error}=await db().from('planner_state').upsert(row,{onConflict:'scope,household_id,owner_profile_id'});
    if(error) throw error;
    await logAudit('planner_state_save','Saved full planner state to Supabase');
    setCloudStatus('ok','Saved to Supabase '+new Date().toLocaleTimeString());
    if(showAlert) alert('Saved to Supabase.');
  }
  async function logAudit(action,detail){
    try{await db().from('audit_log').insert({actor_user_id:(await client.auth.getUser()).data.user.id, actor_profile_id:appUser&&appUser.profile_id, household_id:appUser&&appUser.household_id, action, table_name:null, detail:{message:detail, url:location.href.split('#')[0]}});}catch(e){}
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
    client=window.supabase.createClient(CFG.url, CFG.anonKey, {db:{schema:DB_SCHEMA}, auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}});
    setInterval(()=>{ if(!appUser) removeLocalGate(); }, 250);
    const {data}=await client.auth.getSession();
    if(!data.session){ showGate('Select Stephen King and sign in with username steve.'); return; }
    await completeLogin(false);
    startAutosave();
  }
  window.KFTP_SUPABASE = { init, savePlannerState, loadPlannerState, signOut, get client(){return client}, get appUser(){return appUser} };
  window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>init().catch(e=>showGate(e.message||String(e),'error')),120));
})();
