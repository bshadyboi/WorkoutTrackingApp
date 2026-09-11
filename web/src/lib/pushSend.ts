import webpush from "web-push";

export type PushSub = { endpoint: string; p256dh: string; auth: string };

export function configureVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@fittrack.app";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  return true;
}

export async function sendRestPush(subs: PushSub[], label: string, url: string) {
  if (!configureVapid() || !subs.length) return 0;
  const payload = JSON.stringify({
    title: "Rest done",
    body: label ? `Time for your next set · ${label}` : "Time for your next set",
    url: url || "/train",
    tag: "fittrack-rest", // same tag as foreground alert → replaces, never doubles
    requireInteraction: true,
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60, urgency: "high" }
      );
      sent += 1;
    } catch {
      /* dead endpoint — ignore */
    }
  }
  return sent;
}
