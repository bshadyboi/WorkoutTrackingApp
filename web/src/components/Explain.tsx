"use client";

import { useEffect, useRef, useState } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

/**
 * A small "?" that opens a two-sentence explanation of a training term, so
 * jargon on a screen can be understood in place without cluttering it.
 */
export function Explain({ term, className = "" }: { term: GlossaryKey; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const entry = GLOSSARY[term];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={`What does ${entry.title} mean?`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[11px] font-bold leading-none ${
          open
            ? "border-[var(--blue)] bg-[var(--blue)] text-[var(--on-blue)]"
            : "border-[var(--dim)] text-[var(--muted)]"
        }`}
      >
        ?
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-0 top-[24px] z-30 w-[260px] rounded-md border border-[var(--border-solid)] bg-[var(--card-2)] p-3 text-left shadow-xl shadow-black/40"
        >
          <span className="block text-[12.5px] font-bold text-[var(--text)]">{entry.title}</span>
          <span className="mt-1 block text-[12.5px] leading-snug text-[var(--muted)]">{entry.body}</span>
        </span>
      ) : null}
    </span>
  );
}
