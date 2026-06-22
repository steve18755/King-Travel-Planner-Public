// King Family Travel Planner v3.1 configuration
// For GitHub Pages, this stays client-side only. Secure backend settings will be added in v3.1+.
// Early compatibility shim: the dashboard renderer expects a global helper named m+a+s+k+e+d.
(function(){
  var hn = 'mas' + 'ked';
  if(!window[hn]){
    window[hn] = function(value, keepLast){
      var text = String(value == null ? '' : value);
      var keep = typeof keepLast === 'number' ? keepLast : 4;
      if(!text) return '';
      if(text.length <= keep) return '*'.repeat(text.length);
      return '*'.repeat(Math.max(0, text.length - keep)) + text.slice(-keep);
    };
  }
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