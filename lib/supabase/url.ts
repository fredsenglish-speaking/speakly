/**
 * Returns the project's base URL (https://<ref>.supabase.co) even when the
 * setting was pasted with extra parts, such as the REST path
 * (".../rest/v1/") or the dashboard link (".../dashboard/project/<ref>").
 */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return value;
  }
  if (u.hostname === "supabase.com" || u.hostname === "app.supabase.com") {
    const ref = u.pathname.match(/\/project\/([a-z0-9]+)/)?.[1];
    if (ref) return `https://${ref}.supabase.co`;
  }
  return u.origin;
}

export const SUPABASE_URL = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
