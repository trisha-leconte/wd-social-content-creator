import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { AUTH_COOKIE, signToken, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  await dbConnect();

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || !(await verifyPassword(String(password), user.passwordHash))) {
    return NextResponse.json({ error: "That email and password don't match." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, signToken(String(user._id)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
