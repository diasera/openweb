import type { Metadata } from "next";
import { getMembers, getSettings } from "@/lib/data";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import { PageShell } from "@/components/public/page-shell";
import { MemberBrowser } from "@/components/public/member-browser";

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.anggota);
}

export default async function MembersPage() {
  const [settings, members] = await Promise.all([getSettings(), getMembers()]);
  const labels = getContentLabels(settings);
  const title = toDisplayLabel(labels.memberPlural, settings.locale);

  return (
    <PageShell>
      <JsonLd
        data={breadcrumbStructuredData(settings, [
          { name: "Beranda", path: "/" },
          { name: title, path: "/anggota" },
        ])}
      />
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="text-muted text-sm">
          {members.length} {labels.memberPlural} · {settings.site_name}
        </p>
      </div>
      <MemberBrowser members={members} labels={labels} />
    </PageShell>
  );
}
