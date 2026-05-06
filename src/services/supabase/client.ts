import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { appEnv, getMissingSupabaseEnvKeys } from '../../lib/env';

let client: SupabaseClient | null = null;
let hasLoggedMissingEnv = false;

function logMissingEnvOnce(): void {
  if (hasLoggedMissingEnv) {
    return;
  }

  hasLoggedMissingEnv = true;
  const missing = getMissingSupabaseEnvKeys();
  console.warn(`[Supabase] Missing environment variables: ${missing.join(', ')}. Client not initialized.`);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client) {
    return client;
  }

  const missing = getMissingSupabaseEnvKeys();
  if (missing.length > 0) {
    logMissingEnvOnce();
    return null;
  }

  client = createClient(appEnv.VITE_SUPABASE_URL!, appEnv.VITE_SUPABASE_ANON_KEY!);
  return client;
}
