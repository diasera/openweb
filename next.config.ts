import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

/**
 * Allowlist `next/image` diturunkan langsung dari proyek Supabase yang aktif
 * (hanya bucket publik `/storage/v1/object/public/**` tanpa query/redirect),
 * sehingga proyek `*.supabase.co` milik pihak luar tidak dapat meminjam
 * endpoint `/_next/image` sebagai open proxy gambar atau membocorkan IP origin.
 */
function supabaseRemotePatterns(): RemotePattern[] {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (!raw || /your[-_]|YOUR-PROJECT-REF/i.test(raw)) return [];
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return [];
    const protocol = url.protocol.slice(0, -1) as "https" | "http";
    return [
      {
        protocol,
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: "/storage/v1/object/public/**",
        search: "",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  typedRoutes: true,
  // Izinkan dev client & HMR saat dibuka lewat 127.0.0.1 atau port preview Codespaces.
  allowedDevOrigins: ["127.0.0.1", "**.app.github.dev", "**.githubpreview.dev"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Content-Security-Policy",
            value:
              "base-uri 'self'; frame-ancestors 'self'; object-src 'none'; form-action 'self'",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
      {
        // Service worker harus selalu segar dan berlaku di seluruh origin.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/mahasiswa", destination: "/anggota", permanent: true },
      { source: "/dashboard", destination: "/profil", permanent: false },
      {
        source: "/dashboard/ringkasan",
        destination: "/profil",
        permanent: false,
      },
      {
        source: "/dashboard/:path*",
        destination: "/profil/:path*",
        permanent: false,
      },
      {
        source: "/profil/ringkasan",
        destination: "/profil",
        permanent: false,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Nama objek storage bersifat unik/immutable. Pertahankan hasil optimasi
    // Next Image agar cold request hero dan kartu tidak berulang tiap 4 jam.
    minimumCacheTTL: 31_536_000,
    maximumRedirects: 0,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'none'; frame-src 'none'; sandbox;",
    remotePatterns: supabaseRemotePatterns(),
  },
  experimental: {
    // Native Rust port dari React Compiler di dalam Turbopack (tanpa Babel).
    turbopackRustReactCompiler: true,
    optimizePackageImports: ["lucide-react"],
    // Server Action hanya membawa gambar (cover blog, hero/logo/favicon/SEO,
    // foto anggota). Batasnya = UPLOAD_LIMITS.imageMaxBytes (100 MB) + 10 MB
    // untuk field lain; dicek `npm run check:media-formats`. Body diparse
    // SEBELUM sesi admin diperiksa, jadi jangan dibesarkan melebihi kebutuhan
    // gambar. Video/audio dikirim langsung browser ke Supabase (signed URL/TUS)
    // dan tidak pernah melewati Function.
    serverActions: {
      bodySizeLimit: "110mb",
    },
  },
};

export default nextConfig;
