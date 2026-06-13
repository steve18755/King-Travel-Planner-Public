// King Family Travel Planner v3.1 configuration
// For GitHub Pages, this stays client-side only. Secure backend settings will be added in v3.1+.
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
