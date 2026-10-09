import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/auth";

// The public site (/), enquiry APIs and the Vaani webhook stay open; the team
// desk and its APIs need a session. Pages and routes re-check on their own.
export function proxy(req: NextRequest) {
  if (readSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return Response.json({ error: "unauthorised" }, { status: 401 });
  const url = new URL("/login", req.url);
  if (req.nextUrl.pathname !== "/desk") url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/desk/:path*", "/api/agent/:path*"],
};
