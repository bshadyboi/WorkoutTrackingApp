import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/train", label: "Train" },
  { href: "/daily", label: "Daily" },
  { href: "/coach", label: "Coach" },
  { href: "/invite", label: "Invite" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-24">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-black/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-bold">
            FitTrack
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-xs font-semibold text-[var(--muted)]">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="px-4 py-5">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[var(--border)] bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-[var(--muted)]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
