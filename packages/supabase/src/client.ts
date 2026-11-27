import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./config";

// Auth forms call Supabase from the browser so its per-IP rate limits apply to
// each visitor. Called from the server, every visitor would share one IP.
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
