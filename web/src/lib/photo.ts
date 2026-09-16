/**
 * Shrink a camera photo before it leaves the phone. A full-size frame is
 * several megabytes of gym wifi for detail nothing downstream needs.
 */
export async function shrinkToJpeg(file: File, maxPx = 1024, quality = 0.72): Promise<string> {
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
