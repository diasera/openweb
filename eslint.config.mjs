import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    // Komponen ini sengaja membaca state browser sesudah hydration atau
    // memasang portal sesudah mount agar markup server tetap deterministik.
    files: [
      "src/components/public/message-like.tsx",
      "src/components/public/share-save.tsx",
      "src/components/public/theme-toggle.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // useMediaPicker mengekspos preview/isVideo sebagai getter state terkontrol,
    // bukan React ref; rule refs tidak dapat membedakan bentuk API ini.
    files: ["src/components/ui/media-dropzone.tsx"],
    rules: {
      "react-hooks/refs": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
