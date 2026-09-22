import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

/**
 * Verify the session inside a Server Component.
 *
 * The middleware already rejects unsigned tokens, but pages must not depend
 * on it alone: a change to the matcher would silently expose every screen.
 * Each protected page calls this, so authentication is enforced where the
 * data is actually read.
 */
export async function requireUserId(): Promise<string> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const userId = token ? verifyToken(token) : null;
  if (!userId) redirect("/login");
  return userId;
}
