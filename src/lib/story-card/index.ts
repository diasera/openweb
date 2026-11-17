"use client";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

export type StoryCardSpec =
  | {
      kind: "quote";
      siteName: string;
      text: string;
      dateLabel?: string;
      songLabel?: string | null;
      filename?: string;
    }
  | {
      kind: "member";
      siteName: string;
      name: string;
      role?: string | null;
      identifier?: string | null;
      bio?: string | null;
      joinedLabel?: string | null;
      filename?: string;
    };

interface RgbTuple {
  r: number;
  g: number;
  b: number;
}

function readThemeRgbVar(name: string, fallback: RgbTuple): RgbTuple {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const parts = raw.split(/\s+/).map(Number);
  if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
    return { r: parts[0]!, g: parts[1]!, b: parts[2]! };
  }
  return fallback;
}

function rgba({ r, g, b }: RgbTuple, alpha = 1): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "·";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0] ?? ""}${words[words.length - 1]![0] ?? ""}`.toUpperCase();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) {
          lines.push(current);
          if (lines.length >= maxLines) {
            lines[maxLines - 1] = `${lines[maxLines - 1]!.replace(/[.,;:!?…]*$/, "")}…`;
            return lines;
          }
        }
        current = word;
      }
    }
    if (current) {
      lines.push(current);
      if (lines.length >= maxLines && paragraph !== paragraphs.at(-1)) {
        lines[maxLines - 1] = `${lines[maxLines - 1]!.replace(/[.,;:!?…]*$/, "")}…`;
        return lines;
      }
    }
  }
  return lines.slice(0, maxLines);
}

function paintBackdrop(
  ctx: CanvasRenderingContext2D,
  primary: RgbTuple,
  accent: RgbTuple,
) {
  ctx.fillStyle = "#08080c";
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const topGlow = ctx.createRadialGradient(180, 210, 40, 220, 260, 920);
  topGlow.addColorStop(0, rgba(primary, 0.56));
  topGlow.addColorStop(0.55, rgba(primary, 0.18));
  topGlow.addColorStop(1, "rgba(8, 8, 12, 0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const bottomGlow = ctx.createRadialGradient(920, 1680, 60, 880, 1620, 960);
  bottomGlow.addColorStop(0, rgba(accent, 0.48));
  bottomGlow.addColorStop(0.6, rgba(accent, 0.14));
  bottomGlow.addColorStop(1, "rgba(8, 8, 12, 0)");
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  // Bingkai tipis kaca spekular di sekeliling kanvas
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(48, 48, STORY_WIDTH - 96, STORY_HEIGHT - 96, 64);
  ctx.stroke();
}

function paintFooterBrand(
  ctx: CanvasRenderingContext2D,
  siteName: string,
  primary: RgbTuple,
) {
  const y = STORY_HEIGHT - 165;
  const upper = siteName.toUpperCase();
  ctx.font = "700 30px system-ui, -apple-system, sans-serif";
  const labelWidth = ctx.measureText(upper).width;
  const dotRadius = 7;
  const gap = 16;
  const totalWidth = dotRadius * 2 + gap + labelWidth;
  const startX = (STORY_WIDTH - totalWidth) / 2;

  ctx.fillStyle = rgba(primary, 0.95);
  ctx.beginPath();
  ctx.arc(startX + dotRadius, y - 10, dotRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.textAlign = "left";
  ctx.fillText(upper, startX + dotRadius * 2 + gap, y);

  ctx.font = "500 22px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
  ctx.textAlign = "center";
  ctx.fillText("Dibagikan dari ruang komunitas resmi", STORY_WIDTH / 2, y + 40);
}

function paintQuoteCard(
  ctx: CanvasRenderingContext2D,
  spec: Extract<StoryCardSpec, { kind: "quote" }>,
  primary: RgbTuple,
  accent: RgbTuple,
) {
  paintBackdrop(ctx, primary, accent);

  // Kapsul label atas
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.beginPath();
  ctx.roundRect(STORY_WIDTH / 2 - 175, 168, 350, 62, 999);
  ctx.fill();
  ctx.font = "700 24px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText("PESAN ANONIM", STORY_WIDTH / 2, 208);

  // Kartu kaca utama di tengah
  const cardX = 96;
  const cardY = 320;
  const cardW = STORY_WIDTH - 192;
  const cardH = 1220;

  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, "rgba(255, 255, 255, 0.12)");
  cardGrad.addColorStop(1, "rgba(255, 255, 255, 0.05)");
  ctx.fillStyle = cardGrad;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 68);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Tanda kutip dekoratif
  ctx.textAlign = "left";
  ctx.font = "800 150px Georgia, serif";
  ctx.fillStyle = rgba(primary, 0.75);
  ctx.fillText("“", cardX + 68, cardY + 165);

  // Ukuran huruf dinamis mengikuti panjang pesan
  const length = spec.text.length;
  const fontSize = length <= 90 ? 60 : length <= 190 ? 48 : length <= 320 ? 40 : 34;
  const lineHeight = Math.round(fontSize * 1.42);
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "#ffffff";

  const lines = wrapLines(ctx, spec.text, cardW - 148, 12);
  let textY = cardY + 250;
  for (const line of lines) {
    ctx.fillText(line, cardX + 74, textY);
    textY += lineHeight;
  }

  // Kapsul Songfess jika ada lagu terlampir
  if (spec.songLabel) {
    const pillY = cardY + cardH - 210;
    ctx.fillStyle = rgba(primary, 0.24);
    ctx.beginPath();
    ctx.roundRect(cardX + 74, pillY, cardW - 148, 86, 43);
    ctx.fill();
    ctx.strokeStyle = rgba(primary, 0.55);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "700 28px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#ffffff";
    const clippedSong =
      spec.songLabel.length > 42 ? `${spec.songLabel.slice(0, 41)}…` : spec.songLabel;
    ctx.fillText(`♪  ${clippedSong}`, cardX + 112, pillY + 53);
  }

  if (spec.dateLabel) {
    ctx.font = "500 25px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillText(spec.dateLabel, cardX + 74, cardY + cardH - 66);
  }

  paintFooterBrand(ctx, spec.siteName, primary);
}

function paintMemberCard(
  ctx: CanvasRenderingContext2D,
  spec: Extract<StoryCardSpec, { kind: "member" }>,
  primary: RgbTuple,
  accent: RgbTuple,
) {
  paintBackdrop(ctx, primary, accent);

  const cardX = 96;
  const cardY = 260;
  const cardW = STORY_WIDTH - 192;
  const cardH = 1320;

  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, "rgba(255, 255, 255, 0.13)");
  cardGrad.addColorStop(1, "rgba(255, 255, 255, 0.05)");
  ctx.fillStyle = cardGrad;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 72);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Banner mesh di bagian atas kartu
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, 320, [72, 72, 0, 0]);
  ctx.clip();
  const bannerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + 320);
  bannerGrad.addColorStop(0, rgba(primary, 0.92));
  bannerGrad.addColorStop(1, rgba(accent, 0.78));
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(cardX, cardY, cardW, 320);
  ctx.restore();

  // Lingkaran avatar bercincin
  const avatarX = STORY_WIDTH / 2;
  const avatarY = cardY + 320;
  const avatarR = 132;

  ctx.fillStyle = "#121218";
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 14, 0, Math.PI * 2);
  ctx.fill();

  const ringGrad = ctx.createLinearGradient(
    avatarX - avatarR,
    avatarY - avatarR,
    avatarX + avatarR,
    avatarY + avatarR,
  );
  ringGrad.addColorStop(0, rgba(primary, 1));
  ringGrad.addColorStop(1, rgba(accent, 1));
  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.font = "800 96px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(initialsFromName(spec.name), avatarX, avatarY + 34);

  // Nama anggota
  ctx.font = "800 62px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  const nameLines = wrapLines(ctx, spec.name, cardW - 120, 2);
  let cursorY = avatarY + avatarR + 96;
  for (const line of nameLines) {
    ctx.fillText(line, avatarX, cursorY);
    cursorY += 74;
  }

  // Peran & Nomor Identitas
  const metaParts = [spec.role, spec.identifier].filter(Boolean);
  if (metaParts.length > 0) {
    const badgeLabel = metaParts.join("  ·  ");
    ctx.font = "700 28px system-ui, -apple-system, sans-serif";
    const badgeW = Math.min(cardW - 120, ctx.measureText(badgeLabel).width + 76);
    ctx.fillStyle = rgba(primary, 0.24);
    ctx.beginPath();
    ctx.roundRect(avatarX - badgeW / 2, cursorY - 12, badgeW, 60, 30);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(badgeLabel, avatarX, cursorY + 28);
    cursorY += 108;
  } else {
    cursorY += 36;
  }

  // Kutipan bio buku angkatan
  const bioText =
    spec.bio?.trim() || `Bagian dari keluarga besar ${spec.siteName}.`;
  ctx.font = "500 36px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
  const bioLines = wrapLines(ctx, `“${bioText}”`, cardW - 150, 6);
  for (const line of bioLines) {
    ctx.fillText(line, avatarX, cursorY);
    cursorY += 52;
  }

  if (spec.joinedLabel) {
    ctx.font = "600 24px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
    ctx.fillText(spec.joinedLabel, avatarX, cardY + cardH - 64);
  }

  paintFooterBrand(ctx, spec.siteName, primary);
}

/**
 * Merender kartu Story 9:16 (1080×1920 PNG) di sisi klien memakai warna tema aktif.
 */
export async function renderStoryCardBlob(spec: StoryCardSpec): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kanvas tidak tersedia di perangkat ini.");

  const primary = readThemeRgbVar("--primary", { r: 230, g: 0, b: 35 });
  const accent = readThemeRgbVar("--accent", primary);

  if (spec.kind === "quote") {
    paintQuoteCard(ctx, spec, primary, accent);
  } else {
    paintMemberCard(ctx, spec, primary, accent);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gagal membuat gambar kartu Story."));
      },
      "image/png",
      0.95,
    );
  });
}

function safeStoryFilename(raw?: string): string {
  const base = (raw ?? "story-komunitas")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "story-komunitas"}-9x16.png`;
}

/**
 * Membagikan Kartu Story 9:16 lewat Web Share API (Instagram/WhatsApp Story di HP)
 * atau langsung mengunduh berkas PNG resolusi tinggi di desktop.
 */
export async function shareOrDownloadStoryCard(
  spec: StoryCardSpec,
): Promise<"shared" | "downloaded"> {
  const blob = await renderStoryCardBlob(spec);
  const filename = safeStoryFilename(spec.filename);
  const file = new File([blob], filename, { type: "image/png" });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: spec.siteName,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "shared";
      }
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2500);
  }
  return "downloaded";
}
