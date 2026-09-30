/**
 * A photo of the movement on each exercise card.
 *
 * Images come from the Free Exercise DB (github.com/yuhonas/free-exercise-db),
 * resized and served from /public so they always load, including offline. The
 * mapping is written out by hand: fuzzy matching on names put "Power Jerk" next
 * to Pec Deck and an ab machine next to the abductor, which is worse than no
 * picture at all.
 */

const PHOTOS: Record<string, string> = {
  "incline chest press": "leverage-incline-chest-press",
  "incline machine press": "leverage-incline-chest-press",
  "pec deck": "butterfly",
  "pec deck flyes": "butterfly",
  "cable fly pec deck": "butterfly",
  "t bar row": "t-bar-row-with-handle",
  "chest supported t bar row": "t-bar-row-with-handle",
  "single arm pulldown": "one-arm-lat-pulldown",
  "single arm lat pulldown": "one-arm-lat-pulldown",
  "single arm lat pulldowns": "one-arm-lat-pulldown",
  "one arm cable lateral raise": "cable-seated-lateral-raise",
  "single arm cable lateral raise": "cable-seated-lateral-raise",
  "cable lateral raise": "cable-seated-lateral-raise",
  "machine lateral raise": "side-lateral-raise",
  "dumbbell lateral raise": "side-lateral-raise",
  "lateral raise": "side-lateral-raise",
  "rear delt fly": "cable-rear-delt-fly",
  "cable rear delt fly": "cable-rear-delt-fly",
  "rear delt raise": "cable-rear-delt-fly",
  "single arm tricep pushdown": "cable-one-arm-tricep-extension",
  "unilateral tricep pushdown": "cable-one-arm-tricep-extension",
  "single arm pushdown": "cable-one-arm-tricep-extension",
  "tricep pushdown": "triceps-pushdown",
  "triceps pushdown": "triceps-pushdown",
  "preacher curl": "preacher-curl",
  "hack squat": "hack-squat",
  "leg extension": "leg-extensions",
  "lying leg curl": "lying-leg-curls",
  "lying ham curl": "lying-leg-curls",
  "romanian deadlift": "romanian-deadlift",
  "rdl": "romanian-deadlift",
  "seated calf raise": "seated-calf-raise",
  "standing calf raise": "standing-calf-raises",
  "calf raise": "standing-calf-raises",
  "hip abductor machine": "thigh-abductor",
  "abductor": "thigh-abductor",
  "cable crunch": "cable-crunch",
  "hanging leg raise": "hanging-leg-raise",
  "chest supported db row": "incline-bench-pull",
  "chest supported rows neutral grip": "incline-bench-pull",
  "ez bar curl": "ez-bar-curl",
  "barbell curl": "barbell-curl",
  "barbell curls": "barbell-curl",
  "incline db curl": "incline-dumbbell-curl",
  "incline one arm db curl": "incline-dumbbell-curl",
  "incline curl": "incline-dumbbell-curl",
  "seated cable row d handle": "seated-cable-rows",
  "seated one arm cable row d handle": "seated-cable-rows",
  "seated cable row": "seated-cable-rows",
  "hammer curl": "hammer-curls",
  "db hammer curl": "hammer-curls",
  "face pull": "face-pull",
  "face pulls external rotation": "face-pull",
  "band pull aparts": "band-pull-apart",
  "lat pulldown": "close-grip-front-lat-pulldown",
  "neutral pulldown assisted chin": "close-grip-front-lat-pulldown",
  "leg press": "leg-press",
  "single arm db row": "one-arm-dumbbell-row",
  "one arm db row": "one-arm-dumbbell-row",
  "single arm row machine": "one-arm-dumbbell-row",
  "cable fly": "cable-crossover",
  "cable chest flyes": "cable-crossover",
  "cable fly short of stretch": "cable-crossover",
};

function key(name: string) {
  return (name ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(db|dbs)\b/g, "db")
    .trim();
}

/** Path to this movement's photo, or null when there isn't one. */
export function exercisePhoto(name: string): string | null {
  const k = key(name);
  if (!k) return null;
  const slug = PHOTOS[k];
  return slug ? `/exercises/${slug}.jpg` : null;
}
