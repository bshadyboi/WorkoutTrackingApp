import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in again to test notifications." }, { status: 401 });
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: "Push notifications are not configured on the server yet." }, { status: 503 });
  let endpoint: unknown;
  try { endpoint = (await req.json()).endpoint; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof endpoint !== "string" || endpoint.length > 4096) return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  // Only send to this signed-in user's already saved device subscription.
  const { data: sub, error } = await db.from("push_subscriptions").select("endpoint,p256dh,auth")
    .eq("user_id", user.id).eq("endpoint", endpoint).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not read notification settings. Try enabling notifications again." }, { status: 503 });
  if (!sub) return NextResponse.json({ error: "This device isn't registered for your account. Enable notifications again." }, { status: 404 });
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@fittrack.app", pub, priv);
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({
      title: "FitTrack test", body: "Your rest-alert test arrived. You're ready to check alerts during a workout.",
      tag: "fittrack-test", url: "/settings",
    }), { TTL: 60, timeout: 10000 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = (error as { statusCode?: number }).statusCode;
    return NextResponse.json({ error: code === 404 || code === 410 ? "This subscription expired. Re-enable notifications and try again." : "Push service rejected the test. Check server configuration and try again." }, { status: 502 });
  }
}
