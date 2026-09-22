import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const AUTH_COOKIE = "live_it_token";
const EXPIRY = "7d";

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: EXPIRY });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, secret());
    return typeof payload === "object" && payload.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function currentUserId(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
  return match ? verifyToken(match[1]) : null;
}
