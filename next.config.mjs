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
    // Upload gambar (cover blog, hero/logo/favicon, foto anggota) lewat Server
    // Action mengirim file di body — default limit 1MB terlalu kecil. Gambar
    // dibatasi 10MB (UPLOAD_LIMITS), jadi beri ruang 15MB. Video/audio besar
    // dikirim langsung browser ke Supabase dan tidak melewati Function.
    serverActions: {
      bodySizeLimit: "15mb",
    },
    // Morph antar halaman (React <ViewTransition>) — browser tanpa dukungan
    // otomatis crossfade, jadi aman sebagai progressive enhancement.
    viewTransition: true,
  },
};

export default nextConfig;
