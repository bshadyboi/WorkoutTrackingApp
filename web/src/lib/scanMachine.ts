import { catalogEntry, sameMuscleFamily } from "@/lib/exerciseCatalog";
import { restrictionFor } from "@/lib/contraindicated";
import { leftArmNote, leftShoulderLimited } from "@/lib/shoulderLimits";

/**
 * Point the camera at a machine, get back the exercise it is for.
 *
 * The photo is shrunk on the phone before it leaves — a full-size camera frame
 * is several megabytes of gym Wi-Fi for detail the model doesn't need.
 */

export type ScanGuess = { name: string; in_list: boolean; why: string };

export type ScanResult = {
  equipment: string;
  label_text: string;
  guesses: ScanGuess[];
  confidence: "high" | "medium" | "low";
  setup_tip: string;
};

async function shrinkToJpeg(file: File, maxPx = 1024, quality = 0.72): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

export async function scanMachine(file: File): Promise<ScanResult> {
  const image = await shrinkToJpeg(file);
  const res = await fetch("/api/scan-machine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, media_type: "image/jpeg" }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || "Scan failed");
  return body as ScanResult;
}

export type ScanVerdict = { tone: "good" | "warn" | "avoid"; line: string };

/**
 * What the app makes of a scanned movement: whether the program rules it out,
 * whether it trains what today's exercise trains, and the left-shoulder rule
 * that applies to it.
 */
export function verdictFor(
  name: string,
  currentName: string,
  currentMuscle: string
): ScanVerdict {
  const banned = restrictionFor(name);
  if (banned) return { tone: "avoid", line: `Skip it — ${banned}` };

  const entry = catalogEntry(name);
  const muscle = entry?.muscle ?? "";
  const shoulder = leftShoulderLimited() ? leftArmNote(name) : null;

  if (muscle && currentMuscle && sameMuscleFamily(currentMuscle, muscle)) {
    return {
      tone: shoulder ? "warn" : "good",
      line: shoulder ?? `Good fit for ${currentName}`,
    };
  }
  if (shoulder) return { tone: "warn", line: shoulder };
  return {
    tone: "warn",
    line: muscle ? `Trains ${muscle}, not ${currentMuscle || currentName}` : "Not in the exercise list",
  };
}
