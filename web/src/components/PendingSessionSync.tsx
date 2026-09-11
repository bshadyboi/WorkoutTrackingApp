"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { flushPendingSessions, listPendingSessions } from "@/lib/pendingSessions";
import { clearTabCache } from "@/lib/tabCache";

/**
 * Uploads workouts that were finished without a connection, and says so while
 * they are waiting. Runs on load and whenever the device comes back online.
 */
export function PendingSessionSync() {
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(0);

  const sync = useCallback(async () => {
    if (!listPendingSessions().length) {
      setPending(0);
      return;
    }
    setSyncing(true);
    const { uploaded, remaining } = await flushPendingSessions();
    setSyncing(false);
    setPending(remaining);
    if (uploaded > 0) {
      setJustSynced(uploaded);
      clearTabCache("train");
      clearTabCache("dashboard");
      router.refresh();
      setTimeout(() => setJustSynced(0), 6000);
    }
  }, [router]);

  useEffect(() => {
    setPending(listPendingSessions().length);
    void sync();

    function onOnline() {
      void sync();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sync]);

  if (justSynced > 0) {
    return (
      <div className="mb-3 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-[var(--green)]">
        Synced {justSynced} workout{justSynced === 1 ? "" : "s"} saved offline.
      </div>
    );
  }

  if (pending <= 0) return null;

  return (
    <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[var(--yellow)]/30 bg-[var(--yellow)]/10 px-3.5 py-2.5">
      <p className="flex-1 text-[12.5px] font-semibold text-[var(--yellow)]">
        {pending} workout{pending === 1 ? "" : "s"} saved on this device
        {syncing ? " · uploading…" : " · will upload when you're online"}
      </p>
      {!syncing ? (
        <button
          type="button"
          className="shrink-0 text-[12.5px] font-bold text-[var(--yellow)] underline"
          onClick={() => void sync()}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
