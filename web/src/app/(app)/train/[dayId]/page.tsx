import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPreviousSetsByExercise } from "@/lib/data";
import { WorkoutLogger } from "./WorkoutLogger";

export default async function TrainDayPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const { dayId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: day } = await supabase
    .from("workout_days")
    .select("id, name, user_id, workout_exercises(*)")
    .eq("id", dayId)
    .eq("user_id", user.id)
    .single();

  if (!day) notFound();

  const previous = await getPreviousSetsByExercise(user.id);

  return (
    <WorkoutLogger
      dayId={day.id}
      dayName={day.name}
      exercises={day.workout_exercises ?? []}
      previousByExercise={previous}
    />
  );
}
