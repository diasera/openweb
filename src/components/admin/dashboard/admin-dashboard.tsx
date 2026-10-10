import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  LogOut,
  PenLine,
  Plus,
  Send,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/auth/actions";
import {
  ADMIN_FEATURE_META,
  adminFeatureHref,
  type AdminFeature,
} from "@/lib/constants";
import type { AdminDashboardData } from "@/lib/admin/dashboard";
import type { AdminStats } from "@/lib/admin/stats";
import type { AdminAccount } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { zonedParts } from "@/lib/utils/time";
import { KineticWords, MotionLink, blurDelay, listReveal } from "@/components/motion";
import { PageShell } from "@/components/public/page-shell";
import { Avatar } from "@/components/ui/avatar";
import { cardClass } from "@/components/ui/card";
import { MediaPreview } from "@/components/ui/media-preview";
import { RelativeTime } from "@/components/ui/relative-time";
import { SectionHeader } from "@/components/ui/section-header";
import { AccountDialog } from "../accounts/account-dialog";
import { StatusBadge } from "../admin-list";
import { ADMIN_FEATURE_PRESENTATION } from "../features";
import { StatTile } from "../stat-tile";

type LaunchFeature = Exclude<AdminFeature, "stats">;

export interface DashboardSeoStatus {
  indexing: boolean;
  siteUrl: string;
  verified: boolean;
}

function greeting(): string {
  const { hour } = zonedParts(new Date());
  if (hour >= 4 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

/** Badge angka hidup di kartu peluncur fitur. */
function featureBadge(feature: LaunchFeature, stats: AdminStats) {
  switch (feature) {
    case "media":
      return stats.mediaPending > 0
        ? { label: `${stats.mediaPending} menunggu`, urgent: true }
        : { label: `${stats.mediaApproved} terbit` };
    case "pesan":
      return stats.messagesUnread > 0
        ? { label: `${stats.messagesUnread} baru`, urgent: true }
        : { label: `${stats.messagesTotal} pesan` };
    case "anggota":
      return { label: `${stats.members} orang` };
    case "blog":
      return { label: `${stats.postsPublished} terbit` };
    case "agenda":
      return { label: `${stats.eventsUpcoming} mendatang` };
    case "music":
      return { label: "Playlist" };
    case "pengunjung":
      return { label: `${stats.bellSubscribers} berlangganan` };
    case "admin":
      return { label: "Khusus owner" };
    case "setting":
      return { label: "Website" };
  }
}

function QuickAction({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <MotionLink
      href={href}
      className="glass-button inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-footnote font-semibold"
    >
      {icon}
      {children}
    </MotionLink>
  );
}

/**
 * Beranda admin (tab Profil saat masuk): sapaan berdasarkan jam situs, antrean
 * yang perlu tindakan, angka utama, pratinjau moderasi & pesan, peluncur
 * fitur sesuai izin, lalu sistem dan akun. Semua angka/akses mengikuti izin
 * akun (allowedFeatures), bukan peran saja.
 */
export function AdminDashboard({
  siteName,
  admin,
  features,
  data,
  clientIpDetected,
  seo,
}: {
  siteName: string;
  admin: AdminAccount;
  features: AdminFeature[];
  data: AdminDashboardData;
  /** false = server tidak bisa membaca IP klien (TRUSTED_PROXY belum sesuai). */
  clientIpDetected: boolean;
  /** Hanya untuk owner (fitur Pengaturan). */
  seo: DashboardSeoStatus | null;
}) {
  const { stats, queue, messages } = data;
  const has = (feature: AdminFeature) => features.includes(feature);
  const seesAll = has("stats");
  const firstName = admin.name.trim().split(/\s+/)[0] || admin.name;
  const launch = features.filter(
    (feature): feature is LaunchFeature => feature !== "stats",
  );
  const operational = launch.filter((feature) => feature !== "admin" && feature !== "setting");
  const system = launch.filter((feature) => feature === "admin" || feature === "setting");
  const attention = [
    has("media") && stats.mediaPending > 0
      ? {
          href: adminFeatureHref("media"),
          count: stats.mediaPending,
          label: "kiriman menunggu ditinjau",
          feature: "media" as const,
        }
      : null,
    has("pesan") && stats.messagesUnread > 0
      ? {
          href: adminFeatureHref("pesan"),
          count: stats.messagesUnread,
          label: "pesan belum dibaca",
          feature: "pesan" as const,
        }
      : null,
  ].filter((item) => item !== null);

  const tiles = [
    (seesAll || has("media")) && {
      label: "Media terbit",
      value: stats.mediaApproved,
      hint: `${stats.mediaTotal} total kiriman`,
      feature: "media" as const,
    },
    (seesAll || has("pengunjung")) && {
      label: "Pengunjung",
      value: stats.visitors,
      hint: `${stats.bellSubscribers} lonceng aktif`,
      feature: "pengunjung" as const,
    },
    (seesAll || has("pesan")) && {
      label: "Pesan",
      value: stats.messagesTotal,
      hint: `${stats.messagesUnread} belum dibaca`,
      feature: "pesan" as const,
    },
    (seesAll || has("blog")) && {
      label: "Artikel terbit",
      value: stats.postsPublished,
      hint: `${stats.postsTotal} total artikel`,
      feature: "blog" as const,
    },
    (seesAll || has("anggota")) && {
      label: "Anggota",
      value: stats.members,
      hint: "Profil publik",
      feature: "anggota" as const,
    },
    (seesAll || has("agenda")) && {
      label: "Acara mendatang",
      value: stats.eventsUpcoming,
      hint: "Termasuk draf",
      feature: "agenda" as const,
    },
  ].filter((tile) => tile !== false);

  return (
    <PageShell
      header={{ variant: "title", title: "Admin" }}
      profileTabLabel="Admin"
      showNotificationPrompt={false}
      trackVisitor={false}
    >
      <div className="space-y-9">
        {/* ---- Sapaan ---------------------------------------------------- */}
        <section
          aria-labelledby="admin-greeting"
          className="aurora border-border bg-surface shadow-soft relative overflow-hidden rounded-[2rem] border p-5 sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className="motion-ring-spin shrink-0">
                <Avatar src={admin.avatar_url} name={admin.name} size={60} ring />
              </span>
              <div className="min-w-0">
                <p className="text-primary-readable text-caption1 font-semibold uppercase tracking-[0.14em]">
                  {greeting()}
                </p>
                <h1
                  id="admin-greeting"
                  className="font-display truncate text-title1 font-bold tracking-tight sm:text-large-title"
                >
                  <KineticWords text={firstName} />
                </h1>
                <p className="text-muted mt-0.5 truncate text-sm">
                  {siteName} ·{" "}
                  <span className="font-semibold capitalize">{admin.role}</span>
                </p>
              </div>
            </div>
            <StatusBadge tone="success" live>
              Online
            </StatusBadge>
          </div>

          <div className="motion-blur-in mt-5 flex flex-wrap gap-2" style={blurDelay(200)}>
            <QuickAction href="/" icon={<Globe className="size-4" aria-hidden="true" />}>
              Lihat situs
            </QuickAction>
            {has("blog") && (
              <QuickAction href="/profil/blog/new" icon={<PenLine className="size-4" aria-hidden="true" />}>
                Tulis artikel
              </QuickAction>
            )}
            <QuickAction href="/buat" icon={<Plus className="size-4" aria-hidden="true" />}>
              Buat pin
            </QuickAction>
            {has("pengunjung") && (
              <QuickAction
                href={`${adminFeatureHref("pengunjung")}#kirim-notifikasi`}
                icon={<Send className="size-4" aria-hidden="true" />}
              >
                Kirim notifikasi
              </QuickAction>
            )}
          </div>
        </section>

        {!clientIpDetected && (
          <div
            role="status"
            className="border-warning/30 bg-warning/10 flex gap-3 rounded-2xl border p-4"
          >
            <TriangleAlert className="text-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold">IP pengunjung tidak terdeteksi</p>
              <p className="text-muted mt-1">
                Setel <code className="font-mono text-xs">TRUSTED_PROXY</code> sesuai
                proxy server (cloudflare, x-real-ip, atau x-forwarded-for). Tanpa itu,
                batas permintaan berlaku bersama untuk semua pengunjung dan blokir IP
                tidak berfungsi.
              </p>
            </div>
          </div>
        )}

        {/* ---- Perlu perhatian ------------------------------------------- */}
        {(has("media") || has("pesan")) && (
          <section aria-labelledby="admin-attention">
            <h2 id="admin-attention" className="sr-only">
              Perlu perhatian
            </h2>
            {attention.length > 0 ? (
              <div className={cn("grid gap-3", attention.length > 1 && "sm:grid-cols-2")}>
                {attention.map((item, index) => {
                  const presentation = ADMIN_FEATURE_PRESENTATION[item.feature];
                  const Icon = presentation.icon;
                  return (
                    <MotionLink
                      key={item.href}
                      href={item.href}
                      data-spotlight
                      className={cardClass(
                        "interactive",
                        "animate-rise group border-primary/25 flex items-center gap-4 p-4 sm:p-5",
                      )}
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <span className={cn("gloss relative grid size-12 shrink-0 place-items-center rounded-2xl", presentation.plate)}>
                        <Icon className="size-6" aria-hidden="true" />
                        <span className="bg-primary text-primary-foreground ring-surface absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full px-1 text-caption2 font-bold ring-2">
                          {item.count}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-display block text-title3 font-bold tabular-nums">
                          {item.count}{" "}
                          <span className="text-body font-semibold">{item.label}</span>
                        </span>
                        <span className="text-primary-readable mt-0.5 inline-flex items-center gap-1.5 text-footnote font-semibold">
                          <span className="motion-live-dot size-1.5" aria-hidden="true" />
                          Tinjau sekarang
                        </span>
                      </span>
                      <ArrowUpRight
                        className="text-muted size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </MotionLink>
                  );
                })}
              </div>
            ) : (
              <div className={cardClass("flat", "animate-rise flex items-center gap-3 p-4")}>
                <CheckCircle2 className="text-success size-6 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Semua beres</p>
                  <p className="text-muted text-sm">
                    Tidak ada kiriman atau pesan yang menunggu.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ---- Angka utama ----------------------------------------------- */}
        {tiles.length > 0 && (
          <section aria-labelledby="admin-stats">
            <SectionHeader id="admin-stats" eyebrow="Ringkasan" title="Angka hari ini" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {tiles.map((tile, index) => {
                const presentation = ADMIN_FEATURE_PRESENTATION[tile.feature];
                return (
                  <div key={tile.label} {...listReveal(index)}>
                    <StatTile
                      label={tile.label}
                      value={tile.value}
                      hint={tile.hint}
                      icon={presentation.icon}
                      plate={presentation.plate}
                      href={has(tile.feature) ? adminFeatureHref(tile.feature) : undefined}
                      className="h-full"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---- Antrean moderasi & pesan terbaru --------------------------- */}
        {(queue.length > 0 || messages.length > 0) && (
          <div className="grid gap-9 lg:grid-cols-2 lg:gap-6">
            {queue.length > 0 && (
              <section aria-labelledby="admin-queue">
                <SectionHeader
                  id="admin-queue"
                  eyebrow="Moderasi"
                  title="Kiriman terbaru"
                  actionHref={`${adminFeatureHref("media")}?status=pending`}
                  actionLabel="Tinjau"
                />
                <div className="grid grid-cols-3 gap-2">
                  {queue.map((item, index) => (
                    <MotionLink
                      key={item.id}
                      href={`${adminFeatureHref("media")}?status=pending`}
                      title={item.title || item.caption || "Kiriman"}
                      className="group animate-rise motion-pressable bg-surface-2 relative aspect-square overflow-hidden rounded-2xl"
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      <MediaPreview
                        media={item}
                        alt={item.title || item.caption || "Kiriman menunggu"}
                        sizes="(max-width: 1023px) 33vw, 160px"
                        seed={item.id}
                        // Signed URL inbox berumur pendek: jangan disimpan optimizer.
                        unoptimized
                        className="motion-media-image"
                      />
                      <span className="media-tint" aria-hidden="true" />
                      <span className="absolute inset-x-1.5 bottom-1.5 truncate rounded-full bg-black/45 px-2 py-0.5 text-caption2 font-semibold text-white backdrop-blur">
                        <RelativeTime iso={item.created_at} />
                      </span>
                    </MotionLink>
                  ))}
                </div>
              </section>
            )}

            {messages.length > 0 && (
              <section aria-labelledby="admin-messages">
                <SectionHeader
                  id="admin-messages"
                  eyebrow="Kotak masuk"
                  title="Pesan terbaru"
                  actionHref={adminFeatureHref("pesan")}
                  actionLabel="Semua"
                />
                <ul className="space-y-2">
                  {messages.map((message, index) => (
                    <li key={message.id} {...listReveal(index)}>
                      <MotionLink
                        href={adminFeatureHref("pesan")}
                        className={cardClass(
                          "interactive",
                          cn(
                            "flex items-start gap-3 p-3.5",
                            !message.is_read && "border-primary/30",
                          ),
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            message.is_read ? "bg-border" : "bg-primary",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm leading-relaxed">{message.content}</span>
                          <span className="text-muted mt-1 block text-caption1">
                            {!message.is_read && (
                              <span className="text-primary-readable font-semibold">Baru · </span>
                            )}
                            <RelativeTime iso={message.created_at} />
                          </span>
                        </span>
                      </MotionLink>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* ---- Peluncur fitur -------------------------------------------- */}
        {operational.length > 0 && (
          <section aria-labelledby="admin-launch">
            <SectionHeader
              id="admin-launch"
              eyebrow="Kelola"
              title="Konten website"
              subtitle="Akses cepat sesuai izin akunmu."
            />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {operational.map((feature, index) => (
                <div key={feature} {...listReveal(index)}>
                  <FeatureCard feature={feature} badge={featureBadge(feature, stats)} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---- Sistem ---------------------------------------------------- */}
        {(system.length > 0 || seo) && (
          <section aria-labelledby="admin-system">
            <SectionHeader
              id="admin-system"
              eyebrow="Sistem"
              title="Website & akses"
              subtitle="Akun, izin, identitas, dan mesin pencari."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {system.map((feature, index) => (
                <div key={feature} {...listReveal(index)}>
                  <FeatureCard feature={feature} badge={featureBadge(feature, stats)} />
                </div>
              ))}
              {seo && (
                <div {...listReveal(system.length)}>
                  <SeoStatusCard seo={seo} />
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---- Akun ------------------------------------------------------ */}
        <section aria-label="Akun" className="grid gap-3 sm:grid-cols-3">
          <MotionLink
            href="/"
            data-spotlight
            className={cardClass("interactive", "group flex items-center gap-3 p-4")}
          >
            <span className="bg-surface-2 grid size-10 place-items-center rounded-xl">
              <ExternalLink className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Lihat website</span>
              <span className="text-muted block truncate text-caption1">Sebagai pengunjung</span>
            </span>
          </MotionLink>
          <AccountDialog name={admin.name} />
          <form action={logoutAction}>
            <button
              type="submit"
              className={cardClass(
                "interactive",
                "group text-danger flex w-full items-center gap-3 p-4 text-left",
              )}
            >
              <span className="bg-danger/10 grid size-10 place-items-center rounded-xl">
                <LogOut className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Keluar</span>
                <span className="text-muted block truncate text-caption1">Akhiri sesi admin</span>
              </span>
            </button>
          </form>
        </section>
      </div>
    </PageShell>
  );
}

function FeatureCard({
  feature,
  badge,
}: {
  feature: LaunchFeature;
  badge: { label: string; urgent?: boolean };
}) {
  const presentation = ADMIN_FEATURE_PRESENTATION[feature];
  const Icon = presentation.icon;
  return (
    <MotionLink
      href={adminFeatureHref(feature)}
      data-spotlight
      className={cardClass(
        "interactive",
        "group relative flex h-full min-h-40 flex-col justify-between overflow-hidden p-4 sm:p-5",
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <span className={cn("gloss grid size-11 place-items-center rounded-[14px]", presentation.plate)}>
          <Icon className="size-5.5" strokeWidth={2.15} aria-hidden="true" />
        </span>
        <ArrowUpRight
          className="text-muted size-4.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
      <div className="relative mt-5 min-w-0">
        <h3 className="font-display text-body font-bold">{ADMIN_FEATURE_META[feature].label}</h3>
        <p className="text-muted mt-1 line-clamp-2 text-caption1 leading-relaxed sm:text-footnote">
          {presentation.description}
        </p>
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption2 font-semibold",
            badge.urgent ? "bg-primary/12 text-primary-readable" : "bg-surface-2 text-muted",
          )}
        >
          {badge.urgent && <span className="motion-live-dot size-1.5" aria-hidden="true" />}
          {badge.label}
        </span>
      </div>
    </MotionLink>
  );
}

function SeoStatusCard({ seo }: { seo: DashboardSeoStatus }) {
  const healthy = seo.indexing && seo.verified;
  let host = seo.siteUrl;
  try {
    host = new URL(seo.siteUrl).host;
  } catch {
    // Biarkan origin apa adanya.
  }
  return (
    <MotionLink
      href={`${adminFeatureHref("setting")}?tab=seo`}
      data-spotlight
      className={cardClass("interactive", "group flex h-full min-h-40 flex-col justify-between p-4 sm:p-5")}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "gloss grid size-11 place-items-center rounded-[14px] text-white",
            healthy ? "bg-tone-green" : "bg-tone-orange",
          )}
        >
          <Globe className="size-5.5" aria-hidden="true" />
        </span>
        <StatusBadge tone={seo.indexing ? "success" : "warning"} live={seo.indexing}>
          {seo.indexing ? "Indexing aktif" : "Indexing mati"}
        </StatusBadge>
      </div>
      <div className="mt-5 min-w-0">
        <h3 className="font-display text-body font-bold">Mesin pencari</h3>
        <p className="text-muted mt-1 truncate text-footnote">{host}/sitemap.xml</p>
        <p className="text-muted mt-1 text-caption1">
          {seo.verified
            ? "Verifikasi Search Console terpasang."
            : "Verifikasi lewat DNS atau isi kode di tab SEO."}
        </p>
      </div>
    </MotionLink>
  );
}
