export interface AppEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

const requiredSupabaseKeys: (keyof AppEnv)[] = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

export const appEnv: AppEnv = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

export function getMissingSupabaseEnvKeys(): (keyof AppEnv)[] {
  return requiredSupabaseKeys.filter((key) => !appEnv[key]);
}

export function isSupabaseEnvConfigured(): boolean {
  return getMissingSupabaseEnvKeys().length === 0;
}
