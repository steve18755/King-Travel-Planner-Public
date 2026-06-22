/* King Family Travel Planner v7.2 Dashboard Repair
   Non-invasive hotfix for the dashboard tab after Supabase login.
   It only fills the dashboard tab if the original dashboard content is blank/missing.
*/
(function(){
  'use strict';
  const PATCH_ID='kftpDashRepair';
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function arr(v){return Array.isArray(v)?v:[];}
  function firstArray(state,names){for(const n of names){if(Array.isArray(state[n]))return state[n];}return [];}
  function findDashTab(){
    let el=document.getElementById('dash') || document.getElementById('dashboard') || document.querySelector('.tab[data-tab="dash"],.tab[data-id="dash"],[data-tab-panel="dash"]');
    if(el) return el;
    const btn=[...document.querySelectorAll('[data-tab]')].find(b=>String(b.dataset.tab||'').toLowerCase()==='dash' || /dashboard/i.test(b.textContent||''));
    if(btn && btn.dataset.tab) return document.getElementById(btn.dataset.tab) || document.querySelector(`.tab[data-tab="${CSS.escape(btn.dataset.tab)}"]`);
    return null;
  }
  function getState(){return (window.KFTP && window.KFTP.state) || {};}
  function formatMoney(n){const x=Number(n||0);return x?x.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}):'$0';}
  function pickName(x){return x?.name || x?.title || x?.destination || x?.tripName || x?.label || x?.id || 'Untitled';}
  function nextTrip(trips){
    if(!trips.length) return null;
    const now=new Date();
    const scored=trips.map(t=>{
      const raw=t.startDate||t.start_date||t.departDate||t.departureDate||t.date||t.from;
      const d=raw?new Date(raw):null;
      return {t,d,score:d&&!isNaN(d)?Math.abs(d-now):Number.MAX_SAFE_INTEGER};
    }).sort((a,b)=>a.score-b.score);
    return scored[0].t;
  }
  function hasOriginalDashboardContent(tab){
    if(!tab) return false;
    const repair=tab.querySelector('#'+PATCH_ID);
    const cards=[...tab.querySelectorAll('.card,.table,.calendar,.statusGrid,.cards')].filter(x=>!repair||!repair.contains(x));
    const text=(tab.textContent||'').replace(/Plan smarter family travel\.?/i,'').trim();
    // Blank-dashboard symptom: only hero text is present and no dashboard cards/tables exist.
    return cards.length>0 || text.length>180;
  }
  function buildHtml(){
    const s=getState();
    const trips=firstArray(s,['trips','tripPlans','bookings','tripBookings','plannedTrips']);
    const destinations=firstArray(s,['destinations','destinationIdeas','bucketList']);
    const profiles=firstArray(s,['familyProfiles','profiles','people']);
    const pets=firstArray(s,['pets','dogProfiles']);
    const loyalty=firstArray(s,['loyaltyAccounts','loyaltyCards','loyaltyPrograms','airlineAwards']);
    const deals=firstArray(s,['deals','travelDeals']);
    const t=nextTrip(trips);
    const activeTrip=t?pickName(t):'No active trip selected yet';
    const tripDate=t?(t.startDate||t.start_date||t.departDate||t.departureDate||t.date||'Dates pending'):'Dates pending';
    const estBudget=t?(t.budget||t.totalBudget||t.estimatedCost||t.totalCost||0):0;
    return `
      <div id="${PATCH_ID}" class="kftpDashRepair">
        <div class="section between"><div><h2>Dashboard Overview</h2><p class="muted">Supabase login is active. This dashboard panel is restored from the current planner state while the original dashboard renderer is being stabilized.</p></div><div class="row"><button class="btn sm ghost" id="kftpDashAssetBtn">Run Asset Check</button><button class="btn sm primary" id="kftpDashSaveBtn">Save to Supabase</button></div></div>
        <div class="grid four">
          <div class="card stat"><div class="muted small">Trips / bookings</div><div class="num">${trips.length}</div><p class="muted">Tracked trip records.</p></div>
          <div class="card stat"><div class="muted small">Destinations</div><div class="num">${destinations.length}</div><p class="muted">Bucket-list and research locations.</p></div>
          <div class="card stat"><div class="muted small">Family profiles</div><div class="num">${profiles.length}</div><p class="muted">People in planner state.</p></div>
          <div class="card stat"><div class="muted small">Loyalty / awards</div><div class="num">${loyalty.length}</div><p class="muted">Cards, programs, and award records.</p></div>
        </div>
        <div class="grid three" style="margin-top:16px">
          <div class="card"><h3>Next / active trip</h3><p><b>${esc(activeTrip)}</b></p><p class="muted">${esc(tripDate)}</p><p class="muted">Estimated budget: <b>${formatMoney(estBudget)}</b></p><button class="btn sm ghost" data-kftp-open-tab="trips">Open Trips & Bookings</button></div>
          <div class="card"><h3>Family readiness</h3><p class="muted">Profiles: <b>${profiles.length}</b></p><p class="muted">Pets / dog-care profiles: <b>${pets.length}</b></p><p class="muted">Deals tracked: <b>${deals.length}</b></p><button class="btn sm ghost" data-kftp-open-tab="family">Open Family</button></div>
          <div class="card"><h3>Supabase readiness</h3><p class="muted">Use the cloud bar <b>Save</b>, <b>Load</b>, and <b>Assets</b> buttons to validate the secure backend.</p><p class="muted small">Local storage is now cache only; Supabase Auth and app.app_users control access.</p></div>
        </div>
      </div>`;
  }
  function wireButtons(root){
    const asset=root.querySelector('#kftpDashAssetBtn');
    if(asset) asset.onclick=()=>{
      if(window.KFTP_SUPABASE && typeof window.KFTP_SUPABASE.runAssetDiagnostics==='function') window.KFTP_SUPABASE.runAssetDiagnostics();
      else alert('Asset diagnostics are not loaded yet. Use the Assets button in the Supabase cloud bar.');
    };
    const save=root.querySelector('#kftpDashSaveBtn');
    if(save) save.onclick=()=>{
      if(window.KFTP_SUPABASE && typeof window.KFTP_SUPABASE.savePlannerState==='function') window.KFTP_SUPABASE.savePlannerState(true);
      else alert('Supabase bridge is not ready yet.');
    };
    root.querySelectorAll('[data-kftp-open-tab]').forEach(btn=>{
      btn.onclick=()=>{
        const id=btn.getAttribute('data-kftp-open-tab');
        if(window.KFTP && typeof window.KFTP.switchTab==='function') window.KFTP.switchTab(id);
        else {
          const nav=document.querySelector(`[data-tab="${CSS.escape(id)}"]`);
          if(nav) nav.click();
        }
      };
    });
  }
  function patchDashboard(force){
    const tab=findDashTab();
    if(!tab) return false;
    if(hasOriginalDashboardContent(tab) && !force) return true;
    let existing=tab.querySelector('#'+PATCH_ID);
    if(!existing){
      const hero=tab.querySelector('.hero');
      if(hero) hero.insertAdjacentHTML('afterend',buildHtml());
      else tab.insertAdjacentHTML('afterbegin',buildHtml());
      existing=tab.querySelector('#'+PATCH_ID);
    }else{
      existing.outerHTML=buildHtml();
      existing=tab.querySelector('#'+PATCH_ID);
    }
    if(existing) wireButtons(existing);
    return true;
  }
  function schedule(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      patchDashboard(false);
      if(tries>25) clearInterval(timer);
    },400);
    setTimeout(()=>patchDashboard(false),150);
    setTimeout(()=>patchDashboard(false),1500);
    document.addEventListener('click',e=>{
      if(e.target.closest && e.target.closest('[data-tab]')) setTimeout(()=>patchDashboard(false),80);
    });
    window.addEventListener('storage',()=>setTimeout(()=>patchDashboard(true),120));
  }
  window.KFTP_DASH_REPAIR={patchDashboard};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule); else schedule();
})();
