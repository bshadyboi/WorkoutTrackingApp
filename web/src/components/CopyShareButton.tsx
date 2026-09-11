"use client";

import { useState } from "react";

/** Copy text for sharing (clipboard + share sheet when available). */
export function CopyShareButton({
  text,
  label = "Copy summary",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [msg, setMsg] = useState("");

  async function copy() {
    const payload = text.trim();
    if (!payload) return;
    try {
      if (navigator.share) {
        try {
          await navigator.share({ text: payload });
          setMsg("Shared");
          setTimeout(() => setMsg(""), 1500);
          return;
        } catch (e) {
          // User cancelled share — fall through to clipboard
          if ((e as { name?: string }).name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(payload);
      setMsg("Copied");
      setTimeout(() => setMsg(""), 1500);
    } catch {
      setMsg("Couldn’t copy");
      setTimeout(() => setMsg(""), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={
        className ||
        "rounded-full bg-[var(--raised)] px-3 py-1.5 text-[11px] font-bold text-[var(--blue)]"
      }
    >
      {msg || label}
    </button>
  );
}
