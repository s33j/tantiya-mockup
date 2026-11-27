import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@tantiya/supabase/config";

// Secret key: bypasses row level security. Server code only, for the steps a
// user may not do themselves (attaching a KYC session, recording webhooks).
export function createAdminClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
