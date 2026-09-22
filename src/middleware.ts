import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Kept in step with AUTH_COOKIE in @/lib/auth. Not imported from there
// because that module pulls in jsonwebtoken and bcryptjs, neither of which
// runs on the edge runtime.
const AUTH_COOKIE = "live_it_token";

async function isValid(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return Boolean(payload.sub);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  // Verify the signature, not merely the cookie's presence — a presence
  // check lets any forged value through.
  if (!token || !(await isValid(token))) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (token) response.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
