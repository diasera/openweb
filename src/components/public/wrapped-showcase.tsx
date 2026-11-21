"use client";

import {
  ArrowUpRight,
  BookImage,
  CalendarDays,
  Disc3,
  Heart,
  Images,
  MessageSquareHeart,
  Newspaper,
  Play,
  Quote,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { KineticWords, MotionLink, blurDelay, listReveal } from "@/components/motion";
import { useMusic } from "@/components/public/music";
import { StoryShareButton } from "@/components/public/story-share-button";
import { Avatar } from "@/components/ui/avatar";
import { cardClass } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { EmptyState } from "@/components/ui/empty-state";
import { IconPlate } from "@/components/ui/icon-plate";
import { MediaPreview } from "@/components/ui/media-preview";
import { SectionHeader } from "@/components/ui/section-header";
import type { CommunityWrappedData } from "@/lib/wrapped";
import { pastelTint } from "@/lib/utils/color";
import { cn } from "@/lib/utils/cn";

/**
 * Antarmuka interaktif Kilas Balik Komunitas: pemilih periode tahun,
 * kartu statistik beranimasi, grafik batang 12 bulan murni CSS, sorotan
 * kategori/album/anggota/pesan, tombol putar Songfess langsung ke Dynamic
 * Island, serta ekspor Kartu Story 9:16.
 */
export function WrappedShowcase({
  data,
  siteName,
  memberPlural,
}: {
  data: CommunityWrappedData;
  siteName: string;
  memberPlural: string;
}) {
  const music = useMusic();
  const maxMonth = Math.max(1, ...data.monthlyBars.map((m) => m.total));
  const maxCat = Math.max(1, ...data.topCategories.map((c) => c.count));

  const isEmpty =
    data.totals.media === 0 &&
    data.totals.posts === 0 &&
    data.totals.events === 0 &&
    data.totals.messages === 0;

  const headline = data.year
    ? `Jejak ${siteName} sepanjang ${data.year}`
    : `Perjalanan bersama ${siteName}`;

  const highlightText = data.busiestMonth
    ? `Bulan paling ramai: ${data.busiestMonth.label} (${data.busiestMonth.total} momen)`
    : data.topAlbum
      ? `Album terpadat: ${data.topAlbum.title} (${data.topAlbum.mediaCount} media)`
      : null;

  const statTiles = [
    {
      label: "Momen Galeri",
      value: data.totals.media,
      sub:
        data.totals.videos > 0
          ? `${data.totals.photos} foto · ${data.totals.videos} video`
          : `${data.totals.photos} foto terbit`,
      icon: Images,
      tone: "bg-tone-blue/15 text-tone-blue-text",
    },
    {
      label: "Artikel Terbit",
      value: data.totals.posts,
      sub: `${data.totals.albums} album dokumentasi`,
      icon: Newspaper,
      tone: "bg-tone-teal/15 text-tone-teal-text",
    },
    {
      label: "Agenda Kegiatan",
      value: data.totals.events,
      sub: `${data.totals.members} ${memberPlural.toLocaleLowerCase()}`,
      icon: CalendarDays,
      tone: "bg-tone-orange/15 text-tone-orange-text",
    },
    {
      label: "Pesan & Suka",
      value: data.totals.messages,
      sub: `${data.totals.totalLikes} total apresiasi`,
      icon: MessageSquareHeart,
      tone: "bg-tone-purple/15 text-tone-purple-text",
    },
  ];

  const isPlayingTopSong =
    Boolean(data.topSong) &&
    music.isPlaying &&
    music.currentTrack?.id === data.topSong?.id;

  return (
    <div className="space-y-8">
      {/* Hero Kilas Balik + Filter Tahun + Tombol Story */}
      <section
        aria-labelledby="wrapped-title"
        className={cardClass("elevated", "relative overflow-hidden rounded-[2rem]")}
      >
        <div
          aria-hidden="true"
          className="liquid-gradient grain absolute inset-0 opacity-95"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-b from-black/18 via-black/32 to-black/58"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgb(255_255_255/0.26),inset_0_0_0_1px_rgb(255_255_255/0.1)]"
        />

        <div className="relative z-10 px-5 py-8 text-center text-white sm:px-10 sm:py-11">
          <div className="motion-blur-in inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3.5 py-1 text-caption1 font-semibold backdrop-blur-md">
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Kilas Balik · {data.periodLabel}</span>
          </div>

          <h1
            id="wrapped-title"
            className="font-display mx-auto mt-3 max-w-xl text-title1 font-bold tracking-tight text-balance sm:text-large-title"
          >
            <KineticWords text={headline} />
          </h1>

          {highlightText && (
            <p
              className="motion-blur-in mx-auto mt-2.5 max-w-md text-subhead text-white/85"
              style={blurDelay(200)}
            >
              {highlightText}
            </p>
          )}

          {/* Filter Periode */}
          {data.availableYears.length > 0 && (
            <nav
              aria-label="Pilih periode kilas balik"
              className="motion-blur-in mt-5 flex flex-wrap items-center justify-center gap-1.5"
              style={blurDelay(260)}
            >
              <MotionLink
                href="/kilas-balik"
                aria-current={data.year === null ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  data.year === null
                    ? "bg-white text-[#0a0a0c] shadow-sm"
                    : "border border-white/25 bg-white/10 text-white/90 hover:bg-white/20",
                )}
              >
                Sepanjang Masa
              </MotionLink>
              {data.availableYears.map((yr) => (
                <MotionLink
                  key={yr}
                  href={`/kilas-balik?tahun=${yr}`}
                  aria-current={data.year === yr ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold tabular-nums transition-colors",
                    data.year === yr
                      ? "bg-white text-[#0a0a0c] shadow-sm"
                      : "border border-white/25 bg-white/10 text-white/90 hover:bg-white/20",
                  )}
                >
                  {yr}
                </MotionLink>
              ))}
            </nav>
          )}

          {!isEmpty && (
            <div
              className="motion-blur-in mt-5 flex justify-center"
              style={blurDelay(320)}
            >
              <StoryShareButton
                variant="outlineSm"
                label="Bagikan Kartu Story 9:16"
                className="border-white/30 bg-white/15 text-white hover:bg-white/25"
                spec={{
                  kind: "wrapped",
                  siteName,
                  periodLabel: data.periodLabel,
                  headline,
                  stats: [
                    { label: "Momen Galeri", value: String(data.totals.media) },
                    { label: "Artikel Terbit", value: String(data.totals.posts) },
                    { label: "Agenda", value: String(data.totals.events) },
                    { label: "Pesan & Suka", value: String(data.totals.totalLikes || data.totals.messages) },
                  ],
                  highlight: highlightText,
                  filename: `kilas-balik-${data.year ?? "semua"}`,
                }}
              />
            </div>
          )}
        </div>
      </section>

      {isEmpty ? (
        <EmptyState
          icon={<Sparkles className="h-8 w-8" />}
          title="Belum ada catatan pada periode ini"
          description="Saat foto, artikel, agenda, dan pesan terkumpul, rangkuman perjalanan komunitas akan terangkai otomatis di sini."
        />
      ) : (
        <>
          {/* Ringkasan Angka 4 Ubin */}
          <section aria-label="Ringkasan statistik">
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {statTiles.map((tile, index) => {
                const Icon = tile.icon;
                const reveal = listReveal(index);
                return (
                  <div
                    key={tile.label}
                    data-spotlight
                    style={reveal.style}
                    className={cn(
                      cardClass("elevated", "relative flex flex-col justify-between overflow-hidden p-4"),
                      reveal.className,
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted text-caption1 font-semibold">
                        {tile.label}
                      </dt>
                      <span
                        className={cn(
                          "grid size-8 place-items-center rounded-xl",
                          tile.tone,
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="size-4" />
                      </span>
                    </div>
                    <dd className="font-display mt-3 text-title1 font-extrabold tabular-nums sm:text-large-title">
                      <CountUp value={tile.value} />
                    </dd>
                    <p className="text-muted mt-1 text-caption2">{tile.sub}</p>
                  </div>
                );
              })}
            </dl>
          </section>

          {/* Grafik Ritme 12 Bulan (Murni CSS) */}
          <section
            aria-labelledby="wrapped-rhythm"
            className={cardClass("elevated", "space-y-4 p-5")}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-muted text-caption2 font-bold uppercase tracking-wider">
                  Ritme Kebersamaan
                </p>
                <h2
                  id="wrapped-rhythm"
                  className="font-display mt-0.5 flex items-center gap-2 text-title3 font-bold"
                >
                  <TrendingUp
                    className="text-primary-readable size-4.5"
                    aria-hidden="true"
                  />
                  Aktivitas per Bulan
                </h2>
              </div>
              {data.busiestMonth && (
                <span className="bg-primary/12 text-primary-readable rounded-full px-3 py-1 text-caption1 font-semibold">
                  Puncak: {data.busiestMonth.label} ({data.busiestMonth.total})
                </span>
              )}
            </div>

            <div
              role="img"
              aria-label={`Distribusi aktivitas 12 bulan untuk ${data.periodLabel}`}
              className="relative grid h-44 grid-cols-12 items-end gap-1.5 pt-4 sm:gap-2.5"
            >
              <span
                aria-hidden="true"
                className="border-border/50 pointer-events-none absolute inset-x-0 top-1/3 border-t border-dashed"
              />
              <span
                aria-hidden="true"
                className="border-border/50 pointer-events-none absolute inset-x-0 top-2/3 border-t border-dashed"
              />
              {data.monthlyBars.map((bar) => {
                const pct =
                  bar.total === 0
                    ? 6
                    : Math.max(14, Math.round((bar.total / maxMonth) * 100));
                const isPeak =
                  data.busiestMonth?.label === bar.label && bar.total > 0;

                return (
                  <div
                    key={bar.label}
                    className="flex h-full flex-col items-center justify-end gap-1.5"
                    title={`${bar.label}: ${bar.total} (${bar.media} media, ${bar.posts} artikel, ${bar.events} agenda)`}
                  >
                    <span
                      className={cn(
                        "text-[0.65rem] font-semibold tabular-nums",
                        bar.total > 0 ? "text-foreground" : "text-muted/50",
                      )}
                    >
                      {bar.total > 0 ? bar.total : ""}
                    </span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        style={{ height: `${pct}%` }}
                        className={cn(
                          "w-full rounded-t-lg transition-all duration-500",
                          bar.total === 0
                            ? "bg-surface-2"
                            : isPeak
                              ? "gloss bg-primary shadow-sm"
                              : "bg-primary/45",
                        )}
                      />
                    </div>
                    <span className="text-muted text-[0.65rem] font-medium">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Grid Sorotan Bento */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Kategori Teraktif */}
            {data.topCategories.length > 0 && (
              <section
                aria-labelledby="wrapped-categories"
                className={cardClass("elevated", "space-y-3.5 p-5")}
              >
                <h2
                  id="wrapped-categories"
                  className="font-display text-base font-bold"
                >
                  Topik &amp; Kategori Teraktif
                </h2>
                <ul className="space-y-2.5">
                  {data.topCategories.map((cat) => {
                    const widthPct = Math.max(
                      12,
                      Math.round((cat.count / maxCat) * 100),
                    );
                    return (
                      <li key={cat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="truncate">{cat.name}</span>
                          <span className="text-muted tabular-nums">
                            {cat.count} karya
                          </span>
                        </div>
                        <div className="bg-surface-2 h-2 overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Lagu / Songfess Favorit */}
            {data.topSong && (
              <section
                aria-labelledby="wrapped-song"
                className={cardClass(
                  "elevated",
                  "relative flex flex-col justify-between gap-4 overflow-hidden p-5",
                )}
              >
                <span
                  aria-hidden="true"
                  className="aurora pointer-events-none absolute inset-0"
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-primary-readable text-caption2 font-bold uppercase tracking-wider">
                      {data.topSong.isSongfess
                        ? "Songfess Terfavorit"
                        : "Lagu Pengiring Komunitas"}
                    </p>
                    <h2
                      id="wrapped-song"
                      className="font-display mt-1 text-lg font-bold leading-snug"
                    >
                      {data.topSong.title}
                    </h2>
                    {data.topSong.artist && (
                      <p className="text-muted text-sm">{data.topSong.artist}</p>
                    )}
                  </div>
                  <IconPlate
                    icon={Disc3}
                    size="lg"
                    className="bg-primary text-primary-foreground"
                    iconClassName={isPlayingTopSong ? "animate-spin [animation-duration:6s]" : undefined}
                  />
                </div>

                <div className="relative flex items-center justify-between gap-3">
                  <span className="text-muted text-xs">
                    {data.topSong.isSongfess
                      ? `Disematkan di ${data.topSong.mentions} pesan anonim`
                      : "Putar langsung di Dynamic Island"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void music.playTrackById(data.topSong!.id)}
                    className="motion-pressable gloss bg-primary text-primary-foreground inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold"
                  >
                    <Play className="size-3.5 fill-current" aria-hidden="true" />
                    {isPlayingTopSong ? "Sedang Diputar" : "Putar Lagu"}
                  </button>
                </div>
              </section>
            )}

            {/* Pesan Anonim Terpopuler */}
            {data.topMessage && (
              <section
                aria-labelledby="wrapped-message"
                className={cardClass(
                  "elevated",
                  "relative flex flex-col justify-between gap-4 overflow-hidden border-foreground/[0.08] p-5 dark:border-white/[0.08]",
                )}
                style={{ backgroundColor: pastelTint(data.topMessage.id) }}
              >
                <Quote
                  aria-hidden="true"
                  className="text-foreground/[0.06] pointer-events-none absolute right-4 top-4 size-10 dark:text-white/[0.08]"
                />
                <div className="relative">
                  <p className="text-primary-readable text-caption2 font-bold uppercase tracking-wider">
                    Pesan Paling Disukai
                  </p>
                  <blockquote
                    id="wrapped-message"
                    className="font-display mt-2 pr-8 text-headline font-semibold leading-snug"
                  >
                    “{data.topMessage.text}”
                  </blockquote>
                </div>
                <div className="border-foreground/[0.07] relative flex items-center justify-between border-t pt-3 text-xs dark:border-white/[0.07]">
                  <span className="text-tone-pink-text inline-flex items-center gap-1 font-semibold">
                    <Heart className="size-3.5 fill-current" aria-hidden="true" />
                    {data.topMessage.likes} suka
                  </span>
                  <MotionLink
                    href="/pesan"
                    className="text-primary-readable inline-flex items-center gap-0.5 font-semibold hover:underline"
                  >
                    Buka papan pesan
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </MotionLink>
                </div>
              </section>
            )}

            {/* Album Terpadat */}
            {data.topAlbum && (
              <MotionLink
                href={`/album/${data.topAlbum.slug}`}
                data-spotlight
                className={cardClass(
                  "interactive",
                  "group flex flex-col justify-between gap-4 overflow-hidden p-5",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-primary-readable text-caption2 font-bold uppercase tracking-wider">
                      Album Terpadat
                    </p>
                    <h2 className="font-display group-hover:text-primary-readable mt-1 text-lg font-bold transition-colors">
                      {data.topAlbum.title}
                    </h2>
                    <p className="text-muted mt-0.5 text-xs tabular-nums">
                      {data.topAlbum.mediaCount} foto &amp; video terkurasi
                    </p>
                  </div>
                  <IconPlate
                    icon={BookImage}
                    size="md"
                    className="bg-tone-indigo text-white"
                  />
                </div>
                <span className="text-primary-readable inline-flex items-center gap-1 text-xs font-semibold">
                  Jelajahi album
                  <ArrowUpRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </span>
              </MotionLink>
            )}
          </div>

          {/* Anggota Paling Sering Disapa */}
          {data.spotlightMembers.length > 0 && (
            <section aria-labelledby="wrapped-members" className="space-y-3">
              <SectionHeader
                id="wrapped-members"
                eyebrow="Sorotan"
                title={`${memberPlural} yang paling sering terekam`}
                actionHref="/anggota"
                actionLabel="Semua"
              />
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {data.spotlightMembers.map((member, index) => (
                  <MotionLink
                    key={member.id}
                    href={`/profil/${member.slug}`}
                    className={cardClass(
                      "interactive",
                      "flex items-center gap-3 p-3 [--avatar-gap:rgb(var(--surface))]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full font-mono text-caption2 font-bold tabular-nums",
                        index === 0
                          ? "gloss bg-primary text-primary-foreground"
                          : index < 3
                            ? "border-primary/20 bg-primary/12 text-primary-readable border"
                            : "bg-surface-2 text-muted",
                      )}
                    >
                      #{index + 1}
                    </span>
                    <Avatar
                      name={member.name}
                      src={member.photoUrl}
                      size={44}
                      ring={member.isCore}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {member.name}
                      </p>
                      <p className="text-muted truncate text-caption1">
                        {member.mentions} momen tercatat
                      </p>
                    </div>
                  </MotionLink>
                ))}
              </div>
            </section>
          )}

          {/* Cuplikan Visual */}
          {data.featuredMedia.length > 0 && (
            <section aria-labelledby="wrapped-visuals" className="space-y-3">
              <SectionHeader
                id="wrapped-visuals"
                eyebrow="Dokumentasi"
                title="Cuplikan momen"
                actionHref="/galeri"
                actionLabel="Galeri"
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.featuredMedia.map((item, index) => {
                  const reveal = listReveal(index);
                  return (
                    <MotionLink
                      key={item.id}
                      href={`/pin/${item.id}`}
                      style={reveal.style}
                      className={cn(
                        cardClass(
                          "interactive",
                          "group relative aspect-[4/5] overflow-hidden rounded-pin",
                        ),
                        reveal.className,
                      )}
                    >
                      <MediaPreview
                        media={{ type: item.type, url: item.url }}
                        alt={item.title ?? "Momen galeri"}
                        sizes="(max-width: 640px) 50vw, 240px"
                        seed={item.id}
                        className="motion-media-image"
                      />
                      <span className="media-tint" aria-hidden="true" />
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/78 via-black/30 to-transparent p-2.5 text-white">
                        <p className="truncate text-xs font-semibold">
                          {item.title || item.category || "Momen bersama"}
                        </p>
                      </div>
                    </MotionLink>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
