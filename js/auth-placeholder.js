// v3.1 auth bootstrap. security-local.js activates the local login gate.
(function(){
  'use strict';
  const cfg = window.KFTP_CONFIG || {};
  window.KFTP_AUTH = window.KFTP_AUTH || {
    enabled: false,
    role: 'pending_login',
    currentUser: { name: cfg.adminOwner || 'Stephen King', role: 'admin', secure: false },
    requireAdmin(){ return false; },
    explain(){ return 'v3.1 includes a local browser login gate. True protected cloud security comes with the Supabase/backend phase.'; }
  };
})();
