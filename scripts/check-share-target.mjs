import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// public/sw.js tidak bisa mengimpor TypeScript; pastikan konstantanya tidak drift.
const [moduleSource, workerSource] = await Promise.all([
  readFile("src/lib/share-target.ts", "utf8"),
  readFile("public/sw.js", "utf8"),
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
  assert(moduleValue, `SHARE_TARGET.${key} tidak ditemukan di src/lib/share-target.ts`);
  assert.equal(workerValue, moduleValue, `${constant} di public/sw.js drift dari SHARE_TARGET.${key}`);
}

console.log("Share target service worker sinkron.");
