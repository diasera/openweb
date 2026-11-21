import type { ReactNode } from "react";
import type { SkeletonLayoutId } from "@/lib/navigation/app-routes";
import { cardClass } from "@/components/ui/card";
import {
  Skeleton,
  SkeletonCards,
  SkeletonEditor,
  SkeletonFields,
  SkeletonHeader,
  SkeletonMasonry,
  SkeletonPanel,
  SkeletonPills,
  SkeletonRail,
  SkeletonRows,
  SkeletonSectionTitle,
  SkeletonText,
} from "./skeleton";

interface SkeletonLayout {
  /** Diumumkan pembaca layar selama halaman dimuat. */
  label: string;
  content: () => ReactNode;
}

/** Plat ikon + judul + tab filter: kepala semua daftar admin. */
function AdminTop({ tabs = true }: { tabs?: boolean }) {
  return (
    <>
      <SkeletonHeader variant="admin" />
      {tabs && <Skeleton className="mb-5 h-10 w-80 max-w-full rounded-full" />}
    </>
  );
}

/** Kolom tulis + panel samping: editor artikel dan Edit postingan. */
function EditorColumns({ main }: { main: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <div className="min-w-0 space-y-4">{main}</div>
      <SkeletonPanel fields={5} />
    </div>
  );
}

/**
 * Komposisi kerangka per jenis halaman. Route memilih id-nya di registry
 * (lib/navigation/app-routes.ts & ADMIN_FEATURE_META), jadi halaman baru
 * cukup menyebut id — tidak menulis kerangka sendiri.
 */
export const SKELETON_LAYOUTS: Record<SkeletonLayoutId, SkeletonLayout> = {
  home: {
    label: "Memuat beranda",
    content: () => (
      <div className="space-y-11 sm:space-y-14">
        <Skeleton className="rounded-ios-lg aspect-366/250 w-full sm:aspect-2/1 lg:aspect-[21/10] lg:rounded-[2rem]" />
        <section>
          <SkeletonSectionTitle />
          <SkeletonRail count={7} />
        </section>
        <section>
          <SkeletonSectionTitle />
          <SkeletonMasonry count={6} />
        </section>
      </div>
    ),
  },
  grid: {
    label: "Memuat galeri",
    content: () => (
      <>
        <SkeletonHeader />
        <SkeletonPills className="mb-5" count={5} />
        <SkeletonMasonry count={10} />
      </>
    ),
  },
  cards: {
    label: "Memuat album",
    content: () => (
      <>
        <SkeletonHeader />
        <SkeletonCards />
      </>
    ),
  },
  people: {
    label: "Memuat daftar anggota",
    content: () => (
      <>
        <SkeletonHeader />
        <Skeleton className="mb-5 h-11 w-full rounded-2xl" />
        <SkeletonCards
          media="mx-auto aspect-square max-w-28 rounded-full"
          className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        />
      </>
    ),
  },
  list: {
    label: "Memuat daftar",
    content: () => (
      <>
        <SkeletonHeader />
        <SkeletonRows leading="wide" trailing={false} />
      </>
    ),
  },
  board: {
    label: "Memuat pesan",
    content: () => (
      <>
        <SkeletonHeader />
        <Skeleton className="mb-6 h-32 w-full rounded-card" />
        <SkeletonMasonry count={8} />
      </>
    ),
  },
  article: {
    label: "Memuat artikel",
    content: () => (
      <article className="mx-auto w-full max-w-5xl space-y-6">
        <div className="mx-auto max-w-3xl space-y-3">
          <Skeleton className="h-6 w-36 rounded-full" />
          <SkeletonText lines={2} lineClassName="h-9" />
          <Skeleton className="h-5 w-4/5 rounded-md" />
          <div className="border-border/65 flex items-center gap-3 border-y py-3.5">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-3.5 w-40 rounded-md" />
          </div>
        </div>
        <div className="mx-auto max-w-4xl">
          <Skeleton className="rounded-ios-lg aspect-video w-full" />
        </div>
        <div className="lg:grid lg:grid-cols-[minmax(0,42rem)_16rem] lg:items-start lg:justify-center lg:gap-10">
          <div className="space-y-4">
            <SkeletonText lines={5} />
            <SkeletonText lines={4} />
          </div>
          <Skeleton className="hidden h-40 w-full rounded-2xl lg:block" />
        </div>
      </article>
    ),
  },
  pin: {
    label: "Memuat pin",
    content: () => (
      <div className="mx-auto max-w-lg space-y-5 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
        <Skeleton className="rounded-ios-lg aspect-4/5 w-full" />
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </div>
          <SkeletonText lines={2} lineClassName="h-6" />
          <SkeletonText lines={3} />
          <SkeletonPills count={3} />
        </div>
      </div>
    ),
  },
  profile: {
    label: "Memuat profil anggota",
    content: () => (
      <div className="mx-auto w-full max-w-2xl space-y-7 lg:grid lg:max-w-5xl lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-7 lg:space-y-0">
        <div className={cardClass("elevated", "overflow-hidden rounded-[2rem] pb-6")}>
          <Skeleton className="h-28 w-full rounded-none sm:h-32" />
          <div className="-mt-14 flex flex-col items-center gap-3 px-5">
            <Skeleton className="size-24 rounded-full" />
            <Skeleton className="h-7 w-44 rounded-lg" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <div className="mt-3 grid w-full grid-cols-3 gap-2">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-16 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-36 w-full rounded-card" />
          <SkeletonRows count={4} leading="wide" trailing={false} />
        </div>
      </div>
    ),
  },
  hub: {
    label: "Memuat profil",
    content: () => (
      <div className="space-y-7">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-7 w-44 rounded-lg" />
            <Skeleton className="h-4 w-56 max-w-full rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-24 rounded-card" />
          ))}
        </div>
        <div className={cardClass("flat", "space-y-4 rounded-card p-4")}>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  form: {
    label: "Memuat formulir",
    content: () => (
      <div className="mx-auto max-w-lg space-y-6">
        <Skeleton className="rounded-ios-lg aspect-4/5 w-full" />
        <SkeletonFields count={3} />
      </div>
    ),
  },
  page: {
    label: "Memuat halaman",
    content: () => (
      <>
        <SkeletonHeader />
        <div className="max-w-2xl space-y-6">
          <SkeletonText lines={4} />
          <SkeletonText lines={5} />
        </div>
      </>
    ),
  },
  auth: {
    label: "Memuat halaman masuk",
    content: () => (
      <div className={cardClass("elevated", "mx-auto mt-[12vh] max-w-sm space-y-5 rounded-ios-lg p-6")}>
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-14 rounded-2xl" />
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>
        <SkeletonFields count={2} />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    ),
  },
  "admin-list": {
    label: "Memuat halaman admin",
    content: () => (
      <>
        <AdminTop />
        <SkeletonRows />
      </>
    ),
  },
  "admin-grid": {
    label: "Memuat media",
    content: () => (
      <>
        <AdminTop />
        <SkeletonCards
          media="aspect-square rounded-t-card rounded-b-none"
          className="grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-4"
        />
      </>
    ),
  },
  "admin-editor": {
    label: "Memuat editor",
    content: () => (
      <EditorColumns
        main={
          <>
            <Skeleton className="h-10 w-3/4 rounded-xl" />
            <SkeletonEditor />
          </>
        }
      />
    ),
  },
  "admin-form": {
    label: "Memuat pengaturan",
    content: () => (
      <>
        <AdminTop />
        <div className="space-y-5">
          <SkeletonPanel fields={3} />
          <SkeletonPanel fields={2} />
        </div>
      </>
    ),
  },
};
