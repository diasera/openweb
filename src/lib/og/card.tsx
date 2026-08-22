/**
 * Renderer kartu sosial (Open Graph) terpusat untuk /api/og dan
 * /api/og/blog/[slug]. Dijalankan lewat ImageResponse (Satori): hanya
 * mendukung subset flexbox, jadi gaya dijaga inline dan sederhana.
 */

const CARD_PADDING = 72;

function truncate(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function ogCardFontSize(title: string) {
  if (title.length <= 48) return 68;
  if (title.length <= 80) return 56;
  return 46;
}

export function renderOgCard({
  siteName,
  title,
  description,
  primaryHex = "#e60023",
}: {
  siteName: string;
  title: string;
  description?: string | null;
  primaryHex?: string;
}) {
  const safeTitle = truncate(title, 110) || siteName;
  const safeDescription = description ? truncate(description, 180) : "";
  const initial = siteName.trim().charAt(0).toLocaleUpperCase() || "·";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: CARD_PADDING,
        background: `linear-gradient(135deg, #0a0a0c 0%, #17171c 62%, ${primaryHex}33 100%)`,
        color: "#fafafa",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 9999,
            background: primaryHex,
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 38,
            fontWeight: 700,
          }}
        >
          {initial}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 34, fontWeight: 600 }}>{siteName}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            fontSize: ogCardFontSize(safeTitle),
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-1.5",
            maxWidth: 1040,
          }}
        >
          {safeTitle}
        </div>
        {safeDescription ? (
          <div style={{ fontSize: 30, lineHeight: 1.4, color: "#a1a1aa", maxWidth: 980 }}>
            {safeDescription}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          height: 10,
          borderRadius: 9999,
          background: primaryHex,
          width: "100%",
        }}
      />
    </div>
  );
}
