export type CropTransform = {
  /** Extra zoom on top of cover-fit (1 = cover, >1 = zoom in). */
  scale: number;
  /** Pan in viewport pixels. */
  offsetX: number;
  offsetY: number;
};

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Compute cover-fit scale for image inside viewport. */
export function coverScale(imgW: number, imgH: number, viewW: number, viewH: number): number {
  return Math.max(viewW / imgW, viewH / imgH);
}

/**
 * Export the visible viewport region as a JPEG data URI.
 * Viewport is treated as a square crop frame (viewSize × viewSize).
 */
export async function exportCroppedImage(
  src: string,
  viewSize: number,
  transform: CropTransform,
  outputMax: number,
  quality = 0.88,
): Promise<string> {
  const img = await loadImage(src);
  const base = coverScale(img.width, img.height, viewSize, viewSize);
  const displayScale = base * transform.scale;

  const dispW = img.width * displayScale;
  const dispH = img.height * displayScale;
  const imgLeft = viewSize / 2 + transform.offsetX - dispW / 2;
  const imgTop = viewSize / 2 + transform.offsetY - dispH / 2;

  let sx = (0 - imgLeft) / displayScale;
  let sy = (0 - imgTop) / displayScale;
  let sw = viewSize / displayScale;
  let sh = viewSize / displayScale;

  sx = Math.max(0, sx);
  sy = Math.max(0, sy);
  sw = Math.min(sw, img.width - sx);
  sh = Math.min(sh, img.height - sy);

  const side = Math.min(sw, sh);
  sw = side;
  sh = side;

  const out = Math.min(outputMax, Math.round(side));
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, out, out);
  return canvas.toDataURL("image/jpeg", quality);
}
