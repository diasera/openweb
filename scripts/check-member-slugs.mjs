import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), "utf8");

function transpiledModuleUrl(source, fileName) {
  const output = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}

function adminProfilePaths(source) {
  const featureStart = source.indexOf("export const ADMIN_FEATURE_META");
  const managedEnd = source.indexOf("function matchesPath");
  assert(featureStart >= 0 && managedEnd > featureStart, "Blok route admin tidak ditemukan.");
  const block = source.slice(featureStart, managedEnd);
  const segments = [...block.matchAll(/"\/profil\/([a-z0-9-]+)"/g)].map(
    (match) => match[1],
  );
  return [...new Set(segments)].sort();
}

function sqlFunction(source, name) {
  const pattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\b[\\s\\S]*?\\$\\$;`,
    "i",
  );
  const match = source.match(pattern);
  assert(match, `Fungsi SQL ${name} tidak ditemukan.`);
  return match[0].replace(/\s+/g, " ").trim().toLowerCase();
}

function sqlReservedSlugs(source) {
  const fn = sqlFunction(source, "member_reserved_slugs");
  const array = fn.match(/select array\[([\s\S]*?)\]::text\[\]/);
  assert(array, "Array reserved slug SQL tidak ditemukan.");
  return [...array[1].matchAll(/'([^']+)'/g)]
    .map((match) => match[1])
    .sort();
}

const [constantsSource, utilitySource, memberSource, schema, migration] =
  await Promise.all([
    read("src/lib/constants.ts"),
    read("src/lib/utils/slug.ts"),
    read("src/lib/members/slug.ts"),
    read("supabase/schema.sql"),
    read("supabase/migrations/20260716_member_slug_integrity.sql"),
  ]);

const reserved = adminProfilePaths(constantsSource);
assert.deepEqual(sqlReservedSlugs(schema), reserved, "Reserved slug schema drift.");
assert.deepEqual(
  sqlReservedSlugs(migration),
  reserved,
  "Reserved slug migration drift.",
);

for (const name of [
  "member_slug_base",
  "member_reserved_slugs",
  "member_slug_is_reserved",
  "reconcile_member_slugs",
]) {
  assert.equal(
    sqlFunction(schema, name),
    sqlFunction(migration, name),
    `Definisi ${name} berbeda antara schema dan migration.`,
  );
}

const utilityUrl = transpiledModuleUrl(utilitySource, "src/lib/utils/slug.ts");
const testableMemberSource = memberSource
  .replace(/^import type .*\r?\n/, "")
  .replace(
    /import \{ ADMIN_MANAGED_PATHS \} from "@\/lib\/constants";\r?\n/,
    `const ADMIN_MANAGED_PATHS = ${JSON.stringify(
      reserved.map((slug) => `/profil/${slug}`),
    )};\n`,
  )
  .replace(
    /import \{ normalizeSlugSource \} from "@\/lib\/utils\/slug";\r?\n/,
    `import { normalizeSlugSource } from "${utilityUrl}";\n`,
  );
const memberModule = await import(
  transpiledModuleUrl(testableMemberSource, "src/lib/members/slug.ts")
);

const used = [];
const allocated = ["Dimas", "Dimas", "Dimas 2"].map((name) => {
  const slug = memberModule.nextAvailableMemberSlug(name, used);
  used.push(slug);
  return slug;
});
assert.deepEqual(allocated, ["dimas", "dimas-2", "dimas-2-2"]);
assert.equal(memberModule.nextAvailableMemberSlug("Admin", []), "admin-2");
assert.equal(memberModule.slugifyMemberName("  Dímás  "), "dimas");
assert.equal(memberModule.slugifyMemberName("山田"), "member");
assert.equal(
  memberModule.ensureMemberSlugs([{ name: "Nama Baru", slug: "slug-stabil" }])[0]
    .slug,
  "slug-stabil",
);

console.log(
  `Member slug contract OK: ${reserved.length} reserved routes, ${allocated.length + 4} fixtures.`,
);
