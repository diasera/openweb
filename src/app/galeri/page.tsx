import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApprovedMedia, getApprovedMediaCount, getSettings } from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { GaleriBrowser } from "@/components/public/galeri-browser";
import { Pagination } from "@/components/public/pagination";
import { MotionLink } from "@/components/motion";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { parsePageParam } from "@/lib/utils/url";

export const revalidate = 30;

const PAGE_SIZE = 24;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.galeri);
}

export default async function GaleriPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ page: pageParam }, settings] = await Promise.all([
    searchParams,
    getSettings(),
  ]);
  const page = parsePageParam(pageParam);
  const [media, total] = await Promise.all([
    getApprovedMedia({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getApprovedMediaCount(),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (page > totalPages && totalPages > 0) notFound();

  return (
    <PageShell>
      <JsonLd
        data={breadcrumbStructuredData(settings, [
          { name: "Beranda", path: "/" },
          { name: "Galeri", path: "/galeri" },
        ])}
      />
      <PageHeader
        size="large"
        title="Galeri"
        description={`Foto dan video dari ${settings.site_name}`}
        action={
          <MotionLink
            href="/album"
            prefetch={false}
            className={buttonClass({ variant: "secondary", size: "sm" })}
          >
            Lihat per album
          </MotionLink>
        }
      />
      <GaleriBrowser media={media} />
      <Pagination basePath="/galeri" current={page} total={totalPages} />
    </PageShell>
  );
}
