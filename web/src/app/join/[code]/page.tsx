import { createClient } from "@/lib/supabase/server";
import JoinClient from "./JoinClient";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <JoinClient code={code} signedIn={!!user} />;
}
