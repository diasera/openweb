import type { ReactNode } from "react";
import { KineticWords, blurDelay } from "@/components/motion";
import { cardClass } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils/cn";
import { SiteLogo } from "./site-logo";

export interface SiteIdentityStat {
  label: string;
  value: number | ReactNode;
  small?: boolean;
}

/**
 * Kartu identitas heroik bersama untuk halaman Profil, Tentang, dan Profil
 * Anggota (Pola Sarang Laba-Laba): banner liquid-gradient bertepi spekular,
 * slot logo/avatar bercincin, judul kinetik, konten bebas, dan strip statistik
 * terpadu berpemisah hairline.
 */
export function SiteIdentityCard({
  name,
  logoUrl,
  logoSize = 92,
  avatarSlot,
  titleId = "site-identity-title",
  stats,
  footer,
  compactBanner = false,
  className,
  children,
}: {
  name: string;
  logoUrl?: string | null;
  logoSize?: number;
  /** Ganti logo bawaan (mis. foto profil anggota yang dapat diperbesar). */
  avatarSlot?: ReactNode;
  titleId?: string;
  stats?: ReadonlyArray<SiteIdentityStat>;
  /** Slot aksi di bawah strip statistik (mis. tombol Kartu Anggota Digital). */
  footer?: ReactNode;
  /** Banner lebih ringkas untuk kolom samping dossier desktop. */
  compactBanner?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className={cardClass(
        "elevated",
        cn("relative overflow-hidden rounded-[2rem] text-center", className),
      )}
    >
      <div
        className={cn(
          "liquid-gradient grain relative",
          compactBanner ? "h-28 sm:h-32" : "h-32 sm:h-40",
        )}
        aria-hidden="true"
      >
        <span className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgb(255_255_255/0.24)]" />
      </div>
      <div
        className={cn(
          "relative flex justify-center [--avatar-gap:rgb(var(--surface))]",
          avatarSlot ? "-mt-16" : "-mt-14 sm:-mt-16",
        )}
      >
        {avatarSlot ?? (
          <span className="avatar-ring motion-ring-spin animate-control-pop rounded-full p-[3px]">
            <span className="bg-surface block rounded-full p-1">
              <SiteLogo name={name} url={logoUrl} size={logoSize} />
            </span>
          </span>
        )}
      </div>
      <div
        className={cn(
          "pt-3 pb-6",
          compactBanner ? "px-5" : "px-5 pb-7 sm:px-10",
        )}
      >
        <h1
          id={titleId}
          className={cn(
            "font-display font-extrabold tracking-tight",
            compactBanner
              ? "text-title2 sm:text-title1"
              : "text-title1 sm:text-large-title",
          )}
        >
          <KineticWords text={name} />
        </h1>
        {children}
        {stats && stats.length > 0 && (
          <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-2">
            {stats.map((item, index) => (
              <div
                key={item.label}
                className="bg-surface-2/75 border-border/70 motion-blur-in flex flex-col-reverse justify-center rounded-2xl border px-2 py-3"
                style={blurDelay(260 + index * 65)}
              >
                <dt className="text-muted truncate text-caption1 font-medium">
                  {item.label}
                </dt>
                <dd
                  className={cn(
                    "font-display font-extrabold tabular-nums",
                    item.small
                      ? "text-primary-readable text-footnote font-bold"
                      : "text-title2",
                  )}
                >
                  {typeof item.value === "number" ? (
                    <CountUp value={item.value} />
                  ) : (
                    item.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {footer}
      </div>
    </section>
  );
}
