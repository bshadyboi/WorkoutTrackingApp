"use client";

import { useEffect, useRef, useState } from "react";
import type { FoodHit } from "@/lib/foods";

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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });

      // Prefer BarcodeDetector when available (Chrome/Android; limited on iOS)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BD = (window as any).BarcodeDetector;
      if (BD) {
        const detector = new BD({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
        const tick = async () => {
          if (!videoRef.current || !streamRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes?.[0]?.rawValue) {
              stopScan();
              await lookupCode(String(codes[0].rawValue));
              return;
            }
          } catch {
            /* keep scanning */
          }
          if (streamRef.current) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    } catch {
      setError("Camera blocked — use barcode type-in or photo from camera roll.");
      setScanning(false);
    }
  }

  async function lookupCode(code: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/foods/search?barcode=${encodeURIComponent(code)}`
      );
      const data = await res.json();
      const foods = (data.foods ?? []) as FoodHit[];
      if (!foods.length) {
        setError(`No product for barcode ${code}`);
        setHits([]);
      } else {
        setHits(foods);
        setQ(foods[0].name);
      }
    } catch {
      setError("Barcode lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function onPhoto(file: File) {
    setError("");
    // Try BarcodeDetector on bitmap; else prompt for manual barcode
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BD = (window as any).BarcodeDetector;
      if (BD && "createImageBitmap" in window) {
        const bmp = await createImageBitmap(file);
        const detector = new BD({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
        });
        const codes = await detector.detect(bmp);
        bmp.close();
        if (codes?.[0]?.rawValue) {
          await lookupCode(String(codes[0].rawValue));
          return;
        }
      }
      const typed = window.prompt(
        "Couldn’t read a barcode from that photo. Type the barcode numbers:"
      );
      if (typed) await lookupCode(typed);
      else setError("No barcode found — search by name instead.");
    } catch {
      const typed = window.prompt("Type the barcode numbers from the package:");
      if (typed) await lookupCode(typed);
    }
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
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl border border-[var(--border)] bg-[var(--card)] sm:rounded-3xl">
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
          <button
            type="button"
            className="w-full rounded-lg bg-[var(--raised)] py-2 text-xs font-semibold text-[var(--blue)]"
            onClick={() => setManual((v) => !v)}
          >
            ✎ Manual entry
          </button>
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
              <video ref={videoRef} className="w-full rounded-xl bg-black" muted playsInline />
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
            <div className="space-y-2 rounded-xl border border-[var(--border)] p-3">
              <input className="field !py-2" placeholder="Food name" value={mName} onChange={(e) => setMName(e.target.value)} />
              <div className="grid grid-cols-4 gap-2">
                <input className="field !px-2 !py-2 text-center text-sm" placeholder="Cal" inputMode="numeric" value={mCal} onChange={(e) => setMCal(e.target.value)} />
                <input className="field !px-2 !py-2 text-center text-sm" placeholder="P" inputMode="numeric" value={mPro} onChange={(e) => setMPro(e.target.value)} />
                <input className="field !px-2 !py-2 text-center text-sm" placeholder="C" inputMode="numeric" value={mCarb} onChange={(e) => setMCarb(e.target.value)} />
                <input className="field !px-2 !py-2 text-center text-sm" placeholder="F" inputMode="numeric" value={mFat} onChange={(e) => setMFat(e.target.value)} />
              </div>
              <button type="button" className="btn-green w-full !py-2" onClick={addManual}>
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
                className="flex w-full items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left active:opacity-80"
              >
                {f.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--raised)] text-lg">
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
