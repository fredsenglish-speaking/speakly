import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./url";

/**
 * Service-role client. It bypasses row level security, so only use it on the
 * server after checking who the caller is.
 */
export function createAdminClient() {
  return createClient(SUPABASE_URL, (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
