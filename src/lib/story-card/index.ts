"use client";

import { encodeQrMatrix } from "@/lib/qr";

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
      photoUrl?: string | null;
      qrUrl?: string | null;
      filename?: string;
    }
  | {
      kind: "pin";
      siteName: string;
      title: string;
      caption?: string | null;
      uploader?: string | null;
      dateLabel?: string | null;
      category?: string | null;
      imageUrl?: string | null;
      filename?: string;
    }
  | {
      kind: "wrapped";
      siteName: string;
      periodLabel: string;
      headline: string;
      stats: ReadonlyArray<{ label: string; value: string }>;
      highlight?: string | null;
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

/** Muat gambar remote secara aman dengan CORS; kembalikan null bila gagal/terblokir. */
function loadCorsImage(url?: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 5000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth > 0 && img.naturalHeight > 0 ? img : null);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (imgRatio > boxRatio) {
    sw = img.naturalHeight * boxRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / boxRatio;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawQrBadge(
  ctx: CanvasRenderingContext2D,
  url: string,
  x: number,
  y: number,
  boxSize: number,
) {
  try {
    const resolved =
      url.startsWith("/") && typeof window !== "undefined"
        ? `${window.location.origin}${url}`
        : url;
    const matrix = encodeQrMatrix(resolved);
    const pad = 12;
    const inner = boxSize - pad * 2;
    const cell = inner / matrix.size;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(x, y, boxSize, boxSize, 22);
    ctx.fill();

    ctx.fillStyle = "#0a0a0c";
    for (let r = 0; r < matrix.size; r += 1) {
      const row = matrix.modules[r]!;
      for (let c = 0; c < matrix.size; c += 1) {
        if (row[c]) {
          ctx.fillRect(
            x + pad + c * cell,
            y + pad + r * cell,
            Math.ceil(cell),
            Math.ceil(cell),
          );
        }
      }
    }
  } catch {
    // URL melebihi kapasitas QR -> lewati secara anggun tanpa menggagalkan kartu.
  }
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

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.beginPath();
  ctx.roundRect(STORY_WIDTH / 2 - 175, 168, 350, 62, 999);
  ctx.fill();
  ctx.font = "700 24px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText("PESAN ANONIM", STORY_WIDTH / 2, 208);

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

  ctx.textAlign = "left";
  ctx.font = "800 150px Georgia, serif";
  ctx.fillStyle = rgba(primary, 0.75);
  ctx.fillText("“", cardX + 68, cardY + 165);

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
  avatarImg: HTMLImageElement | null,
) {
  paintBackdrop(ctx, primary, accent);

  const cardX = 96;
  const cardY = 230;
  const cardW = STORY_WIDTH - 192;
  const cardH = 1380;

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

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, 300, [72, 72, 0, 0]);
  ctx.clip();
  const bannerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + 300);
  bannerGrad.addColorStop(0, rgba(primary, 0.92));
  bannerGrad.addColorStop(1, rgba(accent, 0.78));
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(cardX, cardY, cardW, 300);
  ctx.restore();

  const avatarX = STORY_WIDTH / 2;
  const avatarY = cardY + 300;
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

  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR - 7, 0, Math.PI * 2);
    ctx.clip();
    drawCoverImage(
      ctx,
      avatarImg,
      avatarX - (avatarR - 7),
      avatarY - (avatarR - 7),
      (avatarR - 7) * 2,
      (avatarR - 7) * 2,
    );
    ctx.restore();
  } else {
    ctx.textAlign = "center";
    ctx.font = "800 96px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(initialsFromName(spec.name), avatarX, avatarY + 34);
  }

  ctx.textAlign = "center";
  ctx.font = "800 60px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  const nameLines = wrapLines(ctx, spec.name, cardW - 120, 2);
  let cursorY = avatarY + avatarR + 92;
  for (const line of nameLines) {
    ctx.fillText(line, avatarX, cursorY);
    cursorY += 72;
  }

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
    cursorY += 104;
  } else {
    cursorY += 34;
  }

  const bioText =
    spec.bio?.trim() || `Bagian dari keluarga besar ${spec.siteName}.`;
  ctx.font = "500 35px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
  const bioLines = wrapLines(ctx, `“${bioText}”`, cardW - 150, spec.qrUrl ? 4 : 6);
  for (const line of bioLines) {
    ctx.fillText(line, avatarX, cursorY);
    cursorY += 50;
  }

  if (spec.qrUrl) {
    const qrSize = 188;
    const qrX = cardX + cardW - qrSize - 64;
    const qrY = cardY + cardH - qrSize - 56;
    drawQrBadge(ctx, spec.qrUrl, qrX, qrY, qrSize);

    ctx.textAlign = "left";
    ctx.font = "700 26px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.fillText("Pindai QR Profil", cardX + 64, qrY + 82);
    if (spec.joinedLabel) {
      ctx.font = "500 23px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.54)";
      ctx.fillText(spec.joinedLabel, cardX + 64, qrY + 124);
    }
  } else if (spec.joinedLabel) {
    ctx.textAlign = "center";
    ctx.font = "600 24px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
    ctx.fillText(spec.joinedLabel, avatarX, cardY + cardH - 64);
  }

  paintFooterBrand(ctx, spec.siteName, primary);
}

function paintPinCard(
  ctx: CanvasRenderingContext2D,
  spec: Extract<StoryCardSpec, { kind: "pin" }>,
  primary: RgbTuple,
  accent: RgbTuple,
  photoImg: HTMLImageElement | null,
) {
  paintBackdrop(ctx, primary, accent);

  const cardX = 88;
  const cardY = 170;
  const cardW = STORY_WIDTH - 176;
  const cardH = 1440;

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

  // Bingkai media besar di bagian atas
  const mediaX = cardX + 36;
  const mediaY = cardY + 36;
  const mediaW = cardW - 72;
  const mediaH = 980;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mediaX, mediaY, mediaW, mediaH, 48);
  ctx.clip();
  if (photoImg) {
    drawCoverImage(ctx, photoImg, mediaX, mediaY, mediaW, mediaH);
  } else {
    const fallbackGrad = ctx.createLinearGradient(mediaX, mediaY, mediaX + mediaW, mediaY + mediaH);
    fallbackGrad.addColorStop(0, rgba(primary, 0.85));
    fallbackGrad.addColorStop(1, rgba(accent, 0.65));
    ctx.fillStyle = fallbackGrad;
    ctx.fillRect(mediaX, mediaY, mediaW, mediaH);
  }
  ctx.restore();

  if (spec.category) {
    ctx.textAlign = "left";
    ctx.font = "700 24px system-ui, -apple-system, sans-serif";
    const chipText = spec.category.toUpperCase();
    const chipW = Math.min(mediaW - 48, ctx.measureText(chipText).width + 52);
    ctx.fillStyle = "rgba(10, 10, 14, 0.65)";
    ctx.beginPath();
    ctx.roundRect(mediaX + 28, mediaY + 28, chipW, 56, 28);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(chipText, mediaX + 54, mediaY + 64);
  }

  let textY = mediaY + mediaH + 86;
  ctx.textAlign = "left";
  ctx.font = "800 50px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  const titleLines = wrapLines(ctx, spec.title, mediaW - 24, 2);
  for (const line of titleLines) {
    ctx.fillText(line, mediaX + 12, textY);
    textY += 62;
  }

  if (spec.caption) {
    textY += 6;
    ctx.font = "500 32px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    const capLines = wrapLines(ctx, spec.caption, mediaW - 24, 3);
    for (const line of capLines) {
      ctx.fillText(line, mediaX + 12, textY);
      textY += 44;
    }
  }

  const meta = [spec.uploader, spec.dateLabel].filter(Boolean).join("  ·  ");
  if (meta) {
    ctx.font = "600 25px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.52)";
    ctx.fillText(meta, mediaX + 12, cardY + cardH - 52);
  }

  paintFooterBrand(ctx, spec.siteName, primary);
}

function paintWrappedCard(
  ctx: CanvasRenderingContext2D,
  spec: Extract<StoryCardSpec, { kind: "wrapped" }>,
  primary: RgbTuple,
  accent: RgbTuple,
) {
  paintBackdrop(ctx, primary, accent);

  ctx.textAlign = "center";
  ctx.fillStyle = rgba(primary, 0.25);
  ctx.beginPath();
  ctx.roundRect(STORY_WIDTH / 2 - 210, 160, 420, 64, 999);
  ctx.fill();
  ctx.font = "700 26px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`KILAS BALIK · ${spec.periodLabel.toUpperCase()}`, STORY_WIDTH / 2, 202);

  ctx.font = "800 66px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  const headLines = wrapLines(ctx, spec.headline, STORY_WIDTH - 180, 2);
  let y = 324;
  for (const line of headLines) {
    ctx.fillText(line, STORY_WIDTH / 2, y);
    y += 78;
  }

  // Grid 2x2 ubin statistik kaca
  const gridX = 96;
  const gridY = y + 36;
  const gap = 32;
  const tileW = (STORY_WIDTH - 192 - gap) / 2;
  const tileH = 310;
  const items = spec.stats.slice(0, 4);

  items.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const tx = gridX + col * (tileW + gap);
    const ty = gridY + row * (tileH + gap);

    ctx.fillStyle = "rgba(255, 255, 255, 0.09)";
    ctx.beginPath();
    ctx.roundRect(tx, ty, tileW, tileH, 48);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "800 94px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(item.value, tx + tileW / 2, ty + 168);

    ctx.font = "600 28px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
    ctx.fillText(item.label, tx + tileW / 2, ty + 236);
  });

  if (spec.highlight) {
    const boxY = gridY + tileH * 2 + gap * 2 + 24;
    ctx.fillStyle = rgba(primary, 0.2);
    ctx.beginPath();
    ctx.roundRect(gridX, boxY, STORY_WIDTH - 192, 210, 48);
    ctx.fill();
    ctx.strokeStyle = rgba(primary, 0.48);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "600 34px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#ffffff";
    const lines = wrapLines(ctx, spec.highlight, STORY_WIDTH - 260, 3);
    let hy = boxY + 86;
    for (const line of lines) {
      ctx.fillText(line, STORY_WIDTH / 2, hy);
      hy += 48;
    }
  }

  paintFooterBrand(ctx, spec.siteName, primary);
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Gagal membuat gambar kartu Story."));
        },
        "image/png",
        0.95,
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Merender kartu Story 9:16 (1080×1920 PNG) di sisi klien memakai warna tema aktif.
 * Jika gambar remote terkena CORS/tainted canvas, otomatis merender ulang dengan
 * fallback gradien/inisial agar ekspor tidak pernah gagal.
 */
export async function renderStoryCardBlob(spec: StoryCardSpec): Promise<Blob> {
  const primary = readThemeRgbVar("--primary", { r: 230, g: 0, b: 35 });
  const accent = readThemeRgbVar("--accent", primary);

  const renderAttempt = async (allowRemoteImage: boolean): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = STORY_WIDTH;
    canvas.height = STORY_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Kanvas tidak tersedia di perangkat ini.");

    if (spec.kind === "quote") {
      paintQuoteCard(ctx, spec, primary, accent);
    } else if (spec.kind === "member") {
      const avatarImg = allowRemoteImage ? await loadCorsImage(spec.photoUrl) : null;
      paintMemberCard(ctx, spec, primary, accent, avatarImg);
    } else if (spec.kind === "pin") {
      const photoImg = allowRemoteImage ? await loadCorsImage(spec.imageUrl) : null;
      paintPinCard(ctx, spec, primary, accent, photoImg);
    } else {
      paintWrappedCard(ctx, spec, primary, accent);
    }

    return canvasToPngBlob(canvas);
  };

  try {
    return await renderAttempt(true);
  } catch {
    return renderAttempt(false);
  }
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
