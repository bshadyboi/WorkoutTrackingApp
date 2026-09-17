"use client";

import { useEffect, useRef, useState } from "react";
import type { FoodHit } from "@/lib/foods";
import { shrinkToJpeg } from "@/lib/photo";
import { readBarcodeFromImage, watchForBarcode } from "@/lib/barcode";
import { getMyFood, saveMyFood } from "@/lib/myFoods";

export type MealItem = {
  id: string;
  meal: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingLabel: string;
};

type AiFood = {
  name: string;
  brand: string;
  serving_label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  assumption: string;
};

type AiResult = {
  items: AiFood[];
  confidence: "high" | "medium" | "low";
  note: string;
  /** How the numbers were arrived at — a read label is exact, words are an estimate. */
  read: boolean;
};

export function FoodSearchModal({
  meal,
  onClose,
  onAdd,
}: {
  meal: MealItem["meal"];
  onClose: () => void;
  onAdd: (item: MealItem) => void;
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<FoodHit[]>([]);
  const [error, setError] = useState("");
  const [manual, setManual] = useState(false);
  const [mName, setMName] = useState("");
  const [mCal, setMCal] = useState("");
  const [mPro, setMPro] = useState("");
  const [mCarb, setMCarb] = useState("");
  const [mFat, setMFat] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const [ai, setAi] = useState<AiResult | null>(null);
  /** A scanned product, held for checking against the packet before it's logged. */
  const [scanned, setScanned] = useState<FoodHit | null>(null);
  const [vName, setVName] = useState("");
  const [vServing, setVServing] = useState("");
  const [vCal, setVCal] = useState("");
  const [vPro, setVPro] = useState("");
  const [vCarb, setVCarb] = useState("");
  const [vFat, setVFat] = useState("");
  const [saveNote, setSaveNote] = useState("");

  function openScanned(f: FoodHit) {
    setScanned(f);
    setVName(f.name);
    setVServing(f.servingLabel);
    setVCal(String(f.calories));
    setVPro(String(f.protein));
    setVCarb(String(f.carbs));
    setVFat(String(f.fat));
    setSaveNote("");
  }

  function verifiedItem(): MealItem {
    return {
      id: `${Date.now()}-scan`,
      meal,
      name: vName.trim() || scanned?.name || "Scanned food",
      brand: scanned?.brand,
      calories: Number(vCal) || 0,
      protein: Number(vPro) || 0,
      carbs: Number(vCarb) || 0,
      fat: Number(vFat) || 0,
      servingLabel: vServing.trim() || "1 serving",
    };
  }

  /** Bind these numbers to the barcode, so the next scan skips the databases. */
  async function keepAndAdd() {
    const item = verifiedItem();
    if (scanned?.barcode) {
      setSaveNote("Saving…");
      const err = await saveMyFood({
        barcode: scanned.barcode,
        name: item.name,
        brand: item.brand ?? "",
        servingLabel: item.servingLabel,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      });
      if (err) {
        setSaveNote(err);
        return;
      }
    }
    onAdd(item);
    onClose();
  }
  const [aiBusy, setAiBusy] = useState("");

  /**
   * Ask for macros the food databases don't have: a meal described in words,
   * or a nutrition label photographed off the packet.
   */
  async function askClaude(payload: { text: string } | { file: File }) {
    setError("");
    setAi(null);
    const isLabel = "file" in payload;
    setAiBusy(isLabel ? "Reading the label…" : "Working out the macros…");
    try {
      const body = isLabel
        ? { image: await shrinkToJpeg(payload.file), media_type: "image/jpeg" }
        : { text: payload.text };
      const res = await fetch("/api/foods/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Lookup failed");
      setAi({ ...(data as Omit<AiResult, "read">), read: isLabel });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setAiBusy("");
    }
  }

  function addAi(item: AiFood, close: boolean) {
    onAdd({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      meal,
      name: item.name,
      brand: item.brand || undefined,
      calories: Math.round(item.calories),
      protein: Math.round(item.protein),
      carbs: Math.round(item.carbs),
      fat: Math.round(item.fat),
      servingLabel: item.serving_label || "1 serving",
    });
    if (close) onClose();
  }

  useEffect(() => {
    // Popular curated items when opening empty search
    if (!q.trim()) {
      void (async () => {
        try {
          const res = await fetch(`/api/foods/search?q=`);
          const data = await res.json();
          setHits(data.foods ?? []);
        } catch {
          /* ignore */
        }
      })();
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setHits(data.foods ?? []);
      } catch {
        setError("Search failed");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    return () => stopScan();
  }, []);

  function stopScan() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  async function startScan() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play();

        // Chrome/Android have a built-in reader; Safari doesn't, so fall back
        // to decoding frames ourselves instead of asking for typed digits.
        void watchForBarcode(video, () => Boolean(streamRef.current), (code) => {
          stopScan();
          void lookupCode(code);
        });
      });
    } catch {
      setError("Camera blocked — use barcode type-in or photo from camera roll.");
      setScanning(false);
    }
  }

  async function lookupCode(code: string) {
    setLoading(true);
    setError("");
    setAi(null);
    try {
      // Anything already checked against the packet wins over every database.
      const mine = await getMyFood(code.trim());
      if (mine) {
        openScanned(mine);
        setHits([]);
        return;
      }

      const res = await fetch(
        `/api/foods/search?barcode=${encodeURIComponent(code)}`
      );
      const data = await res.json();
      const foods = (data.foods ?? []) as FoodHit[];
      if (!foods.length) {
        setError(`No product for barcode ${code} — try Scan label instead.`);
        setHits([]);
      } else {
        openScanned(foods[0]);
        setHits([]);
      }
    } catch {
      setError("Barcode lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function onPhoto(file: File) {
    setError("");
    try {
      const code = await readBarcodeFromImage(file);
      if (code) {
        await lookupCode(code);
        return;
      }
    } catch {
      /* fall through to typing it in */
    }
    const typed = window.prompt(
      "Couldn’t read a barcode from that photo. Type the numbers under the barcode:"
    );
    if (typed) await lookupCode(typed);
    else setError("No barcode found — search by name, or use Scan label.");
  }

  function addHit(f: FoodHit) {
    onAdd({
      id: `${Date.now()}-${f.id}`,
      meal,
      name: f.name,
      brand: f.brand,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      servingLabel: f.servingLabel,
    });
    onClose();
  }

  function addManual() {
    if (!mName.trim()) return;
    onAdd({
      id: `${Date.now()}-manual`,
      meal,
      name: mName.trim(),
      calories: Number(mCal) || 0,
      protein: Number(mPro) || 0,
      carbs: Number(mCarb) || 0,
      fat: Number(mFat) || 0,
      servingLabel: "custom",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center">
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-md border border-[var(--border)] bg-[var(--card)] sm:rounded-md">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <p className="font-bold">Log {meal}</p>
          <button type="button" className="text-[var(--muted)]" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-3">
          <input
            className="field"
            placeholder="Search Chipotle, Costco, Walmart…"
            value={q}
            autoFocus
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="grid grid-cols-3 gap-2">
            <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => void startScan()}>
              📷 Live
            </button>
            <button
              type="button"
              className="btn-secondary !py-2 text-xs"
              onClick={() => cameraRef.current?.click()}
            >
              📸 Camera
            </button>
            <button
              type="button"
              className="btn-secondary !py-2 text-xs"
              onClick={() => fileRef.current?.click()}
            >
              🖼 Roll
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-[4px] bg-[var(--raised)] py-2 text-xs font-semibold text-[var(--blue)] disabled:opacity-50"
              disabled={Boolean(aiBusy)}
              onClick={() => labelRef.current?.click()}
            >
              🏷 Scan label
            </button>
            <button
              type="button"
              className="rounded-[4px] bg-[var(--raised)] py-2 text-xs font-semibold text-[var(--blue)]"
              onClick={() => setManual((v) => !v)}
            >
              ✎ Manual entry
            </button>
          </div>

          {q.trim().length >= 3 ? (
            <button
              type="button"
              className="w-full rounded-[4px] border border-dashed border-[var(--border-solid)] py-2.5 text-xs font-bold text-[var(--blue)] disabled:opacity-50"
              disabled={Boolean(aiBusy)}
              onClick={() => void askClaude({ text: q.trim() })}
            >
              {aiBusy || `Work out the macros for “${q.trim()}”`}
            </button>
          ) : (
            <p className="text-center text-[11px] text-[var(--muted)]">
              Not in the list? Type what you ate — “8 oz ground beef, cup of rice” — and
              we&apos;ll work out the macros.
            </p>
          )}

          <input
            ref={labelRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void askClaude({ file: f });
            }}
          />

          {scanned ? (
            <div className="space-y-2 rounded-md border border-[var(--green)]/40 bg-[var(--green)]/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--green)]">
                  {scanned.source === "mine"
                    ? "Yours · checked before"
                    : `Scanned · ${scanned.source === "usda" ? "USDA" : scanned.source === "nutritionix" ? "Nutritionix" : "Open Food Facts"}`}
                </p>
                <button
                  type="button"
                  className="text-[11px] font-bold text-[var(--muted)]"
                  onClick={() => setScanned(null)}
                >
                  Clear
                </button>
              </div>

              <input
                className="field !py-2"
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                placeholder="Food name"
              />
              <input
                className="field !py-2 text-[12px]"
                value={vServing}
                onChange={(e) => setVServing(e.target.value)}
                placeholder="Serving, e.g. 1 bar (60 g)"
              />
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ["Cal", vCal, setVCal],
                    ["P", vPro, setVPro],
                    ["C", vCarb, setVCarb],
                    ["F", vFat, setVFat],
                  ] as const
                ).map(([label, value, set]) => (
                  <input
                    key={label}
                    className="field !px-2 !py-2 text-center text-sm"
                    inputMode="decimal"
                    placeholder={label}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                  />
                ))}
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Check it against the packet. Fixing it once binds these numbers to the
                barcode — every later scan skips the databases.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="btn-secondary !py-2 text-xs"
                  onClick={() => {
                    onAdd(verifiedItem());
                    onClose();
                  }}
                >
                  Add once
                </button>
                <button
                  type="button"
                  className="btn-accent !py-2 text-xs"
                  onClick={() => void keepAndAdd()}
                >
                  Save as mine &amp; add
                </button>
              </div>
              {saveNote ? (
                <p className="text-[11px] text-[var(--yellow)]">{saveNote}</p>
              ) : null}
            </div>
          ) : null}

          {ai ? (
            <div className="space-y-2 rounded-md border border-[var(--blue)]/40 bg-[var(--blue)]/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--blue)]">
                  {ai.read ? "Read off the label" : "Estimated"}
                  {ai.confidence !== "high" ? " · check it" : ""}
                </p>
                <button
                  type="button"
                  className="text-[11px] font-bold text-[var(--muted)]"
                  onClick={() => setAi(null)}
                >
                  Clear
                </button>
              </div>

              {ai.items.length === 0 ? (
                <p className="text-[12.5px] text-[var(--muted)]">
                  {ai.note || "Nothing to log from that."}
                </p>
              ) : (
                <>
                  {ai.items.map((item, i) => (
                    <button
                      key={`${item.name}-${i}`}
                      type="button"
                      onClick={() => addAi(item, ai.items.length === 1)}
                      className="w-full rounded-md bg-[var(--surface)] p-2.5 text-left active:opacity-80"
                    >
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="truncate text-[11px] text-[var(--muted)]">
                        {[item.brand, item.serving_label].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-0.5 font-mono text-[11.5px] tabular-nums text-[var(--text)]">
                        {Math.round(item.calories)} cal · {Math.round(item.protein)}p ·{" "}
                        {Math.round(item.carbs)}c · {Math.round(item.fat)}f
                      </p>
                      {item.assumption ? (
                        <p className="mt-0.5 text-[11px] text-[var(--yellow)]">{item.assumption}</p>
                      ) : null}
                    </button>
                  ))}
                  {ai.items.length > 1 ? (
                    <button
                      type="button"
                      className="btn-accent w-full !py-2 text-xs"
                      onClick={() => {
                        ai.items.forEach((item) => addAi(item, false));
                        onClose();
                      }}
                    >
                      Add all {ai.items.length}
                    </button>
                  ) : null}
                </>
              )}
              {ai.note && ai.items.length ? (
                <p className="text-[11px] text-[var(--muted)]">{ai.note}</p>
              ) : null}
            </div>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPhoto(f);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPhoto(f);
              e.target.value = "";
            }}
          />

          {scanning ? (
            <div className="space-y-2">
              <video ref={videoRef} className="w-full rounded-md bg-black" muted playsInline />
              <p className="text-center text-[11px] text-[var(--muted)]">
                Point at a barcode. On iPhone, photo/barcode type-in works more reliably.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary flex-1 !py-2 text-xs"
                  onClick={() => {
                    const c = window.prompt("Enter barcode numbers");
                    if (c) {
                      stopScan();
                      void lookupCode(c);
                    }
                  }}
                >
                  Type barcode
                </button>
                <button type="button" className="btn-secondary flex-1 !py-2 text-xs" onClick={stopScan}>
                  Stop
                </button>
              </div>
            </div>
          ) : null}

          {manual ? (
            <div className="space-y-2 rounded-md border border-[var(--border)] p-3">
              <input className="field !py-2" placeholder="Food name" value={mName} onChange={(e) => setMName(e.target.value)} />
              <div className="grid grid-cols-4 gap-2">
                <input className="field !px-2 !py-2 text-center text-sm" placeholder="Cal" inputMode="numeric" value={mCal} onChange={(e) => setMCal(e.target.value)} />
                <input className="field !px-2 !py-2 text-center text-sm" placeholder="P" inputMode="numeric" value={mPro} onChange={(e) => setMPro(e.target.value)} />
                <input className="field !px-2 !py-2 text-center text-sm" placeholder="C" inputMode="numeric" value={mCarb} onChange={(e) => setMCarb(e.target.value)} />
                <input className="field !px-2 !py-2 text-center text-sm" placeholder="F" inputMode="numeric" value={mFat} onChange={(e) => setMFat(e.target.value)} />
              </div>
              <button type="button" className="btn-accent w-full !py-2" onClick={addManual}>
                Add custom
              </button>
            </div>
          ) : null}

          {loading ? <p className="text-sm text-[var(--muted)]">Searching…</p> : null}
          {error ? <p className="text-sm text-[var(--yellow)]">{error}</p> : null}

          <div className="space-y-2 pb-4">
            {hits.map((f) => (
              <button
                key={f.id + f.name}
                type="button"
                onClick={() => addHit(f)}
                className="flex w-full items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-left active:opacity-80"
              >
                {f.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.imageUrl} alt="" className="h-12 w-12 rounded-[4px] object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-[4px] bg-[var(--raised)] text-lg">
                    🍽️
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{f.name}</p>
                  <p className="truncate text-[11px] text-[var(--muted)]">
                    {[f.brand, f.servingLabel].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--blue)]">
                    {f.calories} cal · {f.protein}p · {f.carbs}c · {f.fat}f
                  </p>
                </div>
              </button>
            ))}
            {!loading && q && hits.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No hits — try Manual.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
