"use client";

import { useState } from "react";
import { PushEnableButton } from "@/components/PushEnableButton";
import { beep, primeAudio } from "@/lib/restAlert";

export function RestAlertSettings() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function testPush() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") throw new Error("Enable notifications above first. On iPhone, open FitTrack from its Home Screen icon.");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) throw new Error("No subscription on this device. Use Enable notifications above.");
      const response = await fetch("/api/push/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }), signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Test notification failed. Try again.");
      setMessage("Test accepted by the push service. Look for ‘FitTrack test’ on this device. This confirms sending, not delivery or scheduled timer timing.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send test notification.");
    } finally { setBusy(false); }
  }
  return <section className="card space-y-3" aria-labelledby="rest-alert-heading">
    <h2 id="rest-alert-heading" className="text-lg font-bold">Rest alerts</h2>
    <p className="text-sm text-[var(--muted)]">Hear a beep while FitTrack is open. Enable notifications for background rest alerts.</p>
    <PushEnableButton />
    <div className="grid gap-2 sm:grid-cols-2">
      <button type="button" className="btn-secondary min-h-11" onClick={() => { primeAudio(); beep(); setMessage("Sound test requested. If you didn't hear it, check your volume and audio output. This tests sound while FitTrack is open."); }}>Test sound</button>
      <button type="button" className="btn-secondary min-h-11" disabled={busy} onClick={() => void testPush()}>{busy ? "Sending…" : "Send test notification"}</button>
    </div>
    {message && <p role="status" className="text-sm text-[var(--blue)]">{message}</p>}
    <p className="text-xs text-[var(--muted)]">On iPhone: Safari → Share → Add to Home Screen, then open FitTrack from that icon. Allow notifications when prompted. If alerts are blocked, check iPhone Settings → Notifications → FitTrack and your Focus settings. Notification sound and delivery timing depend on iOS; this is not a Clock alarm.</p>
  </section>;
}
