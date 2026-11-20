import { encodeQrMatrix, qrMatrixToSvgPath } from "@/lib/qr";
import { cn } from "@/lib/utils/cn";

/**
 * Komponen QR Code vektor (SVG tunggal) offline bebas dependensi eksternal.
 * Memakai quiet zone minimal 2 modul dan warna kontras tegas agar cepat dipindai
 * kamera iOS maupun Android di mode terang dan gelap.
 */
export function QrCodeSvg({
  value,
  label,
  size = 160,
  className,
}: {
  value: string;
  label: string;
  size?: number;
  className?: string;
}) {
  const quietZone = 2;
  const matrix = encodeQrMatrix(value);
  const viewSize = matrix.size + quietZone * 2;
  const path = qrMatrixToSvgPath(matrix, quietZone);

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      shapeRendering="crispEdges"
      className={cn("block rounded-xl bg-white p-1.5 text-[#0a0a0c]", className)}
    >
      <rect width={viewSize} height={viewSize} fill="#ffffff" />
      <path d={path} fill="currentColor" />
    </svg>
  );
}
