/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
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
    // Supabase Storage public URLs live under <project-ref>.supabase.co/storage/...
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
  experimental: {
    // Server Action hanya membawa gambar (cover blog, hero/logo/favicon/SEO,
    // foto anggota). Batasnya = UPLOAD_LIMITS.imageMaxBytes (100 MB) + 10 MB
    // untuk field lain; dicek `npm run check:media-formats`. Body diparse
    // SEBELUM sesi admin diperiksa, jadi jangan dibesarkan melebihi kebutuhan
    // gambar. Video/audio dikirim langsung browser ke Supabase (signed URL/TUS)
    // dan tidak pernah melewati Function.
    serverActions: {
      bodySizeLimit: "110mb",
    },
    // <ViewTransition> React aktif tanpa flag di Next 16.3+ (opsi lama
    // `viewTransition` kini ditolak validator konfigurasi).
  },
};

export default nextConfig;
