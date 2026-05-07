export interface AppEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

const requiredSupabaseKeys: (keyof AppEnv)[] = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const supabaseServicePathPattern = /^\/(?:auth|rest|storage|functions)\/v\d+\/?$/;

export const appEnv: AppEnv = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

export function getMissingSupabaseEnvKeys(): (keyof AppEnv)[] {
  return requiredSupabaseKeys.filter((key) => !appEnv[key]);
}

export function getSupabaseEnvIssues(): string[] {
  const issues = getMissingSupabaseEnvKeys().map((key) => `Missing ${key}.`);
  const supabaseUrl = appEnv.VITE_SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    return issues;
  }

  try {
    const parsedUrl = new URL(supabaseUrl);
    const hasServicePath = supabaseServicePathPattern.test(parsedUrl.pathname);
    if (hasServicePath || parsedUrl.pathname !== '/') {
      issues.push('VITE_SUPABASE_URL must be the project base URL, for example https://project-ref.supabase.co.');
    }
  } catch {
    issues.push('VITE_SUPABASE_URL must be a valid absolute URL.');
  }

  return issues;
}

export function isSupabaseEnvConfigured(): boolean {
  return getSupabaseEnvIssues().length === 0;
}
