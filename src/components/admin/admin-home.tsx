import { ChevronRight, ExternalLink, LogOut } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import {
  ADMIN_FEATURE_META,
  adminFeatureHref,
  type AdminFeature,
} from "@/lib/constants";
import type { AdminStats } from "@/lib/admin/stats";
import type { AdminRow } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { MotionLink } from "@/components/motion";
import { PageShell } from "@/components/public/page-shell";
import { Avatar } from "@/components/ui/avatar";
import { cardClass } from "@/components/ui/card";
import { ADMIN_FEATURE_PRESENTATION } from "./navigation";
import styles from "./admin-home.module.css";

type FeatureBadge = { label: string; urgent?: boolean };
type AdminCardFeature = Exclude<AdminFeature, "stats">;

interface SummaryMetric {
  label: string;
  value: number;
  hint?: string;
}

function heroMetrics(
  features: AdminFeature[],
  stats: AdminStats,
): SummaryMetric[] {
  if (features.includes("stats")) {
    return [
      {
        label: "Media menunggu",
        value: stats.mediaPending,
        hint: `${stats.mediaApproved} disetujui`,
      },
      {
        label: "Pesan baru",
        value: stats.messagesUnread,
        hint: `${stats.messagesTotal} total`,
      },
      {
        label: "Pengunjung",
        value: stats.visitors,
        hint: `${stats.bellSubscribers} lonceng aktif`,
      },
    ];
  }

  const result: SummaryMetric[] = [];

  if (features.includes("media")) {
    result.push({ label: "Menunggu", value: stats.mediaPending });
  }
  if (features.includes("pesan")) {
    result.push({ label: "Pesan baru", value: stats.messagesUnread });
  }
  if (features.includes("pengunjung")) {
    result.push({ label: "Pengunjung", value: stats.visitors });
  }
  if (features.includes("blog")) {
    result.push({ label: "Artikel", value: stats.postsPublished });
  }
  if (features.includes("anggota")) {
    result.push({ label: "Anggota", value: stats.members });
  }

  return result.length > 0
    ? result.slice(0, 3)
    : [{ label: "Menu tersedia", value: features.length }];
}

function detailMetrics(stats: AdminStats): SummaryMetric[] {
  return [
    { label: "Total media", value: stats.mediaTotal },
    { label: "Anggota", value: stats.members },
    { label: "Artikel terbit", value: stats.postsPublished },
    { label: "Total artikel", value: stats.postsTotal },
  ];
}

function featureBadge(
  feature: AdminCardFeature,
  stats: AdminStats,
): FeatureBadge | null {
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

function operationalSpan(count: number, index: number) {
  const mobile =
    count === 1 || (count % 2 === 1 && index === count - 1)
      ? "col-span-2"
      : "col-span-1";

  let desktop = "lg:col-span-2";
  if (count === 1) desktop = "lg:col-span-6";
  else if (count === 2 || count === 4) desktop = "lg:col-span-3";
  else if (count === 5 && index >= 3) desktop = "lg:col-span-3";

  return cn(mobile, desktop);
}

function FeatureCard({
  feature,
  badge,
  className,
  compact = false,
}: {
  feature: AdminCardFeature;
  badge: FeatureBadge | null;
  className?: string;
  compact?: boolean;
}) {
  const presentation = ADMIN_FEATURE_PRESENTATION[feature];
  const Icon = presentation.icon;

  return (
    <MotionLink
      href={adminFeatureHref(feature)}
      className={cardClass(
        "interactive",
        cn(
          "group relative flex flex-col justify-between overflow-hidden p-4 sm:p-5",
          compact ? "min-h-32" : "min-h-40",
          className,
        ),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid h-11 w-11 place-items-center rounded-[14px]",
            presentation.tone,
          )}
        >
          <Icon className="h-[21px] w-[21px]" strokeWidth={2.15} />
        </span>
        <ChevronRight className="text-muted h-5 w-5 transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-5 min-w-0">
        <h3 className="font-display text-[17px] font-bold">
          {ADMIN_FEATURE_META[feature].label}
        </h3>
        <p className="text-muted mt-1 text-xs leading-relaxed sm:text-[13px]">
          {presentation.description}
        </p>
        {badge && (
          <span
            className={cn(
              "mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
              badge.urgent
                ? "bg-danger/10 text-danger"
                : "bg-surface-2 text-muted",
            )}
          >
            {badge.label}
          </span>
        )}
      </div>
    </MotionLink>
  );
}

export function AdminHome({
  siteName,
  admin,
  features,
  stats,
}: {
  siteName: string;
  admin: AdminRow;
  features: AdminFeature[];
  stats: AdminStats;
}) {
  const firstName = admin.name.trim().split(/\s+/)[0] || admin.name;
  const metrics = heroMetrics(features, stats);
  const details = detailMetrics(stats);
  const operational = features.filter(
    (
      feature,
    ): feature is Exclude<AdminCardFeature, "admin" | "setting"> =>
      feature !== "stats" && feature !== "admin" && feature !== "setting",
  );
  const system = features.filter(
    (feature): feature is Extract<AdminCardFeature, "admin" | "setting"> =>
      feature === "admin" || feature === "setting",
  );
  const hasStats = features.includes("stats");

  return (
    <PageShell
      header={{ variant: "title", title: "Admin" }}
      profileTabLabel="Admin"
      showNotificationPrompt={false}
      trackVisitor={false}
    >
      <div className="space-y-7">
        <section className={cn(styles.hero, "rounded-[2rem] p-5 sm:p-7")}>
          <div className={styles.content}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <Avatar
                  src={admin.avatar_url}
                  name={admin.name}
                  size={54}
                  className="shrink-0 rounded-full ring-2 ring-white/20 ring-offset-2 ring-offset-transparent"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                    Pusat website
                  </p>
                  <h1 className="font-display mt-0.5 truncate text-2xl font-bold sm:text-3xl">
                    Halo, {firstName}
                  </h1>
                  <p className="mt-0.5 truncate text-sm text-white/60">
                    {siteName}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold capitalize text-white/80">
                {admin.role}
              </span>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">Ringkasan</h2>
                <p className="text-xs text-white/50">Data website saat ini</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/60">
                Live
              </span>
            </div>

            <div
              className={cn(
                "mt-3 grid gap-2.5",
                metrics.length === 1 && "grid-cols-1",
                metrics.length === 2 && "grid-cols-2",
                metrics.length === 3 && "grid-cols-3",
              )}
            >
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className={cn(styles.metric, "rounded-2xl px-3 py-3.5 sm:px-4")}
                >
                  <p className="font-display text-xl font-bold tabular-nums sm:text-2xl">
                    {metric.value}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium leading-tight text-white/55 sm:text-xs">
                    {metric.label}
                  </p>
                  {metric.hint && (
                    <p className="mt-1 truncate text-[9px] text-white/35 sm:text-[11px]">
                      {metric.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {hasStats && (
              <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {details.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-white/[0.08] bg-black/10 px-3 py-3"
                  >
                    <p className="font-display text-lg font-bold tabular-nums">
                      {metric.value}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-white/45 sm:text-[11px]">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {operational.length > 0 && (
          <section>
            <div className="mb-3 px-1">
              <h2 className="font-display text-xl font-bold">Kelola konten</h2>
              <p className="text-muted mt-0.5 text-sm">
                Akses cepat sesuai izin akunmu.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              {operational.map((feature, index) => (
                <FeatureCard
                  key={feature}
                  feature={feature}
                  badge={featureBadge(feature, stats)}
                  className={operationalSpan(operational.length, index)}
                />
              ))}
            </div>
          </section>
        )}

        {system.length > 0 && (
          <section>
            <div className="mb-3 px-1">
              <h2 className="font-display text-xl font-bold">Sistem</h2>
              <p className="text-muted mt-0.5 text-sm">
                Akun, izin, dan identitas website.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {system.map((feature) => (
                <FeatureCard
                  key={feature}
                  feature={feature}
                  badge={featureBadge(feature, stats)}
                  compact
                />
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3">
          <MotionLink
            href="/"
            className={cardClass(
              "interactive",
              "flex min-h-24 flex-col justify-between p-4",
            )}
          >
            <ExternalLink className="text-muted h-5 w-5" />
            <span className="mt-4 text-sm font-semibold">Lihat website</span>
          </MotionLink>
          <form action={logoutAction}>
            <button
              type="submit"
              className={cardClass(
                "interactive",
                "text-danger flex min-h-24 w-full flex-col items-start justify-between p-4 text-left",
              )}
            >
              <LogOut className="h-5 w-5" />
              <span className="mt-4 text-sm font-semibold">Keluar admin</span>
            </button>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
