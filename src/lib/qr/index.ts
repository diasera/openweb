/**
 * Encoder QR Code ISO/IEC 18004 (Byte mode, Error Correction Level M, Versi 1–10)
 * bebas dependensi eksternal. Dipakai bersama oleh `<QrCodeSvg>` (Kartu Anggota
 * Digital) dan mesin kanvas `lib/story-card` (Kartu Story 9:16) sehingga 100%
 * bekerja secara offline di PWA tanpa membocorkan URL ke API pihak ketiga.
 */

export interface QrMatrix {
  size: number;
  version: number;
  modules: boolean[][];
}

interface VersionSpec {
  version: number;
  totalCodewords: number;
  ecPerBlock: number;
  blocks: readonly [count: number, dataCodewords: number][];
  alignments: readonly number[];
}

// Tabel kapasitas resmi ISO/IEC 18004 untuk Error Correction Level M (15% pemulihan).
const VERSION_SPECS: readonly VersionSpec[] = [
  { version: 1, totalCodewords: 26, ecPerBlock: 10, blocks: [[1, 16]], alignments: [] },
  { version: 2, totalCodewords: 44, ecPerBlock: 16, blocks: [[1, 28]], alignments: [6, 18] },
  { version: 3, totalCodewords: 70, ecPerBlock: 26, blocks: [[1, 44]], alignments: [6, 22] },
  { version: 4, totalCodewords: 100, ecPerBlock: 18, blocks: [[2, 32]], alignments: [6, 26] },
  { version: 5, totalCodewords: 134, ecPerBlock: 24, blocks: [[2, 43]], alignments: [6, 30] },
  { version: 6, totalCodewords: 172, ecPerBlock: 16, blocks: [[4, 27]], alignments: [6, 34] },
  { version: 7, totalCodewords: 196, ecPerBlock: 18, blocks: [[4, 31]], alignments: [6, 22, 38] },
  { version: 8, totalCodewords: 242, ecPerBlock: 22, blocks: [[2, 38], [2, 39]], alignments: [6, 24, 42] },
  { version: 9, totalCodewords: 292, ecPerBlock: 22, blocks: [[3, 36], [2, 37]], alignments: [6, 26, 46] },
  { version: 10, totalCodewords: 346, ecPerBlock: 26, blocks: [[4, 43], [1, 44]], alignments: [6, 28, 50] },
];

// Tabel GF(256) dengan polinomial primitif x^8 + x^4 + x^3 + x^2 + 1 (0x11d).
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = value;
    GF_LOG[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!;
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < degree; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i]!;
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j]!;
      next[j + 1] ^= gfMul(poly[j]!, factor);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const rem = new Uint8Array(ecCount);
  for (const byte of data) {
    const factor = byte ^ rem[0]!;
    rem.copyWithin(0, 1);
    rem[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j += 1) {
        rem[j] ^= gfMul(gen[j + 1]!, factor);
      }
    }
  }
  return rem;
}

function totalDataCodewords(spec: VersionSpec): number {
  return spec.blocks.reduce((sum, [count, size]) => sum + count * size, 0);
}

function pickVersion(byteLength: number): VersionSpec {
  for (const spec of VERSION_SPECS) {
    const countBits = spec.version <= 9 ? 8 : 16;
    const capacityBits = totalDataCodewords(spec) * 8;
    const requiredBits = 4 + countBits + byteLength * 8;
    if (requiredBits <= capacityBits) return spec;
  }
  throw new RangeError("Teks QR terlalu panjang (maksimal ~213 byte UTF-8).");
}

function encodeDataCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const dataCapacity = totalDataCodewords(spec);
  const bits: number[] = [];
  const pushBits = (value: number, width: number) => {
    for (let i = width - 1; i >= 0; i -= 1) {
      bits.push((value >>> i) & 1);
    }
  };

  // Mode indicator Byte (0100) + panjang byte
  pushBits(0b0100, 4);
  pushBits(bytes.length, spec.version <= 9 ? 8 : 16);
  for (const b of bytes) pushBits(b, 8);

  // Terminator hingga 4 bit 0
  const maxBits = dataCapacity * 8;
  const term = Math.min(4, maxBits - bits.length);
  for (let i = 0; i < term; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = new Uint8Array(dataCapacity);
  for (let i = 0; i < bits.length / 8; i += 1) {
    let byte = 0;
    for (let b = 0; b < 8; b += 1) {
      byte = (byte << 1) | bits[i * 8 + b]!;
    }
    codewords[i] = byte;
  }

  let padIndex = bits.length / 8;
  const padBytes = [0xec, 0x11];
  let toggle = 0;
  while (padIndex < dataCapacity) {
    codewords[padIndex++] = padBytes[toggle]!;
    toggle ^= 1;
  }

  return codewords;
}

function buildFinalCodewords(data: Uint8Array, spec: VersionSpec): Uint8Array {
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (const [count, blockLen] of spec.blocks) {
    for (let i = 0; i < count; i += 1) {
      const slice = data.subarray(offset, offset + blockLen);
      offset += blockLen;
      dataBlocks.push(slice);
      ecBlocks.push(rsRemainder(slice, spec.ecPerBlock));
    }
  }

  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  const result = new Uint8Array(spec.totalCodewords);
  let out = 0;

  for (let i = 0; i < maxDataLen; i += 1) {
    for (const block of dataBlocks) {
      if (i < block.length) result[out++] = block[i]!;
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i += 1) {
    for (const block of ecBlocks) {
      result[out++] = block[i]!;
    }
  }
  return result;
}

function computeFormatBits(mask: number): number {
  // Error Correction Level M = 00 (ISO/IEC 18004 Tabel 25)
  const data = (0b00 << 3) | mask;
  let rem = data << 10;
  const poly = 0b10100110111;
  for (let i = 14; i >= 10; i -= 1) {
    if ((rem >>> i) & 1) rem ^= poly << (i - 10);
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
}

function computeVersionBits(version: number): number {
  let rem = version << 12;
  const poly = 0b1111100100101;
  for (let i = 17; i >= 12; i -= 1) {
    if ((rem >>> i) & 1) rem ^= poly << (i - 12);
  }
  return (version << 12) | rem;
}

function createBaseMatrix(spec: VersionSpec): {
  modules: boolean[][];
  reserved: boolean[][];
  size: number;
} {
  const size = spec.version * 4 + 17;
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const setFn = (row: number, col: number, dark: boolean) => {
    if (row < 0 || col < 0 || row >= size || col >= size) return;
    modules[row]![col] = dark;
    reserved[row]![col] = true;
  };

  // 3 Finder Patterns + separator putih
  const drawFinder = (top: number, left: number) => {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const dark =
          inside &&
          (r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        setFn(top + r, left + c, dark);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment Patterns (Versi >= 2)
  for (const rCenter of spec.alignments) {
    for (const cCenter of spec.alignments) {
      if (reserved[rCenter]![cCenter]) continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFn(rCenter + dr, cCenter + dc, dist !== 1);
        }
      }
    }
  }

  // Timing Patterns
  for (let i = 8; i < size - 8; i += 1) {
    if (!reserved[6]![i]) setFn(6, i, i % 2 === 0);
    if (!reserved[i]![6]) setFn(i, 6, i % 2 === 0);
  }

  // Dark module wajib + reservasi area Format Info
  setFn(size - 8, 8, true);
  for (let i = 0; i <= 8; i += 1) {
    if (!reserved[8]![i]) reserved[8]![i] = true;
    if (!reserved[i]![8]) reserved[i]![8] = true;
  }
  for (let i = size - 8; i < size; i += 1) {
    reserved[8]![i] = true;
    reserved[i]![8] = true;
  }

  // Version Info (Versi >= 7)
  if (spec.version >= 7) {
    const bits = computeVersionBits(spec.version);
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      setFn(a, b, dark);
      setFn(b, a, dark);
    }
  }

  return { modules, reserved, size };
}

function placeCodewords(
  modules: boolean[][],
  reserved: boolean[][],
  codewords: Uint8Array,
) {
  const size = modules.length;
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5;
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (let delta = 0; delta < 2; delta += 1) {
        const col = rightCol - delta;
        if (reserved[row]![col]) continue;
        let dark = false;
        if (bitIdx < totalBits) {
          const byte = codewords[bitIdx >>> 3]!;
          dark = ((byte >>> (7 - (bitIdx & 7))) & 1) === 1;
          bitIdx += 1;
        }
        modules[row]![col] = dark;
      }
    }
    upward = !upward;
  }
}

function maskCondition(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function applyFormatBits(modules: boolean[][], mask: number) {
  const size = modules.length;
  const bits = computeFormatBits(mask);
  const bitAt = (i: number) => ((bits >>> i) & 1) === 1;

  // Kiri atas (vertikal) & bawah kiri (vertikal)
  for (let i = 0; i <= 5; i += 1) modules[i]![8] = bitAt(i);
  modules[7]![8] = bitAt(6);
  modules[8]![8] = bitAt(7);
  modules[8]![7] = bitAt(8);
  for (let i = 9; i < 15; i += 1) modules[8]![14 - i] = bitAt(i);

  // Bawah kiri + kanan atas
  for (let i = 0; i < 8; i += 1) modules[8]![size - 1 - i] = bitAt(i);
  for (let i = 8; i < 15; i += 1) modules[size - 15 + i]![8] = bitAt(i);
}

function penaltyScore(modules: boolean[][]): number {
  const size = modules.length;
  let score = 0;

  // Aturan 1: deret warna sama >= 5
  const scoreRun = (read: (i: number, j: number) => boolean) => {
    for (let i = 0; i < size; i += 1) {
      let runColor = read(i, 0);
      let runLen = 1;
      for (let j = 1; j < size; j += 1) {
        const cur = read(i, j);
        if (cur === runColor) {
          runLen += 1;
        } else {
          if (runLen >= 5) score += 3 + (runLen - 5);
          runColor = cur;
          runLen = 1;
        }
      }
      if (runLen >= 5) score += 3 + (runLen - 5);
    }
  };
  scoreRun((r, c) => modules[r]![c]!);
  scoreRun((c, r) => modules[r]![c]!);

  // Aturan 2: blok 2×2 warna sama
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const v = modules[r]![c];
      if (
        v === modules[r]![c + 1] &&
        v === modules[r + 1]![c] &&
        v === modules[r + 1]![c + 1]
      ) {
        score += 3;
      }
    }
  }

  // Aturan 4: keseimbangan modul gelap/terang
  let darkCount = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (modules[r]![c]) darkCount += 1;
    }
  }
  const percent = (darkCount * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

/**
 * Menghasilkan matriks QR Code siap pakai (SVG maupun Canvas 2D) untuk URL atau
 * teks UTF-8 hingga ~213 byte.
 */
export function encodeQrMatrix(text: string): QrMatrix {
  const bytes = new TextEncoder().encode(text);
  const spec = pickVersion(bytes.length);
  const data = encodeDataCodewords(bytes, spec);
  const finalCodewords = buildFinalCodewords(data, spec);
  const { modules: base, reserved, size } = createBaseMatrix(spec);
  placeCodewords(base, reserved, finalCodewords);

  let bestModules = base;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = base.map((row, r) =>
      row.map((val, c) =>
        reserved[r]![c] ? val : maskCondition(mask, r, c) ? !val : val,
      ),
    );
    applyFormatBits(candidate, mask);
    const score = penaltyScore(candidate);
    if (score < bestScore) {
      bestScore = score;
      bestModules = candidate;
    }
  }

  return { size, version: spec.version, modules: bestModules };
}

/** Membangun string path SVG tunggal agar DOM tetap ringan (<path d="..."/>). */
export function qrMatrixToSvgPath(matrix: QrMatrix, quietZone = 2): string {
  const parts: string[] = [];
  for (let r = 0; r < matrix.size; r += 1) {
    const row = matrix.modules[r]!;
    for (let c = 0; c < matrix.size; c += 1) {
      if (row[c]) {
        parts.push(`M${c + quietZone},${r + quietZone}h1v1h-1z`);
      }
    }
  }
  return parts.join("");
}
