/** Buat canvas dengan dimensi integer positif untuk seluruh pipeline editor. */
export function createCanvas(
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}
