import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// public/sw.js tidak bisa mengimpor TypeScript; pastikan konstantanya tidak drift.
const [moduleSource, workerSource, constantsSource] = await Promise.all([
  readFile("src/lib/pwa/share-target.ts", "utf8"),
  readFile("public/sw.js", "utf8"),
  readFile("src/lib/constants.ts", "utf8"),
]);

const expected = {
  action: "SHARE_ACTION",
  fileField: "SHARE_FIELD",
  cacheName: "SHARE_CACHE",
  cacheEntry: "SHARE_ENTRY",
  resultParam: "SHARE_PARAM",
};

for (const [key, constant] of Object.entries(expected)) {
  const moduleValue = moduleSource.match(new RegExp(`${key}:\\s*"([^"]+)"`))?.[1];
  const workerValue = workerSource.match(new RegExp(`const ${constant} = "([^"]+)"`))?.[1];
  assert(moduleValue, `SHARE_TARGET.${key} tidak ditemukan di src/lib/pwa/share-target.ts`);
  assert.equal(workerValue, moduleValue, `${constant} di public/sw.js drift dari SHARE_TARGET.${key}`);
}

const mediaPerPost = Number(constantsSource.match(/mediaPerPost:\s*(\d+)/)?.[1]);
const videoMaxMb = Number(
  constantsSource.match(/videoMaxBytes:\s*(\d+)\s*\*\s*1024\s*\*\s*1024/)?.[1],
);
const workerMaxFiles = Number(workerSource.match(/const SHARE_MAX_FILES = (\d+)/)?.[1]);
const workerMaxBytes = Number(workerSource.match(/const SHARE_MAX_FILE_BYTES = (\d+)/)?.[1]);
assert.equal(workerMaxFiles, mediaPerPost, "SHARE_MAX_FILES di public/sw.js drift dari UPLOAD_LIMITS.mediaPerPost");
assert.equal(workerMaxBytes, videoMaxMb * 1024 * 1024, "SHARE_MAX_FILE_BYTES di public/sw.js drift dari UPLOAD_LIMITS.videoMaxBytes");

console.log("Share target service worker sinkron.");
