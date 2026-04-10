import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy (formerly middleware) — runs on every matched request.
 *
 * Responsibilities:
 *  1. Refresh the Supabase session cookie (keeps the user logged in).
 *  2. Protect dashboard routes — redirect unauthenticated users to /login.
 */
export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  // TODO: integrate Supabase session refresh here once AUTH_SECRET is set.
  // Example with @supabase/ssr:
  //   const supabase = createServerClient(url, key, { cookies: ... });
  //   const { data: { session } } = await supabase.auth.getSession();
  //   if (!session && req.nextUrl.pathname.startsWith("/")) {
  //     return NextResponse.redirect(new URL("/login", req.url));
  //   }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *  - _next/static  (static assets)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
