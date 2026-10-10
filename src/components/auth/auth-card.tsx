import type { ReactNode } from "react";
import { KineticWords, MotionPage, blurDelay } from "@/components/motion";
import { SiteLogo } from "@/components/public/site-logo";

/**
 * Sheet kaca berisi form Auth: bottom sheet di ponsel, kartu melayang di
 * layar lebar. Logo bercincin gradien yang berputar pelan, judul masuk per
 * kata, lalu isi menyusul dari blur — masuk dengan motion "present" seperti
 * sheet iOS.
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
    <MotionPage profile="present" className="w-full sm:max-w-[27rem]">
      <section
        aria-labelledby="auth-title"
        className="sheet-panel rounded-t-[2rem] px-5 pt-6 pb-[calc(1.5rem+var(--safe-bottom))] sm:rounded-[2rem] sm:p-8"
      >
        <div className="motion-blur-in flex items-center gap-3">
          <span className="avatar-ring motion-ring-spin shrink-0 rounded-full p-[2.5px]">
            <span className="bg-bg block rounded-full p-[2px]">
              <SiteLogo name={siteName} url={logoUrl} size={44} />
            </span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-subhead font-semibold">{siteName}</p>
            <p className="text-primary-readable text-caption1 font-semibold uppercase tracking-[0.14em]">
              {eyebrow}
            </p>
          </div>
        </div>

        <h1
          id="auth-title"
          className="font-display mt-6 text-large-title font-bold tracking-tight"
        >
          <KineticWords text={title} />
        </h1>
        <p className="text-muted motion-blur-in mt-1 text-subhead" style={blurDelay(160)}>
          {subtitle}
        </p>

        <div className="motion-blur-in mt-6" style={blurDelay(240)}>
          {children}
        </div>

        {footer && (
          <p className="text-muted mt-5 text-center text-caption1 leading-relaxed">{footer}</p>
        )}
      </section>
    </MotionPage>
  );
}
