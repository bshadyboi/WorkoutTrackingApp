"use client";

import { useEffect, useState } from "react";
import { SW_URL } from "@/lib/restAlert";

/** iOS silently hangs on some SW/push promises — fail visibly instead. */
function withTimeout<T>(p: Promise<T>, ms: number, step: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out: ${step}`)), ms)
    ),
  ]);
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushEnableButton() {
  const [status, setStatus] = useState<"idle" | "on" | "unsupported" | "need-install" | "error">(
    "idle"
  );
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !standalone) {
      setStatus("need-install");
      return;
    }
    void navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) setStatus("on");
    });
  }, []);

  async function enable() {
    setMsg("");
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!pub) {
      setMsg("Push keys missing on server.");
      setStatus("error");
      return;
    }
    try {
      // Permission FIRST — iOS only honors the request inside the tap gesture,
      // before any awaited work consumes the user activation.
      setMsg("Requesting permission…");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("Permission denied — enable in iPhone Settings → FitTrack.");
        setStatus("error");
        return;
      }
      setMsg("Starting service worker…");
      await navigator.serviceWorker.register(SW_URL, { scope: "/" });
      const reg = await withTimeout(
        navigator.serviceWorker.ready,
        10000,
        "service worker startup"
      );
      setMsg("Creating push subscription…");
      let sub = await withTimeout(
        reg.pushManager.getSubscription(),
        5000,
        "reading existing subscription"
      );
      if (!sub) {
        sub = await withTimeout(
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(pub),
          }),
          10000,
          "push subscribe"
        );
      }
      const json = sub.toJSON();
      setMsg("Saving to server…");
      const res = await withTimeout(
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(json),
        }),
        10000,
        "saving subscription"
      );
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Subscribe failed");
        setStatus("error");
        return;
      }
      setStatus("on");
      setMsg("Notifications on — rest timer & weekly check-ins.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
      setStatus("error");
    }
  }

  if (status === "unsupported") {
    return (
      <p className="text-[11px] text-[var(--muted)]">
        Notifications need a modern browser / Home Screen app.
      </p>
    );
  }

  if (status === "need-install") {
    return (
      <div className="card space-y-1 !py-3">
        <p className="text-sm font-semibold">Enable notifications</p>
        <p className="text-[11px] text-[var(--muted)]">
          On iPhone: open from the Home Screen icon (not Safari), then come back here to turn on
          notifications.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-2 !py-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Notifications</p>
          <p className="text-[11px] text-[var(--muted)]">
            {status === "on"
              ? "On — rest done & Sunday check-ins"
              : "Rest alerts & weekly check-ins"}
          </p>
        </div>
        {status === "on" ? (
          <span className="btn-pill bg-[var(--green)] text-[var(--on-green)]">On</span>
        ) : (
          <button type="button" className="btn-accent !px-3 !py-2 text-xs" onClick={() => void enable()}>
            Enable
          </button>
        )}
      </div>
      {msg ? <p className="text-[11px] text-[var(--muted)]">{msg}</p> : null}
    </div>
  );
}
