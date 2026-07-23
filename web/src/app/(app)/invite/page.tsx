import { createClient } from "@/lib/supabase/server";

export default async function InvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: link } = await supabase
    .from("coach_links")
    .select("*")
    .eq("athlete_id", user.id)
    .is("coach_id", null)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!link) {
    const created = await supabase
      .from("coach_links")
      .insert({ athlete_id: user.id, status: "pending" })
      .select("*")
      .single();
    link = created.data;
  }

  const { data: active } = await supabase
    .from("coach_links")
    .select("id, status, coach_id, profiles:coach_id(display_name, email)")
    .eq("athlete_id", user.id)
    .eq("status", "active");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = link ? `${appUrl}/join/${link.invite_code}` : "";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Invite coach</h1>
        <p className="text-sm text-[var(--muted)]">
          Send this link — they sign up / log in, then can view your stats (read-only).
        </p>
      </div>

      <div className="card space-y-3">
        <p className="text-xs font-semibold uppercase text-[var(--muted)]">Invite link</p>
        <p className="break-all rounded-xl bg-[#0c0c0c] p-3 text-sm text-[var(--blue)]">
          {inviteUrl || "Generating…"}
        </p>
        <p className="text-xs text-[var(--muted)]">Code: {link?.invite_code}</p>
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">Active coaches</h2>
        {(active?.length ?? 0) === 0 ? (
          <p className="text-sm text-[var(--muted)]">No coach connected yet.</p>
        ) : (
          active?.map((c) => {
            const profile = c.profiles as unknown as { display_name?: string; email?: string } | null;
            return (
              <div key={c.id} className="rounded-xl bg-[#0c0c0c] p-3 text-sm">
                <p className="font-semibold">{profile?.display_name || "Coach"}</p>
                <p className="text-xs text-[var(--muted)]">{profile?.email}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
