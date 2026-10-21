import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. It bypasses row level security, so only use it on the
 * server after checking who the caller is.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
