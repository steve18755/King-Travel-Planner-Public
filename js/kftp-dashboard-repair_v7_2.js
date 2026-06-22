/* King Family Travel Planner v7.2.3 Dashboard Repair
   Simple ES5-style dashboard fallback for GitHub Pages branch deployment.
   It removes the known dashboard render notice and inserts a safe dashboard summary.
*/
(function(){
  'use strict';
  var PATCH_ID = 'kftpDashRepair';

  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>\"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }

  function getState(){
    try { return (window.KFTP && window.KFTP.state) || {}; }
    catch(e){ return {}; }
  }

  function firstArray(state, names){
    for(var i=0;i<names.length;i++){
      if(Array.isArray(state[names[i]])) return state[names[i]];
    }
    return [];
  }

  function findDashTab(){
    var el = document.getElementById('dash') || document.getElementById('dashboard');
    if(el) return el;
    var panels = document.querySelectorAll('.tab,[data-tab-panel]');
    for(var i=0;i<panels.length;i++){
      var id = (panels[i].id || '').toLowerCase();
      var dt = (panels[i].getAttribute('data-tab') || panels[i].getAttribute('data-id') || panels[i].getAttribute('data-tab-panel') || '').toLowerCase();
      if(id === 'dash' || id === 'dashboard' || dt === 'dash' || dt === 'dashboard') return panels[i];
    }
    return null;
  }

  function pickName(item){
    if(!item) return 'Untitled';
    return item.name || item.title || item.destination || item.tripName || item.label || item.id || 'Untitled';
  }

  function nextTrip(trips){
    if(!trips || !trips.length) return null;
    var best = trips[0];
    var bestScore = Number.MAX_SAFE_INTEGER || 9007199254740991;
    var now = new Date().getTime();
    for(var i=0;i<trips.length;i++){
      var t = trips[i];
      var raw = t.startDate || t.start_date || t.departDate || t.departureDate || t.date || t.from;
      var d = raw ? new Date(raw).getTime() : NaN;
      var score = !isNaN(d) ? Math.abs(d - now) : bestScore;
      if(score <= bestScore){ bestScore = score; best = t; }
    }
    return best;
  }

  function money(value){
    var n = Number(value || 0);
    if(!n) return '$0';
    try { return n.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}); }
    catch(e){ return '$' + Math.round(n); }
  }

  function isRenderRepairNotice(tab){
    var text = String(tab && tab.textContent || '').toLowerCase();
    return text.indexOf('planner render repair notice') >= 0 ||
           text.indexOf('masked is not defined') >= 0 ||
           text.indexOf('app hit a render issue') >= 0;
  }

  function hasUsefulDashboardContent(tab){
    if(!tab) return false;
    if(isRenderRepairNotice(tab)) return false;
    var repair = tab.querySelector('#' + PATCH_ID);
    var blocks = tab.querySelectorAll('.card,.table,.calendar,.statusGrid,.cards');
    for(var i=0;i<blocks.length;i++){
      if(!repair || !repair.contains(blocks[i])) return true;
    }
    var text = String(tab.textContent || '').replace(/Plan smarter family travel\.?/i,'').trim();
    return text.length > 180;
  }

  function cleanBadRenderNotice(tab){
    if(!tab || !isRenderRepairNotice(tab)) return;
    var hero = tab.querySelector('.hero');
    var children = Array.prototype.slice.call(tab.children);
    for(var i=0;i<children.length;i++){
      var child = children[i];
      if(child !== hero && child.id !== PATCH_ID) child.parentNode.removeChild(child);
    }
  }

  function buildDashboardHtml(){
    var state = getState();
    var trips = firstArray(state, ['trips','tripPlans','bookings','tripBookings','plannedTrips']);
    var destinations = firstArray(state, ['destinations','destinationIdeas','bucketList']);
    var profiles = firstArray(state, ['familyProfiles','profiles','people']);
    var pets = firstArray(state, ['pets','dogProfiles']);
    var loyalty = firstArray(state, ['loyaltyAccounts','loyaltyCards','loyaltyPrograms','airlineAwards']);
    var deals = firstArray(state, ['deals','travelDeals']);
    var trip = nextTrip(trips);
    var activeTrip = trip ? pickName(trip) : 'No active trip selected yet';
    var tripDate = trip ? (trip.startDate || trip.start_date || trip.departDate || trip.departureDate || trip.date || 'Dates pending') : 'Dates pending';
    var estBudget = trip ? (trip.budget || trip.totalBudget || trip.estimatedCost || trip.totalCost || 0) : 0;

    return '' +
      '<div id="' + PATCH_ID + '" class="kftpDashRepair">' +
      '<div class="section between"><div><h2>Dashboard Overview</h2><p class="muted">Supabase login is active. Dashboard content has been restored from the current planner state while the original dashboard renderer is stabilized.</p></div><div class="row"><button class="btn sm ghost" id="kftpDashAssetBtn">Run Asset Check</button><button class="btn sm primary" id="kftpDashSaveBtn">Save to Supabase</button></div></div>' +
      '<div class="grid four">' +
      '<div class="card stat"><div class="muted small">Trips / bookings</div><div class="num">' + trips.length + '</div><p class="muted">Tracked trip records.</p></div>' +
      '<div class="card stat"><div class="muted small">Destinations</div><div class="num">' + destinations.length + '</div><p class="muted">Bucket-list and research locations.</p></div>' +
      '<div class="card stat"><div class="muted small">Family profiles</div><div class="num">' + profiles.length + '</div><p class="muted">People in planner state.</p></div>' +
      '<div class="card stat"><div class="muted small">Loyalty / awards</div><div class="num">' + loyalty.length + '</div><p class="muted">Cards, programs, and award records.</p></div>' +
      '</div>' +
      '<div class="grid three" style="margin-top:16px">' +
      '<div class="card"><h3>Next / active trip</h3><p><b>' + escapeHtml(activeTrip) + '</b></p><p class="muted">' + escapeHtml(tripDate) + '</p><p class="muted">Estimated budget: <b>' + money(estBudget) + '</b></p><button class="btn sm ghost" data-kftp-open-tab="trips">Open Trips & Bookings</button></div>' +
      '<div class="card"><h3>Family readiness</h3><p class="muted">Profiles: <b>' + profiles.length + '</b></p><p class="muted">Pets / dog-care profiles: <b>' + pets.length + '</b></p><p class="muted">Deals tracked: <b>' + deals.length + '</b></p><button class="btn sm ghost" data-kftp-open-tab="family">Open Family</button></div>' +
      '<div class="card"><h3>Supabase readiness</h3><p class="muted">Use the cloud bar <b>Save</b>, <b>Load</b>, and <b>Assets</b> buttons to validate the secure backend.</p><p class="muted small">Local storage is cache only; Supabase Auth and app.app_users control access.</p></div>' +
      '</div>' +
      '</div>';
  }

  function wireButtons(root){
    var asset = root.querySelector('#kftpDashAssetBtn');
    if(asset){
      asset.onclick = function(){
        if(window.KFTP_SUPABASE && typeof window.KFTP_SUPABASE.runAssetDiagnostics === 'function') window.KFTP_SUPABASE.runAssetDiagnostics();
        else alert('Asset diagnostics are not loaded yet. Use the Assets button in the Supabase cloud bar.');
      };
    }
    var save = root.querySelector('#kftpDashSaveBtn');
    if(save){
      save.onclick = function(){
        if(window.KFTP_SUPABASE && typeof window.KFTP_SUPABASE.savePlannerState === 'function') window.KFTP_SUPABASE.savePlannerState(true);
        else alert('Supabase bridge is not ready yet.');
      };
    }
    var openers = root.querySelectorAll('[data-kftp-open-tab]');
    for(var i=0;i<openers.length;i++){
      openers[i].onclick = function(){
        var id = this.getAttribute('data-kftp-open-tab');
        if(window.KFTP && typeof window.KFTP.switchTab === 'function') window.KFTP.switchTab(id);
        else {
          var nav = document.querySelector('[data-tab="' + id + '"]');
          if(nav) nav.click();
        }
      };
    }
  }

  function patchDashboard(force){
    var tab = findDashTab();
    if(!tab) return false;
    cleanBadRenderNotice(tab);
    if(hasUsefulDashboardContent(tab) && !force) return true;
    var existing = tab.querySelector('#' + PATCH_ID);
    if(existing){
      existing.outerHTML = buildDashboardHtml();
    }else{
      var hero = tab.querySelector('.hero');
      if(hero) hero.insertAdjacentHTML('afterend', buildDashboardHtml());
      else tab.insertAdjacentHTML('afterbegin', buildDashboardHtml());
    }
    existing = tab.querySelector('#' + PATCH_ID);
    if(existing) wireButtons(existing);
    return true;
  }

  function schedule(){
    var tries = 0;
    var timer = setInterval(function(){
      tries += 1;
      patchDashboard(false);
      if(tries > 40) clearInterval(timer);
    }, 300);
    setTimeout(function(){patchDashboard(false);}, 100);
    setTimeout(function(){patchDashboard(true);}, 1200);
    setTimeout(function(){patchDashboard(false);}, 2500);
    document.addEventListener('click', function(e){
      var target = e.target;
      while(target && target !== document){
        if(target.getAttribute && target.getAttribute('data-tab')){
          setTimeout(function(){patchDashboard(false);}, 80);
          break;
        }
        target = target.parentNode;
      }
    });
  }

  window.KFTP_DASH_REPAIR = { patchDashboard: patchDashboard };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
})();
