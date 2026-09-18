import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dateKey } from "@/lib/protocol";
import { getPreviousSetsByExercise, getAllTimeBestByExercise, getLastNoteByExercise } from "@/lib/data";
import { WorkoutLogger } from "../WorkoutLogger";

export default async function TrainSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ dayId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { dayId } = await params;
  const { date } = await searchParams;
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

  const [previous, bestByExercise, lastNotes] = await Promise.all([
    getPreviousSetsByExercise(user.id),
    getAllTimeBestByExercise(user.id),
    getLastNoteByExercise(user.id),
  ]);
  const exercises = day.workout_exercises ?? [];
  const logDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= dateKey(new Date())
      ? date
      : undefined;

  return (
    <WorkoutLogger
      dayId={day.id}
      dayName={day.name}
      exercises={exercises}
      lastNotes={lastNotes}
      previousByExercise={previous}
      bestByExercise={bestByExercise}
      logDate={logDate}
    />
  );
}
