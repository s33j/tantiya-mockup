import { hasLocale } from "next-intl";
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import {
  redirectKeepingSession,
  refreshSession,
} from "@tantiya/supabase/proxy";

// Adds the locale prefix (/en, /fil), picking it from the browser on first visit.
const handleI18nRouting = createMiddleware(routing);

// Everything else, including the markets, stays open to guests.
const protectedPaths = [
  "/watchlist",
  "/bets",
  "/wallet",
  "/account",
  "/reset-password",
  "/kyc",
];

export default async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  const claims = await refreshSession(request, response);

  const [, locale, ...rest] = request.nextUrl.pathname.split("/");
  const path = `/${rest.join("/")}`;
  const isProtected = protectedPaths.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (!claims && hasLocale(routing.locales, locale) && isProtected) {
    const signIn = new URL(`/${locale}/sign-in`, request.url);
    signIn.searchParams.set("next", path + request.nextUrl.search);

    return redirectKeepingSession(response, signIn);
  }

  return response;
}

export const config = {
  // Skip API routes, Next.js internals and files with a dot (sw.js, manifest).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
