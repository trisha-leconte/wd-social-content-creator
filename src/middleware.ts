import { NextResponse, type NextRequest } from "next/server";

// Presence check only — middleware runs on the edge runtime, where the
// jsonwebtoken verify path is unavailable. Routes verify the signature.
const AUTH_COOKIE = "live_it_token";

export function middleware(request: NextRequest) {
  if (!request.cookies.get(AUTH_COOKIE)?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
