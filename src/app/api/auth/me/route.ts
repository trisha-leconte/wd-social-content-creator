import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { currentUserId } from "@/lib/auth";

export async function GET(request: Request) {
  const id = currentUserId(request);
  if (!id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  await dbConnect();
  const user = await User.findById(id).select("email name");
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  return NextResponse.json({ email: user.email, name: user.name ?? null });
}
