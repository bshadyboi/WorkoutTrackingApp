const WORKOUT_PHOTOS = {
  push: "/workouts/push.jpg",
  pull: "/workouts/pull.jpg",
  legs: "/workouts/legs.jpg",
} as const;

/** Stable local artwork for a workout day. No network dependency in the gym. */
export function workoutPhoto(name: string): string {
  const value = name.toLowerCase();
  if (/leg|lower|squat|glute|hamstring|quad/.test(value))
    return WORKOUT_PHOTOS.legs;
  if (/pull|back|row|lat|bicep/.test(value)) return WORKOUT_PHOTOS.pull;
  return WORKOUT_PHOTOS.push;
}
