import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { RESTAURANT_FOODS } from "@/lib/foods";

/**
 * "What's near me that fits?"
 *
 * Claude has no idea what is on a given street, so the places come from
 * OpenStreetMap (free, no key) and Claude only does the part it is good at:
 * picking an order from those places that fits what's left of the day.
 *
 * Coordinates are rounded to about 100 m before they leave this server — enough
 * to find the right block, not enough to point at a house.
 */

export const maxDuration = 45;

const OrderSchema = z.object({
  picks: z.array(
    z.object({
      place: z.string(),
      distance_mi: z.number(),
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

const SYSTEM = `You pick where a lifter should eat from the places actually near him, so the day's macros still work.

He is lean-bulking on a shoulder-safe hypertrophy program: protein is the number to hit, the fat cap is the one that gets blown, carbs are fuel and flexible.

Rules:
- Choose two or three places from the list given, best first. Never invent a place that isn't on the list.
- Give one concrete order per place, with macros per item for the serving named. Whole numbers.
- Prefer places whose menus you actually know. If the best-fitting place is one you don't know, say what to look for in why (e.g. "grilled chicken plate, skip the sauce") and keep the numbers conservative.
- verdict: "best" for the one you'd send him to, "ok" for a workable second, "avoid" only for a place on the list he'd plausibly pick that would wreck the day.
- why: at most twenty words, concrete about the fit and the walk ("0.4 mi, hits protein, leaves 300 cal for dinner").
- distance_mi: copy the distance given for that place.
- checked: true only when every number came from the verified list given to you.
- note: one line when something matters — a menu that varies, a place likely closed. Otherwise "".
- If no place on the list can work, return an empty picks list and say why in note.`;

type Place = { name: string; kind: string; miles: number };

function milesBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function nearbyPlaces(lat: number, lng: number): Promise<Place[]> {
  const query = `[out:json][timeout:20];
(
  node["amenity"~"^(fast_food|restaurant)$"](around:2500,${lat},${lng});
  way["amenity"~"^(fast_food|restaurant)$"](around:2500,${lat},${lng});
);
out center 80;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "text/plain", "User-Agent": "FitTrack/1.0 (workout tracking)" },
    body: query,
  });
  if (!res.ok) return [];
  const data = await res.json();

  const seen = new Set<string>();
  const places: Place[] = [];
  for (const el of (data?.elements ?? []) as Record<string, never>[]) {
    const tags = (el.tags ?? {}) as Record<string, string>;
    const name = (tags.brand || tags.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const center = (el.center ?? el) as unknown as { lat?: number; lon?: number };
    if (typeof center.lat !== "number" || typeof center.lon !== "number") continue;
    const miles = Math.round(milesBetween(lat, lng, center.lat, center.lon) * 10) / 10;
    // Keep the closest branch of a chain, not all six of them.
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({ name, kind: tags.cuisine || tags.amenity || "restaurant", miles });
  }
  return places.sort((a, b) => a.miles - b.miles).slice(0, 25);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Not set up yet — add an Anthropic API key." }, { status: 503 });
  }

  let body: { lat?: unknown; lng?: unknown; remaining?: Record<string, number> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const rawLat = Number(body.lat);
  const rawLng = Number(body.lng);
  if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) {
    return NextResponse.json({ error: "No location" }, { status: 400 });
  }
  // ~100 m of precision is all a "what's nearby" question needs.
  const lat = Math.round(rawLat * 1000) / 1000;
  const lng = Math.round(rawLng * 1000) / 1000;

  const r = body.remaining ?? {};
  const left = {
    calories: Math.round(Number(r.calories) || 0),
    protein: Math.round(Number(r.protein) || 0),
    carbs: Math.round(Number(r.carbs) || 0),
    fat: Math.round(Number(r.fat) || 0),
  };

  let places: Place[] = [];
  try {
    places = await nearbyPlaces(lat, lng);
  } catch {
    return NextResponse.json({ error: "Could not look up what's nearby" }, { status: 502 });
  }
  if (!places.length) {
    return NextResponse.json({
      picks: [],
      checked: false,
      note: "Nothing mapped within a mile and a half of here — type the place instead.",
    });
  }

  const brands = new Set(
    places.map((p) => p.name.toLowerCase().replace(/[^a-z]/g, ""))
  );
  const known = RESTAURANT_FOODS.filter((f) => {
    const brand = (f.brand ?? "").toLowerCase().replace(/[^a-z]/g, "");
    return brand && [...brands].some((b) => b.includes(brand) || brand.includes(b));
  });

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2500,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(OrderSchema) },
      messages: [
        {
          role: "user",
          content: [
            `Left for the day: ${left.calories} cal, ${left.protein}g protein, ${left.carbs}g carbs, ${left.fat}g fat.`,
            `Places near him (name · type · miles):\n${places
              .map((p) => `${p.name} · ${p.kind} · ${p.miles} mi`)
              .join("\n")}`,
            known.length
              ? `Verified numbers on file (per serving) — use these exactly where they fit:\n${known
                  .map(
                    (f) =>
                      `${f.brand} — ${f.name} (${f.servingLabel}): ${f.calories} cal, ${f.protein}p, ${f.carbs}c, ${f.fat}f`
                  )
                  .join("\n")}`
              : "No verified menu numbers on file for these places.",
            "Where should he eat, and what should he order?",
          ].join("\n\n"),
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
