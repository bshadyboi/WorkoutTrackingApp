import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Macros for food the barcode database doesn't have.
 *
 * Two ways in: describe the meal in words ("chipotle bowl, white rice, black
 * beans, no guac"), or photograph a nutrition label. The label is read, not
 * estimated, so it comes back exact; a description is an estimate the lifter
 * confirms before anything is logged.
 */

export const maxDuration = 30;

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const FoodSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      brand: z.string(),
      serving_label: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      assumption: z.string(),
    })
  ),
  confidence: z.enum(["high", "medium", "low"]),
  note: z.string(),
});

const TEXT_SYSTEM = `You turn a plain-English description of food into macros for a workout app.

Rules:
- One entry per food. "Chicken and rice" is two entries, not one.
- Use the portion the lifter gave. When they didn't give one, use a normal serving and say which in assumption ("assumed 1 cup cooked"); leave assumption "" when they were specific.
- serving_label is the portion these numbers are for, e.g. "8 oz cooked", "1 bowl", "2 tbsp".
- brand is the restaurant or maker when named, otherwise "".
- Numbers are per the serving_label, in grams for protein/carbs/fat. Round to whole numbers.
- confidence: high for a chain restaurant item or a plain single food, medium for a home-cooked dish with stated portions, low when the portion is a guess or the dish is vague.
- note: one short line only when something matters (e.g. "cooking oil not included"), otherwise "".
- Nothing recognisable as food: return an empty items list and say so in note.`;

const LABEL_SYSTEM = `You read nutrition-facts labels from photographs for a workout app.

Rules:
- Return one entry, read from the panel — do not estimate.
- serving_label is the serving size printed on the label, e.g. "2/3 cup (55g)".
- Use the per-serving column, not per-container, unless only per-container is printed (say so in assumption).
- name and brand come from the package; brand "" if not visible.
- Numbers exactly as printed, in grams for protein/carbs/fat.
- confidence: high when the panel is legible, low when you are reading through glare or blur.
- note: "" unless something is unreadable.
- No nutrition panel in the photo: empty items list, say so in note.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Not set up yet — add an Anthropic API key." },
      { status: 503 }
    );
  }

  let body: { text?: unknown; image?: unknown; media_type?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim().slice(0, 600) : "";
  const image = typeof body.image === "string" ? body.image : "";
  const mediaType = MEDIA_TYPES.find((t) => t === body.media_type) ?? "image/jpeg";
  if (!text && !image) {
    return NextResponse.json({ error: "Nothing to read" }, { status: 400 });
  }
  if (image.length > 6_000_000) {
    return NextResponse.json({ error: "Photo is too large" }, { status: 413 });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      system: image ? LABEL_SYSTEM : TEXT_SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(FoodSchema) },
      messages: [
        {
          role: "user",
          content: image
            ? [
                { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
                { type: "text", text: "Read this nutrition label." },
              ]
            : [{ type: "text", text }],
        },
      ],
    });

    if (!response.parsed_output) {
      return NextResponse.json({ error: "Could not work that out" }, { status: 502 });
    }
    return NextResponse.json(response.parsed_output);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
