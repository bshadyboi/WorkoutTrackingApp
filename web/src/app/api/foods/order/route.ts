import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { RESTAURANT_FOODS } from "@/lib/foods";

/**
 * What to order, given what's left of the day.
 *
 * A food database can say what is in a sandwich. It can't say whether this
 * sandwich fits the 950 calories and 12 g of fat still going spare — which is
 * the question actually being asked at the counter.
 */

export const maxDuration = 30;

const OrderSchema = z.object({
  picks: z.array(
    z.object({
      title: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
          serving_label: z.string(),
          calories: z.number(),
          protein: z.number(),
          carbs: z.number(),
          fat: z.number(),
        })
      ),
      verdict: z.enum(["best", "ok", "avoid"]),
      why: z.string(),
    })
  ),
  checked: z.boolean(),
  note: z.string(),
});

const SYSTEM = `You help a lifter order at a restaurant so the day's macros still work.

He is lean-bulking on a shoulder-safe hypertrophy program: protein is the number to hit, the fat cap is the one that gets blown, carbs are fuel and flexible.

Rules:
- Give two or three real orders from that restaurant's menu, best first. A pick may combine items ("sandwich + nuggets").
- Every item needs its own macros for the serving named. Whole numbers.
- verdict: "best" for the one you'd order, "ok" for a workable alternative, "avoid" for a popular choice worth warning against — include an avoid only when it is something he'd plausibly pick.
- why: at most twenty words, concrete about the fit ("hits protein, leaves 300 cal for dinner", "blows the fat cap on its own").
- Prefer high protein per calorie, and respect the remaining fat above all else.
- checked: true only when every number came from the verified list given to you; false when you recalled any of them.
- note: one line when something matters — a menu that varies by region, a limited-time item. Otherwise "".
- If the restaurant is unknown to you, return an empty picks list and say so in note.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Not set up yet — add an Anthropic API key." }, { status: 503 });
  }

  let body: {
    restaurant?: unknown;
    remaining?: { calories?: number; protein?: number; carbs?: number; fat?: number };
    mealsLeft?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const restaurant = typeof body.restaurant === "string" ? body.restaurant.trim().slice(0, 80) : "";
  if (!restaurant) return NextResponse.json({ error: "Which restaurant?" }, { status: 400 });

  const r = body.remaining ?? {};
  const left = {
    calories: Math.round(Number(r.calories) || 0),
    protein: Math.round(Number(r.protein) || 0),
    carbs: Math.round(Number(r.carbs) || 0),
    fat: Math.round(Number(r.fat) || 0),
  };
  const mealsLeft = typeof body.mealsLeft === "string" ? body.mealsLeft.slice(0, 80) : "";

  // Hand over the verified numbers we hold for this chain, so a known menu is
  // quoted rather than recalled.
  const needle = restaurant.toLowerCase().replace(/[^a-z]/g, "");
  const known = RESTAURANT_FOODS.filter((f) => {
    const brand = (f.brand ?? "").toLowerCase().replace(/[^a-z]/g, "");
    return brand && needle && (brand.includes(needle) || needle.includes(brand));
  });

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(OrderSchema) },
      messages: [
        {
          role: "user",
          content: [
            `Restaurant: ${restaurant}`,
            `Left for the day: ${left.calories} cal, ${left.protein}g protein, ${left.carbs}g carbs, ${left.fat}g fat.`,
            mealsLeft ? `Still to eat after this: ${mealsLeft}.` : "",
            known.length
              ? `Verified numbers for this place (per serving) — use these exactly where they fit:\n${known
                  .map(
                    (f) =>
                      `${f.name} (${f.servingLabel}): ${f.calories} cal, ${f.protein}p, ${f.carbs}c, ${f.fat}f`
                  )
                  .join("\n")}`
              : "No verified numbers on file for this place.",
            "What should he order?",
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    });

    if (!response.parsed_output) {
      return NextResponse.json({ error: "Could not work that out" }, { status: 502 });
    }
    return NextResponse.json(response.parsed_output);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lookup failed" },
      { status: 502 }
    );
  }
}
