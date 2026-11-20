import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import { getCommunityWrapped } from "@/lib/wrapped";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { PageShell } from "@/components/public/page-shell";
import { ShareButton } from "@/components/public/share-save";
import { WrappedShowcase } from "@/components/public/wrapped-showcase";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 300;

type KilasBalikProps = {
  searchParams: Promise<{ tahun?: string }>;
};

function parseYear(raw?: string): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1990 || parsed > 2100) return null;
  return parsed;
}

export async function generateMetadata({
  searchParams,
}: KilasBalikProps): Promise<Metadata> {
  const [{ tahun }, settings] = await Promise.all([searchParams, getSettings()]);
  const year = parseYear(tahun);
  return buildPageMetadata(settings, {
    ...PUBLIC_PAGE_SEO.kilasBalik,
    title: year ? `Kilas Balik ${year}` : PUBLIC_PAGE_SEO.kilasBalik.title,
    path: year ? `/kilas-balik?tahun=${year}` : PUBLIC_PAGE_SEO.kilasBalik.path,
  });
}

export default async function KilasBalikPage({ searchParams }: KilasBalikProps) {
  const [{ tahun }, settings] = await Promise.all([searchParams, getSettings()]);
  const requestedYear = parseYear(tahun);
  const data = await getCommunityWrapped(requestedYear);
  const labels = getContentLabels(settings);
  const memberPlural = toDisplayLabel(labels.memberPlural, settings.locale);

  return (
    <PageShell
      header={{
        variant: "sub",
        title: data.year ? `Kilas Balik ${data.year}` : "Kilas Balik",
        backHref: "/profil",
        right: (
          <ShareButton
            title={`Kilas Balik ${data.periodLabel} · ${settings.site_name}`}
          />
        ),
      }}
    >
      <JsonLd
        data={breadcrumbStructuredData(settings, [
          { name: "Beranda", path: "/" },
          { name: "Kilas Balik", path: "/kilas-balik" },
        ])}
      />
      <div className="mx-auto w-full max-w-4xl">
        <WrappedShowcase
          data={data}
          siteName={settings.site_name}
          memberPlural={memberPlural}
        />
      </div>
    </PageShell>
  );
}
