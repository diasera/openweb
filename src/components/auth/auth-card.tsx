import type { ReactNode } from "react";
import { MotionPage, staggerDelay } from "@/components/motion";
import { SiteLogo } from "@/components/public/site-logo";

/**
 * Sheet kaca berisi form Auth: bottom sheet di ponsel, kartu melayang di
 * layar lebar. Logo memakai cincin ala story (utility avatar-ring) yang sama
 * dengan anggota inti; masuk dengan motion "present" seperti sheet iOS.
 */
export function AuthCard({
  siteName,
  logoUrl,
  eyebrow,
  title,
  subtitle,
  footer,
  children,
}: {
  siteName: string;
  logoUrl?: string | null;
  eyebrow: string;
  title: string;
  subtitle: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <MotionPage profile="present" className="w-full sm:max-w-[26rem]">
      <section
        aria-labelledby="auth-title"
        className="sheet-panel rounded-t-ios-lg px-5 pt-6 pb-[calc(1.5rem+var(--safe-bottom))] sm:rounded-ios-lg sm:p-7"
      >
        <div className="animate-rise flex items-center gap-3">
          <span className="avatar-ring shrink-0 rounded-full p-[2.5px]">
            <span className="bg-bg block rounded-full p-[2px]">
              <SiteLogo name={siteName} url={logoUrl} size={44} />
            </span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-subhead font-semibold">{siteName}</p>
            <p className="text-primary-readable text-caption1 font-semibold uppercase tracking-wide">
              {eyebrow}
            </p>
          </div>
        </div>

        <h1
          id="auth-title"
          className="font-display animate-rise mt-6 text-large-title font-bold tracking-tight"
          style={{ animationDelay: staggerDelay(1, 50) }}
        >
          {title}
        </h1>
        <p
          className="text-muted animate-rise mt-1 text-subhead"
          style={{ animationDelay: staggerDelay(2, 50) }}
        >
          {subtitle}
        </p>

        <div
          className="animate-rise mt-6"
          style={{ animationDelay: staggerDelay(3, 50) }}
        >
          {children}
        </div>

        {footer && (
          <p className="text-muted mt-5 text-center text-caption1 leading-relaxed">
            {footer}
          </p>
        )}
      </section>
    </MotionPage>
  );
}
