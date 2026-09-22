import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getTodaysCardCandidates } from "@/lib/wealthdaily/source";

export async function GET(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({ cards: await getTodaysCardCandidates(60) });
}
