import { NextResponse } from "next/server";

/** Coaching push endpoint retired — app is athlete-only. */
export async function POST() {
  return NextResponse.json(
    { error: "Coaching notifications are no longer available." },
    { status: 410 }
  );
}
