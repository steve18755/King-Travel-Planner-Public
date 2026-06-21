// King Family Travel Planner v7.0 Supabase config
// Safe to publish: the Supabase URL and anon/publishable key are meant for browser use when RLS is enabled.
// NEVER place the service_role key in this file or in GitHub.
window.KFTP_SUPABASE_CONFIG = {
  url: "",        // Example: "https://your-project.supabase.co"
  anonKey: "",    // Project Settings > API > anon/public or publishable key
  mode: "supabase", // "supabase" or "local-demo"
  plannerStateScope: "household", // household recommended for family shared planner data
  autosaveSeconds: 60
};
