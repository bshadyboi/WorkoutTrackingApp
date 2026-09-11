import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendRestPush, type PushSub } from "@/lib/pushSend";

export const runtime = "nodejs";

/**
 * Called by QStash at exactly endsAt (Upstash-Not-Before).
 * No cookies here — uses the service-role key, gated by a shared secret.
 */
export async function POST(req: Request) {
  const secret = process.env.PUSH_FIRE_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !serviceKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    secret?: string;
    reminderId?: string;
  };

  if (body.secret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!body.reminderId) {
    return NextResponse.json({ error: "reminderId required" }, { status: 400 });
  }

  const admin = createAdminClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rem } = await admin
    .from("rest_reminders")
    .select("user_id, label, url, cancelled, fired")
    .eq("id", body.reminderId)
    .maybeSingle();

  // Skipped set / new rest started / already fired → do nothing
  if (!rem || rem.cancelled || rem.fired) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { data: subRows } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", rem.user_id);

  const subs: PushSub[] = (subRows ?? []).map((s) => ({
    endpoint: s.endpoint,
    p256dh: s.p256dh,
    auth: s.auth,
  }));

  const sent = await sendRestPush(subs, rem.label ?? "", rem.url ?? "/train");

  await admin
    .from("rest_reminders")
    .update({ fired: true })
    .eq("id", body.reminderId);

  return NextResponse.json({ ok: true, sent });
}
