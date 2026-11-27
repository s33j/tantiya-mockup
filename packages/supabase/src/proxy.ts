import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseKey, supabaseUrl } from "./config";

// A client for the proxy: reads the session from the request and writes any
// refreshed session onto the response.
export function createProxyClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });
}

// Refreshes an expiring session onto the response and returns the user's verified
// claims, or null for a guest.
export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
) {
  const { data } = await createProxyClient(request, response).auth.getClaims();
  return data?.claims ?? null;
}

// A redirect that keeps the refreshed session cookies and their no-cache
// headers from the response the proxy would otherwise have returned.
export function redirectKeepingSession(response: NextResponse, url: URL) {
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
