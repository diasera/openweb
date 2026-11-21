import type { Metadata } from "next";
import { ArrowUpRight, Sparkles } from "lucide-react";
import {
  getAlbumSummaries,
  getApprovedMedia,
  getMembers,
  getMemoriesToday,
  getNextEvent,
  getPublicMessages,
  getPublishedPosts,
  getSettings,
} from "@/lib/data";
import { optionalRead } from "@/lib/data/read";
import { PageShell } from "@/components/public/page-shell";
import { Hero } from "@/components/public/hero";
import { SectionHeader } from "@/components/ui/section-header";
import { MemberRail } from "@/components/public/member-rail";
import { HighlightGrid } from "@/components/public/highlight-grid";
import { MessageBoard } from "@/components/public/message-board";
import { MemoriesRail } from "@/components/public/memories-rail";
import { EventCard } from "@/components/public/event-card";
import { PostRow } from "@/components/public/post-row";
import { SiteColophon } from "@/components/public/site-colophon";
import { MotionLink, listReveal } from "@/components/motion";
import { cardClass } from "@/components/ui/card";
import { IconPlate } from "@/components/ui/icon-plate";
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
  const [settings, members, media, messages, memories, nextEvent, latestPosts, albums] =
    await Promise.all([
      getSettings(),
      getMembers(),
      getApprovedMedia({ limit: 12, pinnedOnly: true }),
      getPublicMessages({ limit: 8, pinnedOnly: true }),
      getMemoriesToday(),
      getNextEvent(),
      optionalRead("home-posts", () => getPublishedPosts(3), []),
      optionalRead("home-albums", () => getAlbumSummaries(), []),
    ]);
  const labels = getContentLabels(settings);
  const memberLabel = toDisplayLabel(labels.memberPlural, settings.locale);
  const nextEventAlbum = nextEvent
    ? albums.find((album) => album.event_id === nextEvent.id) ?? null
    : null;

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
            <EventCard
              event={nextEvent}
              siteUrl={getSiteUrl(settings)}
              featured
              album={
                nextEventAlbum
                  ? { slug: nextEventAlbum.slug, title: nextEventAlbum.title }
                  : null
              }
            />
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

        {latestPosts.length > 0 && (
          <section aria-labelledby="home-posts" className="motion-reveal">
            <SectionHeader
              id="home-posts"
              eyebrow="Tulisan"
              title="Artikel terbaru"
              actionHref="/blog"
              actionLabel="Semua artikel"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post, index) => (
                <div key={post.id} {...listReveal(index)} className="h-full">
                  <PostRow post={post} variant="card" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pintu cepat Kilas Balik Komunitas — Editorial Showcase Banner */}
        <section aria-label="Kilas Balik" className="motion-reveal">
          <MotionLink
            href="/kilas-balik"
            data-spotlight
            className={cardClass(
              "interactive",
              "group relative flex items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] border-white/15 p-5 text-white shadow-elevated sm:p-7",
            )}
          >
            <span
              aria-hidden="true"
              className="liquid-gradient grain pointer-events-none absolute inset-0"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/58 via-black/38 to-black/22"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgb(255_255_255/0.26)]"
            />
            <div className="relative flex min-w-0 items-center gap-3.5 sm:gap-4">
              <IconPlate
                icon={Sparkles}
                size="md"
                className="border border-white/25 bg-white/18 text-white backdrop-blur-md"
              />
              <div className="min-w-0">
                <p className="text-caption2 font-bold uppercase tracking-[0.14em] text-white/80">
                  Kilas Balik
                </p>
                <p className="font-display truncate text-title3 font-extrabold tracking-tight text-white sm:text-title2">
                  Rangkuman perjalanan {settings.site_name}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/82 sm:text-subhead">
                  Statistik karya, bulan teramai, sorotan {labels.memberPlural}, &amp; Songfess favorit.
                </p>
              </div>
            </div>
            <span
              aria-hidden="true"
              className="relative grid size-10 shrink-0 place-items-center rounded-full border border-white/25 bg-white/14 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-105"
            >
              <ArrowUpRight className="size-4.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </MotionLink>
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
