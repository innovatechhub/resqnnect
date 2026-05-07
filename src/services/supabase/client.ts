import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { appEnv, getSupabaseEnvIssues } from '../../lib/env';

let client: SupabaseClient | null = null;
let hasLoggedEnvIssue = false;

function logEnvIssueOnce(): void {
  if (hasLoggedEnvIssue) {
    return;
  }

  hasLoggedEnvIssue = true;
  const issues = getSupabaseEnvIssues();
  console.warn(`[Supabase] Environment configuration issue: ${issues.join(' ')} Client not initialized.`);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client) {
    return client;
  }

  const issues = getSupabaseEnvIssues();
  if (issues.length > 0) {
    logEnvIssueOnce();
    return null;
  }

  client = createClient(appEnv.VITE_SUPABASE_URL!, appEnv.VITE_SUPABASE_ANON_KEY!);
  return client;
}
