import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  // Abaikan artefak build, deklarasi bawaan Next.js, dan direktori konfigurasi tersembunyi.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".*/**"]),
]);
