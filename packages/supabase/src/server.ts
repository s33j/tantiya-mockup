import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabaseKey, supabaseUrl } from "./config";

export async function createClient() {
  // The client reads the clock (Date.now) when it loads the session. Partial
  // prefetching can render with cookies but no request; wait for a real one so
  // that read never happens while prerendering ("Blocking Route" warning).
  await connection();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components can't set cookies; the proxy refreshes the session.
        }
      },
    },
  });
}
