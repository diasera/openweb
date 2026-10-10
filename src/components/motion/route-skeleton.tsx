"use client";

import { usePathname } from "next/navigation";
import { pageMainClass } from "@/components/public/page-main";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { SKELETON_LAYOUTS } from "@/components/ui/skeleton-layouts";
import { getAdminRouteNavigation, isAdminAuthRoute } from "@/lib/constants";
import {
  resolveAppRouteSkeleton,
  type SkeletonLayoutId,
} from "@/lib/navigation/app-routes";
import { MotionPage } from "./motion-page";

/** Satu titik baca: route auth, registry admin, lalu registry publik. */
function routeSkeleton(pathname: string): SkeletonLayoutId {
  if (isAdminAuthRoute(pathname)) return "auth";
  return getAdminRouteNavigation(pathname)?.skeleton ?? resolveAppRouteSkeleton(pathname);
}

/**
 * Satu-satunya fallback pemuatan route. Bentuk kerangka dibaca dari registry
 * route sehingga tiap halaman tampil sebagai "versi abu-abu" dirinya sendiri,
 * bukan spinner generik.
 *
 * `framed` = di luar PageShell: bungkus dengan <main> yang sama dan
 * MotionPage yang menahan penanda halaman siap sampai konten asli tiba.
 * Di dalam AdminShell, PageShell sudah menyediakan keduanya.
 */
export function RouteSkeleton({ framed = false }: { framed?: boolean }) {
  const layout = SKELETON_LAYOUTS[routeSkeleton(usePathname() || "/")];
  const screen = <SkeletonScreen label={layout.label}>{layout.content()}</SkeletonScreen>;

  if (!framed) return screen;
  return (
    <main className={pageMainClass()}>
      <MotionPage profile="utility" navigationReady={false}>
        {screen}
      </MotionPage>
    </main>
  );
}

/**
 * Isi loading.tsx. Next.js hanya menampilkan fallback untuk batas Suspense
 * yang BARU terpasang, jadi tiap segmen yang punya halaman anak (blog/[slug],
 * pin/[id], media/album, …) memasang loading.tsx satu baris yang meneruskan
 * ke sini — isi kerangkanya tetap diputuskan registry.
 */
export function PageLoading() {
  return <RouteSkeleton framed />;
}

/** Varian untuk segmen di dalam AdminShell (PageShell sudah ada). */
export function ShellLoading() {
  return <RouteSkeleton />;
}
