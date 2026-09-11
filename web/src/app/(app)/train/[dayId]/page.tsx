import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPreviousSetsByExercise } from "@/lib/data";
import { WorkoutPreview } from "@/components/WorkoutPreview";

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
    .select("id, name, subtitle, user_id, workout_exercises(*)")
    .eq("id", dayId)
    .eq("user_id", user.id)
    .single();

  if (!day) notFound();

  const previous = await getPreviousSetsByExercise(user.id);
  const exercises = day.workout_exercises ?? [];

  return (
    <WorkoutPreview
      dayId={day.id}
      dayName={day.name}
      subtitle={day.subtitle ?? ""}
      exercises={exercises}
      previousByExercise={previous}
    />
  );
}
