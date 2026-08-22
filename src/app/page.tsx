import {
  getSettings,
  getMembers,
  getApprovedMedia,
  getPublicMessages,
} from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { Hero } from "@/components/public/hero";
import { SectionHeader } from "@/components/ui/section-header";
import { MemberRail } from "@/components/public/member-rail";
import { HighlightGrid } from "@/components/public/highlight-grid";
import { MessageBoard } from "@/components/public/message-board";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildPageMetadata,
  getHomeSeoDescription,
  getHomeSeoTitle,
} from "@/lib/seo";
import { homeStructuredData } from "@/lib/seo/structured-data";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";

// Segarkan konten berkala setelah media atau pesan dikelola admin.
export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const title = getHomeSeoTitle(settings);
  const description = getHomeSeoDescription(settings);
  return buildPageMetadata(settings, {
    title,
    description,
    path: "/",
    absoluteTitle: true,
  });
}

export default async function Home() {
  const [settings, members, media, messages] = await Promise.all([
    getSettings(),
    getMembers(),
    getApprovedMedia({ limit: 12, pinnedOnly: true }),
    getPublicMessages({ limit: 8, pinnedOnly: true }),
  ]);
  const labels = getContentLabels(settings);
  const heroTitle = settings.hero_title ?? settings.site_name;

  return (
    <PageShell>
      <JsonLd data={homeStructuredData(settings)} />
      <div className="space-y-7">
        <Hero
          title={heroTitle}
          subtitle={settings.hero_subtitle}
          imageUrl={settings.hero_image_url}
          imageWidth={settings.hero_image_width}
          imageHeight={settings.hero_image_height}
          // Badge chip identitas hanya bila beda dari judul — hindari merek
          // tampil ganda (chip atas + judul) saat hero_title memuat nama situs.
          badge={
            [settings.site_alternate_name, settings.site_name].find(
              (name) => name && name !== heroTitle,
            ) ?? null
          }
        />

        {members.length > 0 && (
          <section data-nosnippet>
            <SectionHeader
              title={toDisplayLabel(labels.memberPlural, settings.locale)}
              actionHref="/anggota"
            />
            <MemberRail members={members} />
          </section>
        )}

        <section data-nosnippet>
          <SectionHeader title="Sorotan" actionHref="/galeri" />
          <HighlightGrid media={media} />
        </section>

        <div data-nosnippet>
          <MessageBoard
            messages={messages}
            actionHref="/pesan"
            showComposer={false}
            emptyDescription="Pesan pilihan yang dipin admin akan tampil di sini."
          />
        </div>
      </div>
    </PageShell>
  );
}
