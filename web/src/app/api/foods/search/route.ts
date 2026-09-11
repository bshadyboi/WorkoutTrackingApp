import { NextRequest, NextResponse } from "next/server";
import { lookupBarcode, searchFoods, searchLocalFoods } from "@/lib/foods";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const barcode = req.nextUrl.searchParams.get("barcode")?.trim() ?? "";

  try {
    if (barcode) {
      const hit = await lookupBarcode(barcode);
      return NextResponse.json({ foods: hit ? [hit] : [] });
    }
    if (!q) {
      return NextResponse.json({ foods: searchLocalFoods("", 15) });
    }
    const foods = await searchFoods(q);
    return NextResponse.json({ foods });
  } catch (e) {
    return NextResponse.json(
      { foods: [], error: e instanceof Error ? e.message : "Search failed" },
      { status: 500 }
    );
  }
}
