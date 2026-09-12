"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { KeepAliveBanner } from "@/components/KeepAliveBanner";
import { AppUpdateBanner } from "@/components/AppUpdateBanner";
import { RestTimerHost } from "@/components/RestTimerHost";
import { PendingSessionSync } from "@/components/PendingSessionSync";
import {
  IconClipboard,
  IconDumbbell,
  IconGear,
  IconHome,
  IconUtensils,
} from "@/components/icons";

const links = [
  { href: "/dashboard", label: "Home", Icon: IconHome },
  { href: "/train", label: "Train", Icon: IconDumbbell },
  { href: "/nutrition", label: "Fuel", Icon: IconUtensils },
  { href: "/protocol", label: "Stack", Icon: IconClipboard },
];

/** Title-block label for the sheet the current route is on. */
function sheetFor(pathname: string) {
  if (pathname.startsWith("/settings")) return { name: "SETTINGS", no: null as string | null };
  const i = links.findIndex((l) => isActive(pathname, l.href));
  if (i < 0) return { name: "FITTRACK", no: null };
  return { name: links[i].label.toUpperCase(), no: String(i + 1).padStart(2, "0") };
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

function Nav({ pathname }: { pathname: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(pathname);

  useEffect(() => {
    setOptimistic(pathname);
  }, [pathname]);

  // Warm tab JS + RSC in the background so the next switch is instant
  useEffect(() => {
    for (const l of links) {
      void router.prefetch(l.href);
    }
  }, [router]);

  function go(href: string) {
    if (href === optimistic) return;
    setOptimistic(href);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3"
      style={{
        paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
      }}
      aria-label="Primary"
    >
      <div
        className="pointer-events-auto mx-auto flex max-w-lg items-stretch gap-0.5 rounded-md border border-[var(--border-solid)] bg-[var(--surface)] px-1 py-1"
        style={{ touchAction: "manipulation" }}
      >
        {links.map((l) => {
          const active = isActive(optimistic, l.href);
          return (
            <button
              key={l.href}
              type="button"
              onClick={() => go(l.href)}
              className={`relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 active:bg-white/5 ${
                active ? "text-[var(--accent)]" : "text-[var(--dim)]"
              }`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <span className="pointer-events-none" aria-hidden>
                <l.Icon size={22} strokeWidth={active ? 2.2 : 2} />
              </span>
              <span className="pointer-events-none font-mono text-[10px] font-medium uppercase leading-none tracking-[0.14em]">
                {l.label}
              </span>
              {active ? (
                <span className="absolute bottom-0.5 h-[2px] w-7 bg-[var(--accent)]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function AppChrome({
  children,
  displayName,
}: {
  children: React.ReactNode;
  displayName: string;
}) {
  const pathname = usePathname();
  const isSession = /\/train\/[^/]+\/session\/?$/.test(pathname);
  const isDayPreview = /^\/train\/[^/]+\/?$/.test(pathname);
  const sheet = sheetFor(pathname);

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      {!isSession && !isDayPreview ? (
        <header
          className="sticky top-0 z-20 border-b border-[var(--border-solid)] bg-[var(--bg)]/95 px-4 py-2.5 backdrop-blur-sm"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top, 0px))" }}
        >
          <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <Link href="/dashboard" prefetch={false} className="min-w-0 truncate">
              <span className="font-bold text-[var(--text)]">FitTrack</span>
              <span> · {sheet.name}</span>
            </Link>
            <div className="flex shrink-0 items-center gap-3">
              {sheet.no ? (
                <span>
                  Sheet <span className="font-bold text-[var(--text)]">{sheet.no}</span>/{String(links.length).padStart(2, "0")}
                </span>
              ) : null}
              <Link
                href="/settings"
                prefetch={false}
                className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--border-solid)] text-[var(--muted)]"
                aria-label={`Settings for ${displayName.split(" ")[0]}`}
              >
                <IconGear size={15} />
              </Link>
            </div>
          </div>
        </header>
      ) : null}

      <main
        className={isSession || isDayPreview ? "" : "px-4 pt-4"}
        style={
          isSession
            ? undefined
            : {
                paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
              }
        }
      >
        {!isSession && !isDayPreview ? <PendingSessionSync /> : null}
        {!isSession && !isDayPreview ? <KeepAliveBanner /> : null}
        <RestTimerHost />
        {children}
      </main>

      {!isSession ? <Nav pathname={pathname} /> : null}
      {!isSession ? <AppUpdateBanner /> : null}
    </div>
  );
}
