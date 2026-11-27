import {
  createProxyClient,
  redirectKeepingSession,
} from "@tantiya/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";
import { paths } from "./lib/paths";

// Every staff page needs: a signed-in user (S1), a staff role, and two-step
// sign-in (S2/S3, aal2). The database enforces the same rules (row level
// security and the staff functions need aal2), so this only routes people to
// the right screen.
export default async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createProxyClient(request, response);
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const path = request.nextUrl.pathname;

  const goTo = (target: string) =>
    path === target
      ? response
      : redirectKeepingSession(response, new URL(target, request.url));

  if (!claims) return goTo(paths.signIn);

  // Staff can read their own roles before two-step sign-in.
  const { data: roles } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", claims.sub);

  if (!roles?.length) return goTo(paths.notStaff);
  if (claims.aal !== "aal2") return goTo(paths.twoStep);

  const entryPages: string[] = [paths.signIn, paths.notStaff, paths.twoStep];
  if (entryPages.includes(path)) return goTo(paths.home);

  return response;
}

export const config = {
  // Skip API routes, Next.js internals and files with a dot.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
