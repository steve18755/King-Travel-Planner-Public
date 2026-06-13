
// Calendar/ICS planning utility for the next secure version.
// v3.0 exposes safe helper functions, but does not yet wire automated email sending.
(function(){
  'use strict';
  const CFG = window.KFTP_CONFIG || {};
  const KEY = CFG.storageKey || 'kingTravelPlannerV30';
  const PRIOR_KEYS = CFG.priorStorageKeys || ['kingTravelPlannerV29'];
  function pad(n){ return String(n).padStart(2,'0'); }
  function icsDate(date, time){
    if(!date) return '';
    const t=(time||'09:00').split(':');
    const d=new Date(date+'T'+pad(t[0]||9)+':'+pad(t[1]||0)+':00');
    return d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+'T'+pad(d.getUTCHours())+pad(d.getUTCMinutes())+'00Z';
  }
  function escapeICS(s){ return String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n'); }
  function loadState(){
    for(const k of [KEY, ...PRIOR_KEYS]){
      try{ const raw=localStorage.getItem(k); if(raw) return JSON.parse(raw); }catch(e){}
    }
    return null;
  }
  function buildTripICS(trip, items){
    const now=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//King Family Travel Planner//v3.0//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
    const tripId=trip.id || ('trip-'+Date.now());
    lines.push('BEGIN:VEVENT');
    lines.push('UID:'+escapeICS(tripId)+'@king-family-travel-planner');
    lines.push('DTSTAMP:'+now);
    if(trip.start_date) lines.push('DTSTART;VALUE=DATE:'+trip.start_date.replaceAll('-',''));
    if(trip.end_date){
      const end=new Date(trip.end_date+'T00:00:00'); end.setDate(end.getDate()+1);
      lines.push('DTEND;VALUE=DATE:'+end.toISOString().slice(0,10).replaceAll('-',''));
    }
    lines.push('SUMMARY:'+escapeICS(trip.title||trip.name||'Family Trip'));
    lines.push('DESCRIPTION:'+escapeICS((trip.notes||'')+'\nStatus: '+(trip.status||'')));
    lines.push('END:VEVENT');
    (items||[]).forEach((it,idx)=>{
      lines.push('BEGIN:VEVENT');
      lines.push('UID:'+escapeICS(tripId+'-'+(it.id||idx))+'@king-family-travel-planner');
      lines.push('DTSTAMP:'+now);
      if(it.date) lines.push('DTSTART:'+icsDate(it.date,it.time||'09:00'));
      if(it.date) lines.push('DTEND:'+icsDate(it.date,it.end_time||it.time||'10:00'));
      lines.push('SUMMARY:'+escapeICS(it.title||'Itinerary item'));
      if(it.location) lines.push('LOCATION:'+escapeICS(it.location));
      if(it.notes) lines.push('DESCRIPTION:'+escapeICS(it.notes));
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
  function downloadTripICS(tripId){
    const state=loadState(); if(!state) return alert('No local planner data found.');
    const trip=(state.trips||[]).find(t=>t.id===tripId); if(!trip) return alert('Trip not found.');
    const items=(state.itineraryItems||state.itinerary||[]).filter(i=>i.trip_id===tripId || i.tripId===tripId);
    const ics=buildTripICS(trip,items);
    const blob=new Blob([ics],{type:'text/calendar'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=(trip.title||trip.name||'trip').replace(/[^a-z0-9]+/gi,'_').toLowerCase()+'.ics';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  window.KFTP_ICS={loadState,buildTripICS,downloadTripICS};
})();
