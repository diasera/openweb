import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_AUTH_PATHS,
  SESSION_COOKIE,
  isAdminAuthRoute,
  isAdminProfileRoute,
} from "@/lib/constants";
import { verifySession } from "@/lib/auth/session";

/**
 * Proxy (dulu "middleware") — guard route pengelolaan di bawah profil. Di Next.js 16
 * file ini bernama
 * proxy.ts dan berjalan di runtime Node.js. Hanya memverifikasi cookie sesi
 * (tanpa query DB agar cepat); keputusan owner-ada-atau-belum diserahkan ke
 * halaman login/setup yang bisa akses database.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /profil dan /profil/[id] tetap publik; tidak perlu verifikasi sesi.
  if (!isAdminProfileRoute(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isPublic = isAdminAuthRoute(pathname);

  // Belum login dan bukan halaman auth -> ke login sambil menyimpan tujuan.
  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = ADMIN_AUTH_PATHS.login;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Halaman login sendiri yang memutuskan "sudah login" lewat database: JWT
  // yang valid bisa saja sudah dicabut (ganti password/akun nonaktif), dan
  // pemiliknya harus tetap bisa login ulang.
  return NextResponse.next();
}

export const config = {
  matcher: [
    {
      source: "/profil/:path*",
      // Server Action tidak lewat proxy: Next meng-clone body request yang
      // melewati proxy dan memotongnya di `proxyClientMaxBodySize` (bawaan
      // 10 MB), sehingga unggahan gambar admin > 10 MB rusak di tengah jalan.
      // Proxy juga tidak pernah menjadi pagar action (action bisa dikirim ke
      // path mana pun); setiap action admin memanggil requireFeature/
      // requireAdmin sendiri, dan layout admin memanggil requireAdmin.
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
