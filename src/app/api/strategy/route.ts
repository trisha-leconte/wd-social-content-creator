import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import StrategyProfile from "@/models/StrategyProfile";

export async function GET(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await dbConnect();
  return NextResponse.json({ profile: await StrategyProfile.findOne({ singleton: "the-one" }).lean() });
}

export async function PATCH(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await dbConnect();

  const body = await request.json();
  const allowed = ["oneStory", "voiceRules", "doNotList", "ctaRotation", "openerBank", "profileBio"] as const;
  const update = Object.fromEntries(allowed.filter((k) => k in body).map((k) => [k, body[k]]));
  const profile = await StrategyProfile.findOneAndUpdate({ singleton: "the-one" }, update, { new: true });
  return NextResponse.json({ profile });
}
