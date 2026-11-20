import "server-only";
import {
  getAlbumSummaries,
  getApprovedMedia,
  getMembers,
  getPastEvents,
  getPublicMessages,
  getPublishedPosts,
  getUpcomingEvents,
} from "@/lib/data";
import { getPublicMusicTracks } from "@/lib/data/music";
import { optionalRead } from "@/lib/data/read";
import { mediaMentionValues } from "@/lib/members/mention-values";
import { textMentionsMember } from "@/lib/members/name-match";
import { parseSongfessContent } from "@/lib/messages/songfess";
import { zonedParts } from "@/lib/utils/time";

const MONTH_SHORT_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

export interface WrappedMonthlyPoint {
  monthIndex: number;
  label: string;
  media: number;
  posts: number;
  events: number;
  total: number;
}

export interface WrappedSpotlightMember {
  id: string;
  slug: string;
  name: string;
  photoUrl: string | null;
  position: string | null;
  isCore: boolean;
  mentions: number;
}

export interface WrappedFeaturedMedia {
  id: string;
  type: "photo" | "video";
  url: string;
  title: string | null;
  category: string | null;
  createdAt: string;
}

export interface CommunityWrappedData {
  year: number | null;
  periodLabel: string;
  availableYears: number[];
  totals: {
    media: number;
    photos: number;
    videos: number;
    posts: number;
    members: number;
    events: number;
    albums: number;
    messages: number;
    totalLikes: number;
  };
  monthlyBars: WrappedMonthlyPoint[];
  busiestMonth: { label: string; total: number } | null;
  topCategories: Array<{ name: string; count: number }>;
  topAlbum: { slug: string; title: string; mediaCount: number } | null;
  spotlightMembers: WrappedSpotlightMember[];
  topMessage: {
    id: string;
    text: string;
    likes: number;
    createdAt: string;
  } | null;
  topSong: {
    id: string;
    title: string;
    artist: string | null;
    mentions: number;
    isSongfess: boolean;
  } | null;
  featuredMedia: WrappedFeaturedMedia[];
}

function yearOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) return null;
  return zonedParts(new Date(stamp)).year;
}

function monthOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) return null;
  return zonedParts(new Date(stamp)).month - 1;
}

/**
 * Rangkuman "Kilas Balik" komunitas tanpa tabel baru: seluruh sumber dibaca
 * paralel lewat `optionalRead` sehingga satu modul kosong tidak menjatuhkan
 * halaman. Mendukung filter per tahun (`?tahun=YYYY`) atau sepanjang masa.
 */
export async function getCommunityWrapped(
  requestedYear?: number | null,
): Promise<CommunityWrappedData> {
  const [media, posts, members, upcoming, past, albums, messages, tracks] =
    await Promise.all([
      optionalRead(
        "wrapped-media",
        () => getApprovedMedia({ limit: 500, slideCounts: false }),
        [],
      ),
      optionalRead("wrapped-posts", () => getPublishedPosts(250), []),
      optionalRead("wrapped-members", () => getMembers(), []),
      optionalRead("wrapped-events-up", () => getUpcomingEvents(50), []),
      optionalRead("wrapped-events-past", () => getPastEvents(50), []),
      optionalRead("wrapped-albums", () => getAlbumSummaries(), []),
      optionalRead("wrapped-messages", () => getPublicMessages({ limit: 250 }), []),
      optionalRead("wrapped-music", () => getPublicMusicTracks(), []),
    ]);

  const events = [...upcoming, ...past];

  // Kumpulkan semua tahun yang punya aktivitas untuk filter periode.
  const yearSet = new Set<number>();
  for (const item of media) {
    const y = yearOf(item.created_at);
    if (y) yearSet.add(y);
  }
  for (const post of posts) {
    const y = yearOf(post.published_at);
    if (y) yearSet.add(y);
  }
  for (const ev of events) {
    const y = yearOf(ev.starts_at);
    if (y) yearSet.add(y);
  }
  for (const msg of messages) {
    const y = yearOf(msg.created_at);
    if (y) yearSet.add(y);
  }

  const availableYears = [...yearSet].sort((a, b) => b - a);
  const year =
    requestedYear && availableYears.includes(requestedYear)
      ? requestedYear
      : null;

  const inPeriod = (iso: string | null | undefined) =>
    year === null || yearOf(iso) === year;

  const periodMedia = media.filter((item) => inPeriod(item.created_at));
  const periodPosts = posts.filter((post) => inPeriod(post.published_at));
  const periodEvents = events.filter((ev) => inPeriod(ev.starts_at));
  const periodMessages = messages.filter((msg) => inPeriod(msg.created_at));
  const periodAlbums =
    year === null
      ? albums
      : albums.filter((album) => inPeriod(album.latest_media_at ?? album.created_at));

  // Grafik 12 bulan (Jan..Des).
  const monthlyBars: WrappedMonthlyPoint[] = MONTH_SHORT_ID.map((label, idx) => ({
    monthIndex: idx,
    label,
    media: 0,
    posts: 0,
    events: 0,
    total: 0,
  }));

  for (const item of periodMedia) {
    const m = monthOf(item.created_at);
    if (m !== null && monthlyBars[m]) {
      monthlyBars[m]!.media += 1;
      monthlyBars[m]!.total += 1;
    }
  }
  for (const post of periodPosts) {
    const m = monthOf(post.published_at);
    if (m !== null && monthlyBars[m]) {
      monthlyBars[m]!.posts += 1;
      monthlyBars[m]!.total += 1;
    }
  }
  for (const ev of periodEvents) {
    const m = monthOf(ev.starts_at);
    if (m !== null && monthlyBars[m]) {
      monthlyBars[m]!.events += 1;
      monthlyBars[m]!.total += 1;
    }
  }

  const busiest = monthlyBars.reduce<WrappedMonthlyPoint | null>(
    (best, cur) => (cur.total > (best?.total ?? 0) ? cur : best),
    null,
  );
  const busiestMonth =
    busiest && busiest.total > 0
      ? { label: busiest.label, total: busiest.total }
      : null;

  // Kategori teraktif (gabungan galeri & artikel).
  const catCounts = new Map<string, number>();
  for (const item of periodMedia) {
    const cat = item.category?.trim();
    if (cat) catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
  }
  for (const post of periodPosts) {
    const cat = post.category?.trim();
    if (cat) catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
  }
  const topCategories = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Album terpadat.
  const bestAlbum = [...periodAlbums]
    .filter((a) => a.media_count > 0)
    .sort((a, b) => b.media_count - a.media_count)[0];
  const topAlbum = bestAlbum
    ? {
        slug: bestAlbum.slug,
        title: bestAlbum.title,
        mediaCount: bestAlbum.media_count,
      }
    : null;

  // Anggota yang paling sering muncul di cerita & dokumentasi periode ini.
  const adminMedia = periodMedia.filter((m) => m.source === "admin");
  const spotlightMembers: WrappedSpotlightMember[] = members
    .map((member) => {
      let mentions = 0;
      for (const item of adminMedia) {
        if (textMentionsMember(member.name, mediaMentionValues(item))) {
          mentions += 1;
        }
      }
      for (const post of periodPosts) {
        if (
          textMentionsMember(member.name, [
            post.title,
            post.excerpt,
            post.category,
            post.author_name,
          ])
        ) {
          mentions += 1;
        }
      }
      return {
        id: member.id,
        slug: member.slug,
        name: member.name,
        photoUrl: member.photo_url,
        position: member.position,
        isCore: member.is_pengurus,
        mentions,
      };
    })
    .filter((entry) => entry.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5);

  // Pesan terpopuler & Songfess terfavorit.
  let totalLikes = 0;
  let bestMsg: (typeof periodMessages)[number] | null = null;
  const songCounts = new Map<string, number>();

  for (const msg of periodMessages) {
    totalLikes += msg.likes;
    const parsed = parseSongfessContent(msg.content);
    if (parsed.trackId) {
      songCounts.set(parsed.trackId, (songCounts.get(parsed.trackId) ?? 0) + 1);
    }
    if (
      parsed.text.trim().length > 0 &&
      (!bestMsg || msg.likes > bestMsg.likes)
    ) {
      bestMsg = msg;
    }
  }

  const topMessage = bestMsg
    ? {
        id: bestMsg.id,
        text: parseSongfessContent(bestMsg.content).text,
        likes: bestMsg.likes,
        createdAt: bestMsg.created_at,
      }
    : null;

  const trackById = new Map(tracks.map((t) => [t.id, t]));
  const topSongEntry = [...songCounts.entries()]
    .filter(([id]) => trackById.has(id))
    .sort((a, b) => b[1] - a[1])[0];

  const topSong = topSongEntry
    ? {
        id: topSongEntry[0],
        title: trackById.get(topSongEntry[0])!.title,
        artist: trackById.get(topSongEntry[0])!.artist,
        mentions: topSongEntry[1],
        isSongfess: true,
      }
    : tracks[0]
      ? {
          id: tracks[0].id,
          title: tracks[0].title,
          artist: tracks[0].artist,
          mentions: 0,
          isSongfess: false,
        }
      : null;

  const photos = periodMedia.filter((m) => m.type === "photo").length;
  const videos = periodMedia.length - photos;

  const featuredMedia: WrappedFeaturedMedia[] = periodMedia
    .slice(0, 4)
    .map((m) => ({
      id: m.id,
      type: m.type,
      url: m.url,
      title: m.title,
      category: m.category,
      createdAt: m.created_at,
    }));

  return {
    year,
    periodLabel: year ? String(year) : "Sepanjang Masa",
    availableYears,
    totals: {
      media: periodMedia.length,
      photos,
      videos,
      posts: periodPosts.length,
      members: members.length,
      events: periodEvents.length,
      albums: periodAlbums.length,
      messages: periodMessages.length,
      totalLikes,
    },
    monthlyBars,
    busiestMonth,
    topCategories,
    topAlbum,
    spotlightMembers,
    topMessage,
    topSong,
    featuredMedia,
  };
}
