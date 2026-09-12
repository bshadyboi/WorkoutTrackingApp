"use client";

import { useEffect, useState } from "react";
import {
  cancelRestAlert,
  fireRestDoneAlert,
  loadPersistedRest,
  restSecondsLeft,
  shouldFireRestAlert,
  type ActiveRestState,
} from "@/lib/restAlert";

function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Global rest timer — keeps alerting even outside the workout session page. */
export function RestTimerHost() {
  const [rest, setRest] = useState<ActiveRestState | null>(null);
  const [left, setLeft] = useState(0);
  const [doneFlash, setDoneFlash] = useState<string | null>(null);
  const [pushWarn, setPushWarn] = useState<string | null>(null);

  useEffect(() => {
    const onPushFailed = (e: Event) => {
      const reason = (e as CustomEvent).detail?.reason as string | undefined;
      setPushWarn(
        reason === "no_push_subscription"
          ? "Enable notifications in Settings or the timer can't alert you when the app is closed"
          : `Background alert scheduling failed (${reason || "unknown"}) — in-app timer still works`
      );
      window.setTimeout(() => setPushWarn(null), 8000);
    };
    window.addEventListener("fittrack:rest-push-failed", onPushFailed);
    return () => window.removeEventListener("fittrack:rest-push-failed", onPushFailed);
  }, []);

  useEffect(() => {
    const onSwMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; label?: string; endsAt?: number };
      if (data?.type !== "REST_DONE") return;
      if (data.endsAt && !shouldFireRestAlert(data.endsAt)) return;
      const label = data.label || "Next set";
      setDoneFlash(label);
      cancelRestAlert();
      setRest(null);
      void fireRestDoneAlert(label);
      window.setTimeout(() => setDoneFlash(null), 5000);
    };

    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onSwMessage);
  }, []);

  useEffect(() => {
    const tick = () => {
      const persisted = loadPersistedRest();
      if (!persisted) {
        setRest(null);
        setLeft(0);
        return;
      }

      const sec = restSecondsLeft(persisted.endsAt);
      setRest(persisted);
      setLeft(sec);

      if (sec <= 0) {
        if (shouldFireRestAlert(persisted.endsAt)) {
          setDoneFlash(persisted.label || "Next set");
          cancelRestAlert();
          setRest(null);
          void fireRestDoneAlert(persisted.label);
          window.setTimeout(() => setDoneFlash(null), 5000);
        } else {
          cancelRestAlert();
          setRest(null);
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);

  const onSession =
    typeof window !== "undefined" &&
    /\/train\/[^/]+\/session\/?$/.test(window.location.pathname);

  return (
    <>
      {pushWarn ? (
        <div
          className="fixed inset-x-3 top-14 z-[70] rounded-md border px-4 py-3 shadow-lg"
          style={{
            borderColor: "rgba(255, 179, 64, 0.5)",
            background: "rgba(255, 179, 64, 0.15)",
            marginTop: "env(safe-area-inset-top, 0px)",
          }}
          role="alert"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#ffb340]">
            Background alerts off
          </p>
          <p className="text-sm font-semibold text-[var(--text)]">{pushWarn}</p>
        </div>
      ) : null}

      {doneFlash ? (
        <div
          className="fixed inset-x-3 top-14 z-[70] rounded-md border px-4 py-3 shadow-lg"
          style={{
            borderColor: "rgba(48, 209, 89, 0.5)",
            background: "rgba(48, 209, 89, 0.15)",
            marginTop: "env(safe-area-inset-top, 0px)",
          }}
          role="alert"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--green)]">
            Rest done
          </p>
          <p className="text-sm font-semibold text-[var(--text)]">
            Time for your next set · {doneFlash}
          </p>
        </div>
      ) : null}

      {rest && left > 0 && !onSession ? (
        <div
          className="fixed inset-x-3 z-[60] rounded-md border border-[var(--border)] bg-[var(--card)]/95 px-3 py-2 backdrop-blur"
          style={{
            bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-[var(--muted)]">Rest</p>
              <p className="truncate text-xs text-[var(--text)]">{rest.label}</p>
            </div>
            <p className="font-mono text-lg font-bold tabular-nums text-[var(--green)]">
              {formatClock(left)}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
