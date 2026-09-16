/**
 * Barcode reading that works on an iPhone.
 *
 * Chrome ships a native BarcodeDetector; Safari does not, and without a
 * fallback the camera button just ends in a "type the numbers" prompt. ZXing
 * decodes the same formats in JavaScript, so it is loaded on demand — it is a
 * sizeable library and most sessions never open the food logger.
 */

const FORMAT_NAMES = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

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
  ]);
  return new BrowserMultiFormatReader(hints);
}

/** Read a barcode out of a still photo. Returns null when there isn't one. */
export async function readBarcodeFromImage(file: File): Promise<string | null> {
  const native = nativeDetector();
  if (native && "createImageBitmap" in globalThis) {
    try {
      const bmp = await createImageBitmap(file);
      const codes = await native.detect(bmp);
      bmp.close();
      const hit = codes?.[0]?.rawValue;
      if (hit) return String(hit);
    } catch {
      /* try ZXing instead */
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const reader = await zxingReader();
    const result = await reader.decodeFromImageUrl(url);
    return result?.getText() ?? null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
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
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // ~6 frames a second is plenty for a barcode and leaves the phone responsive.
  const tick = async () => {
    if (!alive()) return;
    if (video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        const result = reader.decodeFromCanvas(canvas);
        const text = result?.getText();
        if (text) return onFound(text);
      } catch {
        /* no code in this frame */
      }
    }
    setTimeout(tick, 160);
  };
  void tick();
}
