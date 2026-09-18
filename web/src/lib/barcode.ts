/**
 * Barcode reading that works on an iPhone, in a kitchen, one-handed.
 *
 * Chrome ships a native BarcodeDetector; Safari does not, and without a
 * fallback the camera button just ends in a "type the numbers" prompt. ZXing
 * decodes the same formats in JavaScript, so it is loaded on demand — it is a
 * sizeable library and most sessions never open the food logger.
 *
 * A photographed barcode is a harder problem than a live camera feed: the code
 * is often small in frame, tilted, glossy, or upside down. So a still photo is
 * retried at several sizes, rotations and crops rather than given one attempt.
 */

const FORMAT_NAMES = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];

type NativeDetector = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue?: string }[]>;
};

function nativeDetector(): NativeDetector | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BD = (globalThis as any).BarcodeDetector;
  if (!BD) return null;
  try {
    return new BD({ formats: FORMAT_NAMES });
  } catch {
    return null;
  }
}

async function zxingReader() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]);
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
  ]);
  // Slower, and worth it on a still photo: it searches more of the image and
  // tolerates a code that isn't neatly horizontal.
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints);
}

/** A retail product code: all digits, and one of the standard lengths. */
export function isRetailBarcode(code: string) {
  const digits = code.replace(/\D/g, "");
  return digits === code.trim() && [8, 12, 13, 14].includes(digits.length);
}

type Reader = Awaited<ReturnType<typeof zxingReader>>;

function decodeCanvas(reader: Reader, canvas: HTMLCanvasElement): string | null {
  try {
    return reader.decodeFromCanvas(canvas)?.getText() ?? null;
  } catch {
    return null;
  }
}

/** Draw `source` into a canvas, optionally rotated a quarter turn and cropped. */
function render(
  source: CanvasImageSource,
  width: number,
  height: number,
  opts: { rotate?: boolean; crop?: { x: number; y: number; w: number; h: number }; scale?: number }
) {
  const crop = opts.crop ?? { x: 0, y: 0, w: width, h: height };
  const scale = opts.scale ?? 1;
  const w = Math.max(1, Math.round(crop.w * scale));
  const h = Math.max(1, Math.round(crop.h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = opts.rotate ? h : w;
  canvas.height = opts.rotate ? w : h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (opts.rotate) {
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
  }
  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);
  return canvas;
}

/**
 * Read a barcode out of a still photo. Returns null when there isn't one.
 *
 * Tries, in order of how often it works: the whole frame at two sizes, then
 * each half and the middle band (a barcode is usually the only thing in focus
 * somewhere in the frame), each of those also rotated for a vertical code.
 */
export async function readBarcodeFromImage(file: File): Promise<string | null> {
  let source: CanvasImageSource | null = null;
  let width = 0;
  let height = 0;

  try {
    const bmp = await createImageBitmap(file);
    source = bmp;
    width = bmp.width;
    height = bmp.height;
  } catch {
    // Safari hands back HEIC that createImageBitmap won't take; an <img> tag
    // decodes it natively.
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("decode failed"));
        el.src = url;
      });
      source = img;
      width = img.naturalWidth;
      height = img.naturalHeight;
    } catch {
      return null;
    } finally {
      // Revoked after decode; the drawn pixels are already ours.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
  }

  if (!source || !width || !height) return null;

  const native = nativeDetector();
  if (native) {
    try {
      const hit = (await native.detect(source))?.[0]?.rawValue;
      if (hit) return String(hit);
    } catch {
      /* fall through to ZXing */
    }
  }

  const reader = await zxingReader();
  const full = { x: 0, y: 0, w: width, h: height };
  const regions = [
    full,
    { x: 0, y: 0, w: width, h: Math.round(height / 2) },
    { x: 0, y: Math.round(height / 2), w: width, h: Math.round(height / 2) },
    { x: 0, y: Math.round(height / 4), w: width, h: Math.round(height / 2) },
    { x: 0, y: Math.round(height * 0.6), w: width, h: Math.round(height * 0.4) },
  ];

  for (const crop of regions) {
    for (const scale of [1, 1600 / Math.max(crop.w, crop.h)]) {
      for (const rotate of [false, true]) {
        if (scale > 1.2) continue;
        const canvas = render(source, width, height, { crop, rotate, scale: Math.min(1, scale) });
        if (!canvas) continue;
        const hit = decodeCanvas(reader, canvas);
        if (hit) return hit;
      }
    }
  }

  return null;
}

/**
 * Watch a live camera feed until a barcode appears. `alive` is checked between
 * frames so stopping the camera stops the scan; `onFound` fires once.
 */
export async function watchForBarcode(
  video: HTMLVideoElement,
  alive: () => boolean,
  onFound: (code: string) => void
): Promise<void> {
  const native = nativeDetector();

  if (native) {
    const tick = async () => {
      if (!alive()) return;
      try {
        const codes = await native.detect(video);
        const hit = codes?.[0]?.rawValue;
        if (hit) return onFound(String(hit));
      } catch {
        /* keep looking */
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return;
  }

  const reader = await zxingReader();
  let turn = 0;

  // ~6 frames a second is plenty for a barcode and leaves the phone responsive.
  // Every other frame is tried rotated, for a code held vertically.
  const tick = async () => {
    if (!alive()) return;
    if (video.videoWidth) {
      const canvas = render(video, video.videoWidth, video.videoHeight, {
        rotate: turn % 2 === 1,
      });
      turn++;
      if (canvas) {
        const hit = decodeCanvas(reader, canvas);
        if (hit) return onFound(hit);
      }
    }
    setTimeout(tick, 160);
  };
  void tick();
}
