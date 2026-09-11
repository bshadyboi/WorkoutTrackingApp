"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { KeepAliveBanner } from "@/components/KeepAliveBanner";
import { AppUpdateBanner } from "@/components/AppUpdateBanner";
import { RestTimerHost } from "@/components/RestTimerHost";
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
  { href: "/nutrition", label: "Nutrition", Icon: IconUtensils },
  { href: "/protocol", label: "Protocol", Icon: IconClipboard },
];

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
        className="pointer-events-auto mx-auto flex max-w-lg items-stretch gap-0.5 rounded-2xl border border-[var(--border)] bg-[#161a22] px-1 py-1.5"
        style={{ touchAction: "manipulation" }}
      >
        {links.map((l) => {
          const active = isActive(optimistic, l.href);
          return (
            <button
              key={l.href}
              type="button"
              onClick={() => go(l.href)}
              className={`relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 active:bg-white/5 ${
                active ? "text-[var(--blue)]" : "text-[var(--muted)]"
              }`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <span className="pointer-events-none" aria-hidden>
                <l.Icon size={22} strokeWidth={active ? 2.2 : 2} />
              </span>
              <span className="pointer-events-none text-[10.5px] font-semibold leading-none">
                {l.label}
              </span>
              {active ? (
                <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-[var(--blue)]" />
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

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[var(--bg)]">
      {!isSession && !isDayPreview ? (
        <header
          className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-3"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top, 0px))" }}
        >
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" prefetch={false} className="text-[15px] font-bold tracking-tight">
              <span className="text-white">Fit</span>
              <span className="text-[var(--blue)]">Track</span>
            </Link>
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--muted)]">
              <span className="truncate">{displayName.split(" ")[0]}</span>
              <span>·</span>
            <Link
              href="/settings"
              prefetch={false}
              className="inline-flex items-center gap-1 font-semibold"
              aria-label="Settings"
            >
              <IconGear size={16} />
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
        {!isSession && !isDayPreview ? <KeepAliveBanner /> : null}
        <RestTimerHost />
        {children}
      </main>

      {!isSession ? <Nav pathname={pathname} /> : null}
      {!isSession ? <AppUpdateBanner /> : null}
    </div>
  );
}
