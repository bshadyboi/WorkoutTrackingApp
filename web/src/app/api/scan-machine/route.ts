import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { EXERCISE_CATALOG } from "@/lib/exerciseCatalog";

/**
 * Read a photo of a gym machine and say which exercise it is.
 *
 * The lifter points a camera at a machine they don't recognise; Claude names
 * the movement, preferring a name the app already knows so the answer can be
 * matched against the plan, the swap list and the shoulder rules on the client.
 */

export const maxDuration = 30;

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const ScanSchema = z.object({
  equipment: z.string(),
  label_text: z.string(),
  guesses: z.array(
    z.object({
      name: z.string(),
      in_list: z.boolean(),
      why: z.string(),
    })
  ),
  confidence: z.enum(["high", "medium", "low"]),
  setup_tip: z.string(),
});

const KNOWN_NAMES = EXERCISE_CATALOG.map((e) => e.name).join("\n");

const SYSTEM = `You identify gym equipment from photographs for a workout tracking app.

Given a photo, name the exercise the equipment is built for. Rules:
- Prefer a name from the app's exercise list; set in_list true for those and false for a name you had to invent.
- Return one to three guesses, best first. One confident guess beats three vague ones.
- Read any text on the machine (maker, station name, weight stack numbers) into label_text; use "" when there is none.
- equipment: a short plain description of what you see, e.g. "plate-loaded chest-supported row machine".
- why: at most twelve words on what in the photo told you.
- setup_tip: one short setup cue for that machine, or "" when nothing useful applies.
- confidence: high only when the machine is unambiguous.
- If the photo shows no gym equipment, return an empty guesses list and say so in equipment.`;

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
      { error: "Scanning isn't set up yet — add an Anthropic API key." },
      { status: 503 }
    );
  }

  let body: { image?: unknown; media_type?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const image = typeof body.image === "string" ? body.image : "";
  const mediaType = MEDIA_TYPES.find((t) => t === body.media_type) ?? "image/jpeg";
  if (!image) {
    return NextResponse.json({ error: "No photo" }, { status: 400 });
  }
  // Base64 grows a file by a third; ~6 MB of it is a generous phone photo.
  if (image.length > 6_000_000) {
    return NextResponse.json({ error: "Photo is too large" }, { status: 413 });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      system: SYSTEM,
      output_config: {
        effort: "low",
        format: zodOutputFormat(ScanSchema),
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            {
              type: "text",
              text: `What exercise is this machine for?\n\nThe app's exercise list:\n${KNOWN_NAMES}`,
            },
          ],
        },
      ],
    });

    if (!response.parsed_output) {
      return NextResponse.json({ error: "Could not read that photo" }, { status: 502 });
    }
    return NextResponse.json(response.parsed_output);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
