import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = join(root, "src/lib/media-formats/registry.ts");
const sniffPath = join(root, "src/lib/media-formats/sniff.ts");
const binaryPath = join(root, "src/lib/media/binary.ts");
const schemaPath = join(root, "supabase/schema.sql");

async function typeScriptModuleUrl(path, dependencies = {}) {
  const source = await readFile(path, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
    fileName: path,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(
    errors.length,
    0,
    `TypeScript tidak dapat membaca ${path}: ${errors
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
      )
      .join("; ")}`,
  );
  let output = result.outputText;
  for (const [specifier, dependencyUrl] of Object.entries(dependencies)) {
    output = output.replaceAll(
      JSON.stringify(specifier),
      JSON.stringify(dependencyUrl),
    );
  }
  const encoded = Buffer.from(output).toString("base64");
  return `data:text/javascript;base64,${encoded}`;
}

async function importTypeScriptModule(path, dependencies) {
  return import(await typeScriptModuleUrl(path, dependencies));
}

const binaryUrl = await typeScriptModuleUrl(binaryPath);
const [schema, registry, sniff] = await Promise.all([
  readFile(schemaPath, "utf8"),
  importTypeScriptModule(registryPath),
  importTypeScriptModule(sniffPath, { "@/lib/media/binary": binaryUrl }),
]);

const {
  AUDIO_STORAGE_MIME_TYPES,
  IMAGE_STORAGE_MIME_TYPES,
  MEDIA_FORMATS,
  VIDEO_STORAGE_MIME_TYPES,
  resolveMediaFormat,
} = registry;
const { headerMatchesFormat, inspectMediaHeader } = sniff;

function valuesFromSql(source) {
  return [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function assertSetEqual(actualValues, expectedValues, label) {
  const actual = [...new Set(actualValues)].sort();
  const expected = [...new Set(expectedValues)].sort();
  assert.deepEqual(actual, expected, `${label} tidak sinkron dengan registry.`);
}

function storageBucketsFromSql(source) {
  const buckets = new Map();
  const storageUpdatePattern = new RegExp(
    String.raw`update\s+storage\.buckets\s+set[\s\S]*?` +
      String.raw`allowed_mime_types\s*=\s*array\[([\s\S]*?)\]` +
      String.raw`[\s\S]*?where\s+` +
      String.raw`(id\s*=\s*'[^']+'|id\s+in\s*\([\s\S]*?\))\s*;`,
    "gi",
  );
  const updates = source.matchAll(storageUpdatePattern);
  for (const update of updates) {
    const mimes = valuesFromSql(update[1]);
    const bucketIds = valuesFromSql(update[2]);
    for (const bucketId of bucketIds) buckets.set(bucketId, mimes);
  }
  return buckets;
}

function constraintSql(source, name) {
  const start = source.toLowerCase().indexOf(`add constraint ${name} check`);
  assert.notEqual(start, -1, `Constraint ${name} tidak ditemukan.`);
  const end = source.indexOf(";", start);
  assert.notEqual(end, -1, `Constraint ${name} tidak ditutup dengan semicolon.`);
  return source.slice(start, end);
}

function constraintMimes(source, name) {
  return valuesFromSql(constraintSql(source, name)).filter((value) =>
    value.includes("/"),
  );
}

function typedConstraintMimes(source, name, mediaType) {
  const constraint = constraintSql(source, name);
  const typeBranch = constraint.match(
    new RegExp(
      String.raw`type\s*=\s*'${mediaType}'\s+and\s+mime_type\s+in\s*\(([\s\S]*?)\)`,
      "i",
    ),
  );
  assert(typeBranch, `Constraint ${name} tidak memiliki cabang ${mediaType}.`);
  return valuesFromSql(typeBranch[1]).filter((value) => value.includes("/"));
}

function directFormats(kind) {
  return MEDIA_FORMATS.filter(
    (format) => format.kind === kind && format.preparation === "direct",
  );
}

function validateRegistry() {
  const ids = new Set();
  const claimsByKind = new Set();
  for (const format of MEDIA_FORMATS) {
    assert(!ids.has(format.id), `ID format ganda: ${format.id}.`);
    ids.add(format.id);
    assert.equal(
      format.id,
      format.id.toLowerCase(),
      `ID ${format.id} harus lowercase.`,
    );
    assert.equal(
      format.canonicalMime,
      format.canonicalMime.toLowerCase(),
      `MIME canonical ${format.id} harus lowercase.`,
    );
    assert(
      !format.storageExtension.startsWith("."),
      `Ekstensi storage ${format.id} memakai titik.`,
    );
    assert.equal(
      format.storageExtension,
      format.storageExtension.toLowerCase(),
      `Ekstensi storage ${format.id} harus lowercase.`,
    );

    const ownMimes = [format.canonicalMime, ...format.mimeAliases];
    assert.equal(
      new Set(ownMimes).size,
      ownMimes.length,
      `MIME ganda pada ${format.id}.`,
    );
    for (const mime of ownMimes) {
      assert.equal(mime, mime.toLowerCase(), `MIME ${mime} harus lowercase.`);
      const claim = `${format.kind}:${mime}`;
      assert(
        !claimsByKind.has(claim),
        `MIME ambigu dalam ${format.kind}: ${mime}.`,
      );
      claimsByKind.add(claim);
    }
    for (const extension of format.extensions) {
      assert.equal(
        extension,
        extension.toLowerCase(),
        `Ekstensi ${extension} harus lowercase.`,
      );
      assert(!extension.startsWith("."), `Ekstensi ${extension} memakai titik.`);
    }
    for (const mime of format.compatibleClaimMimes ?? []) {
      assert.equal(
        mime,
        mime.toLowerCase(),
        `Klaim MIME ${mime} harus lowercase.`,
      );
      assert(
        !ownMimes.includes(mime),
        `Klaim kompatibel ${format.id} menduplikasi MIME sendiri.`,
      );
    }
    if (format.claimPriority !== undefined) {
      assert(
        Number.isInteger(format.claimPriority) && format.claimPriority >= 0,
        `claimPriority ${format.id} harus bilangan bulat nonnegatif.`,
      );
    }
  }

  for (const kind of ["image", "video", "audio"]) {
    const extensions = new Set();
    for (const format of MEDIA_FORMATS.filter((item) => item.kind === kind)) {
      for (const extension of format.extensions) {
        assert(
          !extensions.has(extension),
          `Ekstensi ambigu dalam ${kind}: .${extension}.`,
        );
        extensions.add(extension);
      }
    }
  }
}

function validateSql(source, label) {
  const buckets = storageBucketsFromSql(source);
  const expectedBuckets = new Map([
    ["music", AUDIO_STORAGE_MIME_TYPES],
    ["media", [...IMAGE_STORAGE_MIME_TYPES, ...VIDEO_STORAGE_MIME_TYPES]],
    ["members", IMAGE_STORAGE_MIME_TYPES],
    ["blog", IMAGE_STORAGE_MIME_TYPES],
    ["site", IMAGE_STORAGE_MIME_TYPES],
  ]);
  for (const [bucket, expected] of expectedBuckets) {
    assert(buckets.has(bucket), `${label}: bucket ${bucket} tidak dikonfigurasi.`);
    assertSetEqual(buckets.get(bucket), expected, `${label}: bucket ${bucket}`);
  }

  const imageCanonicalMimes = directFormats("image").map(
    (format) => format.canonicalMime,
  );
  const videoCanonicalMimes = directFormats("video").map(
    (format) => format.canonicalMime,
  );
  const audioCanonicalMimes = directFormats("audio").map(
    (format) => format.canonicalMime,
  );
  assertSetEqual(
    typedConstraintMimes(
      source,
      "media_mime_type_matches_type",
      "photo",
    ),
    imageCanonicalMimes,
    `${label}: constraint foto canonical`,
  );
  assertSetEqual(
    typedConstraintMimes(
      source,
      "media_mime_type_matches_type",
      "video",
    ),
    videoCanonicalMimes,
    `${label}: constraint video canonical`,
  );
  assertSetEqual(
    constraintMimes(source, "music_tracks_mime_type_check"),
    audioCanonicalMimes,
    `${label}: constraint musik canonical`,
  );
}

function expectResolution(name, type, kinds, expectedId) {
  const result = resolveMediaFormat({ name, type }, kinds);
  assert(result.ok, `${name} (${type}) seharusnya diterima: ${result.error}`);
  assert.equal(
    result.format.id,
    expectedId,
    `${name} memilih format yang salah.`,
  );
}

function expectRejection(name, type, kinds) {
  const result = resolveMediaFormat({ name, type }, kinds);
  assert(!result.ok, `${name} (${type}) seharusnya ditolak.`);
}

function concatBytes(...parts) {
  return new Uint8Array(Buffer.concat(parts.map((part) => Buffer.from(part))));
}

function pngChunk(type, data = new Uint8Array()) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return concatBytes(length, Buffer.from(type, "ascii"), data, Buffer.alloc(4));
}

function pngFixture(animated) {
  const signature = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const animation = animated
    ? pngChunk("acTL", Uint8Array.from([0, 0, 0, 2, 0, 0, 0, 0]))
    : new Uint8Array();
  return concatBytes(signature, animation, pngChunk("IEND"));
}

function webpFixture(animated) {
  const extendedHeader = Buffer.alloc(10);
  if (animated) extendedHeader[0] = 0x02;
  const chunkSize = Buffer.alloc(4);
  chunkSize.writeUInt32LE(extendedHeader.length);
  const body = Buffer.concat([
    Buffer.from("WEBPVP8X", "ascii"),
    chunkSize,
    extendedHeader,
  ]);
  const riffSize = Buffer.alloc(4);
  riffSize.writeUInt32LE(body.length);
  return concatBytes(Buffer.from("RIFF", "ascii"), riffSize, body);
}

function isoFixture(majorBrand, compatibleBrands = []) {
  const size = 16 + compatibleBrands.length * 4;
  const header = Buffer.alloc(size);
  header.writeUInt32BE(size, 0);
  header.write("ftyp", 4, "ascii");
  header.write(majorBrand.padEnd(4, " ").slice(0, 4), 8, "ascii");
  compatibleBrands.forEach((brand, index) => {
    header.write(brand.padEnd(4, " ").slice(0, 4), 16 + index * 4, "ascii");
  });
  return new Uint8Array(header);
}

function ebmlFixture(documentType) {
  const value = Buffer.from(documentType, "ascii");
  assert(value.length < 0x7f, "Fixture DocType EBML terlalu panjang.");
  const element = Buffer.concat([
    Buffer.from([0x42, 0x82, 0x80 | value.length]),
    value,
  ]);
  return concatBytes(
    Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x80 | element.length]),
    element,
  );
}

function formatById(id) {
  const format = MEDIA_FORMATS.find((item) => item.id === id);
  assert(format, `Format fixture ${id} tidak ditemukan.`);
  return format;
}

function validateResolutionFixtures() {
  expectResolution("photo.png", "image/apng", ["image"], "apng");
  expectResolution("photo.apng", "image/png", ["image"], "apng");
  expectResolution("clip.mov", "video/mp4", ["video"], "quicktime");
  expectResolution("clip.mp4", "video/quicktime", ["video"], "mp4-video");
  expectResolution("song.m4a", "video/mp4", ["audio"], "mp4-audio");
  expectResolution("song.m4a", "audio/x-m4a", ["audio"], "mp4-audio");
  expectResolution("song.m4a", "application/mp4", ["audio"], "mp4-audio");
  expectResolution("photo.heic", "image/heif", ["image"], "heic");
  expectResolution("photo.heif", "image/heic", ["image"], "heif");
  expectRejection("photo.jpg", "image/png", ["image"]);
  expectRejection("archive.img", "application/octet-stream", ["image"]);
  expectRejection("locked.m4p", "audio/x-m4p", ["audio"]);
  expectRejection("clip.mp4", "audio/mp4", ["video"]);
}

function validateHeaderFixtures() {
  const staticPng = inspectMediaHeader(pngFixture(false));
  const animatedPng = inspectMediaHeader(pngFixture(true));
  assert.equal(staticPng.family, "png");
  assert.equal(staticPng.animated, false);
  assert.equal(animatedPng.animated, true);
  assert(!headerMatchesFormat(formatById("apng"), staticPng));
  assert(headerMatchesFormat(formatById("apng"), animatedPng));

  assert.equal(inspectMediaHeader(webpFixture(false)).animated, false);
  assert.equal(inspectMediaHeader(webpFixture(true)).animated, true);
  assert.equal(inspectMediaHeader(ebmlFixture("webm")).family, "webm");
  assert.equal(
    inspectMediaHeader(ebmlFixture("matroska")).family,
    "matroska",
  );
  assert.equal(
    inspectMediaHeader(ebmlFixture("unknown-webm")).family,
    "unknown",
  );

  const quicktime = inspectMediaHeader(isoFixture("qt  "));
  const m4a = inspectMediaHeader(isoFixture("M4A "));
  const m4p = inspectMediaHeader(isoFixture("M4P "));
  const mp4 = inspectMediaHeader(isoFixture("mp42"));
  const threeGp = inspectMediaHeader(isoFixture("3gp6"));
  const heicSequence = inspectMediaHeader(isoFixture("hevc"));
  assert.equal(quicktime.container, "quicktime");
  assert.equal(m4a.container, "m4a");
  assert.equal(mp4.container, "mp4");
  assert.equal(threeGp.container, "3gp");
  assert.equal(m4p.encrypted, true);
  assert(!headerMatchesFormat(formatById("mp4-audio"), m4p));
  assert.equal(heicSequence.family, "heif");
  assert.equal(heicSequence.animated, true);
  assert(headerMatchesFormat(formatById("quicktime"), quicktime));
  assert(headerMatchesFormat(formatById("mp4-audio"), m4a));
  assert(headerMatchesFormat(formatById("mp4-video"), mp4));
  assert(headerMatchesFormat(formatById("3gp-video"), threeGp));
}

validateRegistry();
validateSql(schema, "supabase/schema.sql");
validateResolutionFixtures();
validateHeaderFixtures();

console.log(
  `Media formats valid: ${MEDIA_FORMATS.length} format, ` +
    `${
      IMAGE_STORAGE_MIME_TYPES.length +
      VIDEO_STORAGE_MIME_TYPES.length +
      AUDIO_STORAGE_MIME_TYPES.length
    } MIME storage, ` +
    "13 resolusi dan 13 fixture signature diperiksa.",
);
