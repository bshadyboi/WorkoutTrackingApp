import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendRestPush, type PushSub } from "@/lib/pushSend";

export const maxDuration = 300;
export const runtime = "nodejs";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Schedule the "rest done" push.
 *
 * Primary path: publish a delayed message to QStash (Upstash-Not-Before = endsAt).
 * QStash calls /api/push/fire at that exact time — survives phone lock, app kill,
 * and long rests. No serverless sleeping involved.
 *
 * Fallback (QSTASH_TOKEN not set, e.g. local dev): the old after()+sleep approach.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    endsAt?: number;
    label?: string;
    url?: string;
  };

  const endsAt = Number(body.endsAt);
  if (!Number.isFinite(endsAt)) {
    return NextResponse.json({ error: "endsAt required" }, { status: 400 });
  }

  const label = (body.label || "").slice(0, 80);
  const url = body.url || "/train";

  // Bail early if this user has no push subscription — the client surfaces this.
  const { data: subRows } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  const subs: PushSub[] = (subRows ?? []).map((s) => ({
    endpoint: s.endpoint,
    p256dh: s.p256dh,
    auth: s.auth,
  }));

  if (!subs.length) {
    return NextResponse.json({
      ok: false,
      reason: "no_push_subscription",
      hint: "Enable notifications in Settings so rest can alert in the background",
    });
  }

  // Cancel any pending reminders for this user (new rest replaces old)
  await supabase
    .from("rest_reminders")
    .update({ cancelled: true })
    .eq("user_id", user.id)
    .eq("fired", false)
    .eq("cancelled", false);

  const { data: rem } = await supabase
    .from("rest_reminders")
    .insert({
      user_id: user.id,
      ends_at: new Date(endsAt).toISOString(),
      label,
      url,
    })
    .select("id")
    .single();

  const reminderId = (rem?.id as string | undefined) ?? null;
  if (!reminderId) {
    return NextResponse.json({ ok: false, reason: "reminder_insert_failed" });
  }

  const qstashToken = process.env.QSTASH_TOKEN;
  const fireSecret = process.env.PUSH_FIRE_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (qstashToken && fireSecret && appUrl?.startsWith("https://")) {
    // ---- Primary: QStash delayed delivery ----
    const notBefore = Math.max(Math.ceil(endsAt / 1000), Math.ceil(Date.now() / 1000));
    const target = `${appUrl.replace(/\/$/, "")}/api/push/fire`;
    try {
      const res = await fetch(`https://qstash.upstash.io/v2/publish/${target}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qstashToken}`,
          "Content-Type": "application/json",
          "Upstash-Not-Before": String(notBefore),
          "Upstash-Retries": "2",
        },
        body: JSON.stringify({ reminderId, secret: fireSecret }),
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, reason: "qstash_publish_failed" });
      }
      return NextResponse.json({ ok: true, id: reminderId, via: "qstash" });
    } catch {
      return NextResponse.json({ ok: false, reason: "qstash_unreachable" });
    }
  }

  // ---- Fallback (local dev only): sleep in after() ----
  const delay = Math.min(Math.max(0, endsAt - Date.now()), 280_000);
  const userId = user.id;
  after(async () => {
    try {
      await sleep(delay);
      try {
        const client = await createClient();
        const { data: row } = await client
          .from("rest_reminders")
          .select("cancelled, fired")
          .eq("id", reminderId)
          .maybeSingle();
        if (row?.cancelled || row?.fired) return;
      } catch {
        /* proceed anyway */
      }
      await sendRestPush(subs, label, url);
      try {
        const client = await createClient();
        await client
          .from("rest_reminders")
          .update({ fired: true })
          .eq("id", reminderId)
          .eq("user_id", userId);
      } catch {
        /* ignore */
      }
    } catch {
      /* never throw from after() */
    }
  });

  return NextResponse.json({ ok: true, id: reminderId, via: "after_fallback" });
}

/** Cancel a pending rest reminder (skip / new rest). */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (body.id) {
    await supabase
      .from("rest_reminders")
      .update({ cancelled: true })
      .eq("id", body.id)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("rest_reminders")
      .update({ cancelled: true })
      .eq("user_id", user.id)
      .eq("fired", false)
      .eq("cancelled", false);
  }

  return NextResponse.json({ ok: true });
}
