import {
  getSettings,
  getMembers,
  getApprovedMedia,
  getMemoriesToday,
  getNextEvent,
  getPublicMessages,
} from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { Hero } from "@/components/public/hero";
import { SectionHeader } from "@/components/ui/section-header";
import { MemberRail } from "@/components/public/member-rail";
import { HighlightGrid } from "@/components/public/highlight-grid";
import { MessageBoard } from "@/components/public/message-board";
import { MemoriesRail } from "@/components/public/memories-rail";
import { EventCard } from "@/components/public/event-card";
import { SiteColophon } from "@/components/public/site-colophon";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildPageMetadata,
  getHomeSeoDescription,
  getHomeSeoTitle,
  getSiteUrl,
} from "@/lib/seo";
import { homeStructuredData } from "@/lib/seo/structured-data";
import {
  getContentLabels,
  resolveHeroContent,
  toDisplayLabel,
} from "@/lib/site-config";

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
  const [settings, members, media, messages, memories, nextEvent] = await Promise.all([
    getSettings(),
    getMembers(),
    getApprovedMedia({ limit: 12, pinnedOnly: true }),
    getPublicMessages({ limit: 8, pinnedOnly: true }),
    getMemoriesToday(),
    getNextEvent(),
  ]);
  const labels = getContentLabels(settings);
  const memberLabel = toDisplayLabel(labels.memberPlural, settings.locale);

  return (
    <PageShell>
      <JsonLd data={homeStructuredData(settings)} />
      <div className="space-y-11 sm:space-y-14">
        <Hero
          {...resolveHeroContent(settings)}
          imageUrl={settings.hero_image_url}
          imageWidth={settings.hero_image_width}
          imageHeight={settings.hero_image_height}
        />

        {members.length > 0 && (
          <section data-nosnippet aria-labelledby="home-members" className="motion-reveal">
            <SectionHeader
              id="home-members"
              eyebrow="Kenali kami"
              title={memberLabel}
              count={members.length}
              actionHref="/anggota"
            />
            <MemberRail members={members} />
          </section>
        )}

        {nextEvent && (
          <section aria-labelledby="home-event" className="motion-reveal">
            <SectionHeader
              id="home-event"
              eyebrow="Agenda"
              title="Acara berikutnya"
              actionHref="/agenda"
              actionLabel="Semua agenda"
            />
            <EventCard event={nextEvent} siteUrl={getSiteUrl(settings)} featured />
          </section>
        )}

        {memories.length > 0 && (
          <section data-nosnippet aria-labelledby="home-memories" className="motion-reveal">
            <SectionHeader
              id="home-memories"
              eyebrow="Hari ini"
              title="Kenangan"
              subtitle="Momen pada tanggal yang sama di tahun-tahun sebelumnya"
            />
            <MemoriesRail media={memories} />
          </section>
        )}

        <section data-nosnippet aria-labelledby="home-highlights">
          <SectionHeader
            id="home-highlights"
            eyebrow="Pilihan"
            title="Sorotan"
            count={media.length}
            actionHref="/galeri"
            actionLabel="Galeri"
          />
          <HighlightGrid media={media} />
        </section>

        <div data-nosnippet className="motion-reveal">
          <MessageBoard
            messages={messages}
            actionHref="/pesan"
            emptyDescription="Pesan pilihan yang dipin admin akan tampil di sini."
            // Beranda hanya menampilkan pesan yang dipin: jelaskan kenapa pesan
            // baru tidak langsung muncul di bawah input.
            composerSuccessNote="Terkirim! Pesan pilihan admin akan tampil di halaman depan."
          />
        </div>

        <SiteColophon siteName={settings.site_name} footerText={settings.footer_text} />
      </div>
    </PageShell>
  );
}
