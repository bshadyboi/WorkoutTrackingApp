import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CoachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: links } = await supabase
    .from("coach_links")
    .select("id, athlete_id, profiles:athlete_id(display_name, email)")
    .eq("coach_id", user.id)
    .eq("status", "active");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Coach</h1>
        <p className="text-sm text-[var(--muted)]">Athletes who invited you (read-only)</p>
      </div>

      {(links?.length ?? 0) === 0 ? (
        <div className="card space-y-2">
          <p className="text-sm text-[var(--muted)]">
            No athletes yet. Ask them to open Invite and send you their link.
          </p>
          <Link href="/train" className="text-sm font-semibold text-[var(--blue)]">
            Or train yourself →
          </Link>
        </div>
      ) : (
        links?.map((link) => {
          const profile = link.profiles as unknown as {
            display_name?: string;
            email?: string;
          } | null;
          return (
            <Link
              key={link.id}
              href={`/coach/${link.athlete_id}`}
              className="card block"
            >
              <p className="font-bold">{profile?.display_name || "Athlete"}</p>
              <p className="text-xs text-[var(--muted)]">{profile?.email}</p>
              <p className="mt-2 text-xs font-semibold text-[var(--blue)]">View stats →</p>
            </Link>
          );
        })
      )}
    </div>
  );
}
