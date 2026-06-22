// King Family Travel Planner v7.3.2 Supabase config
// Safe to publish: the Supabase URL and anon/publishable key are meant for browser use when RLS is enabled.
// NEVER place the service_role key in this file or in GitHub.
window.KFTP_SUPABASE_CONFIG = {
  url: "https://vguuedcyfzgqbaakhurg.supabase.co",
  anonKey: "sb_publishable_iZkN-HzBToLxfgdzIScFUA_GX1hkCTo",
  mode: "supabase",
  dbSchema: "app",
  plannerStateScope: "household",
  autosaveSeconds: 60
};

(function(){
  const AUTH_SESSION_KEY='kftp_v31_auth_session';
  function esc(v){return String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function readSession(){try{return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)||'null')}catch(e){return null}}
  function householdName(s){const raw=(s&&s.household_id)||'stephen_household'; return ({stephen_household:'Stephen King Household'})[raw]||String(raw).replace(/_/g,' ');}
  function householdMembers(s){try{const hh=(s&&s.household_id)||'stephen_household'; const rows=((window.KFTP&&window.KFTP.state&&window.KFTP.state.familyProfiles)||[]).filter(p=>p.household_id===hh).map(p=>p.name||p.display_name||p.id).filter(Boolean); return rows.length?rows.join(', '):'Stephen King, Selma Ward, Ashly King';}catch(e){return 'Stephen King, Selma Ward, Ashly King';}}
  function styles(){if(document.getElementById('kftpTopUserBarRepairStyle'))return; const st=document.createElement('style'); st.id='kftpTopUserBarRepairStyle'; st.textContent='#topUserBar,.topUserBar{background:linear-gradient(90deg,#054c51,#0a7d78);color:#fff;border-radius:0 0 16px 16px;padding:12px 16px;margin:0 -24px 22px;display:flex;justify-content:space-between;align-items:center;gap:14px;box-shadow:0 8px 18px rgba(0,0,0,.12);position:relative;z-index:50}#topUserBar .topUserLeft,#topUserBar .topUserRight,.topUserBar .topUserLeft,.topUserBar .topUserRight{display:flex;align-items:center;gap:12px;flex-wrap:wrap}#topUserBar .pill,.topUserBar .pill{background:#dffbef;color:#075f41;border:0;border-radius:999px;padding:6px 10px;font-weight:900}#topUserBar .btn,.topUserBar .btn{background:#eef8fb;color:#073548;border:0;border-radius:10px;padding:8px 12px;font-weight:900;cursor:pointer}#topUserBar .small,.topUserBar .small{color:#dff6f4}#topUserBar .avatarIcon,.topUserBar .avatarIcon{background:#dff6f4;color:#073548;display:grid;place-items:center}'; document.head.appendChild(st);}
  function signOut(){if(window.KFTP_SUPABASE&&typeof window.KFTP_SUPABASE.signOut==='function'){window.KFTP_SUPABASE.signOut();return;} const b=document.getElementById('sbOut'); if(b&&typeof b.click==='function'){b.click();return;} localStorage.removeItem(AUTH_SESSION_KEY); location.reload();}
  function ensureBar(){const s=readSession(); if(!s)return; styles(); let bar=document.getElementById('topUserBar'); if(!bar){const main=document.querySelector('.main')||document.querySelector('main')||document.body; bar=document.createElement('div'); bar.id='topUserBar'; bar.className='topUserBar'; if(main.firstChild)main.insertBefore(bar,main.firstChild); else main.appendChild(bar);} bar.innerHTML='<div class="topUserLeft"><div class="avatarIcon" style="width:42px;height:42px;border-radius:16px;font-size:24px">👤</div><div><b>Logged in as</b><br><strong>'+esc(s.name||'Supabase user')+'</strong></div><span class="pill ok">'+esc(s.role||'user')+'</span><div><b>'+esc(householdName(s))+'</b><br><span class="small">'+esc(householdMembers(s))+'</span></div></div><div class="topUserRight"><span class="small"><b>View</b></span><button class="btn sm ghost" type="button">Top</button><button class="btn sm ghost" type="button">Left</button><button class="btn sm ghost" type="button">Day</button><button class="btn sm ghost" id="topSwitchUserBtn" type="button">Switch User</button><button class="btn sm ghost" id="topLogoutBtn" type="button">Logout</button></div>'; const lo=document.getElementById('topLogoutBtn'); const sw=document.getElementById('topSwitchUserBtn'); if(lo)lo.onclick=signOut; if(sw)sw.onclick=signOut;}
  document.addEventListener('DOMContentLoaded',()=>setInterval(ensureBar,700));
})();
