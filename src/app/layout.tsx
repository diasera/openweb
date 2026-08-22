import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { getSettings } from "@/lib/data";
import { getPublicMusicTracks } from "@/lib/data/music";
import {
  getHomeSeoDescription,
  getHomeSeoTitle,
  getSiteUrl,
  getSocialHandle,
  getSocialImageUrl,
  normalizeAdsenseClientId,
  normalizeAnalyticsId,
  OG_CARD_PATH,
} from "@/lib/seo";
import { rgbChannelsToHex, themeCss } from "@/lib/theme";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import { ThemeScript } from "@/components/public/theme-toggle";
import { AppChromeProvider } from "@/components/public/app-chrome-provider";
import { MotionProvider } from "@/components/motion";
import { MusicProvider } from "@/components/public/music";
import "./globals.css";
import "../components/motion/motion.css";

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSettings();
  const primary = settings.theme?.primary
    ? rgbChannelsToHex(settings.theme.primary)
    : "#000000";
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: primary },
      { media: "(prefers-color-scheme: dark)", color: "#000000" },
    ],
  };
}

/** Metadata brand global; metadata per halaman dibangun oleh pusat src/lib/seo. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteName = settings.site_name;
  const title = getHomeSeoTitle(settings);
  const description = getHomeSeoDescription(settings);
  const siteUrl = getSiteUrl(settings);
  const image = getSocialImageUrl(settings) ?? OG_CARD_PATH;
  const images = [{ url: new URL(image, siteUrl).toString(), alt: `${siteName} — ${title}` }];
  const adsenseClientId = normalizeAdsenseClientId(
    settings.google_adsense_client_id,
  );
  return {
    metadataBase: new URL(siteUrl),
    applicationName: siteName,
    title: { default: title, template: `%s · ${siteName}` },
    description,
    authors: [{ name: siteName, url: siteUrl }],
    creator: siteName,
    publisher: siteName,
    category: settings.site_type,
    referrer: "origin-when-cross-origin",
    formatDetection: { telephone: false, address: false, email: false },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName,
      locale: settings.locale.replace("-", "_"),
      images,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: getSocialHandle(settings.social),
      title,
      description,
      images,
    },
    robots: {
      index: settings.seo_indexing_enabled,
      follow: settings.seo_indexing_enabled,
      googleBot: {
        index: settings.seo_indexing_enabled,
        follow: settings.seo_indexing_enabled,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    verification:
      settings.google_site_verification || settings.bing_site_verification
        ? {
            google: settings.google_site_verification || undefined,
            other: settings.bing_site_verification
              ? { "msvalidate.01": [settings.bing_site_verification] }
              : undefined,
          }
        : undefined,
    icons: settings.favicon_url
      ? { icon: settings.favicon_url, apple: settings.favicon_url }
      : { icon: "/icon.svg", apple: "/icon.svg" },
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: siteName, statusBarStyle: "default" },
    other: adsenseClientId
      ? { "google-adsense-account": adsenseClientId }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, initialTracks] = await Promise.all([
    getSettings(),
    getPublicMusicTracks(),
  ]);
  const theme = themeCss(settings.theme);
  const labels = getContentLabels(settings);
  const analyticsId = normalizeAnalyticsId(settings.google_analytics_id);
  const adsenseClientId = normalizeAdsenseClientId(
    settings.google_adsense_client_id,
  );

  return (
    <html
      lang={settings.locale}
      className="bg-bg"
      suppressHydrationWarning
    >
      <body>
        <ThemeScript />
        {theme && <style dangerouslySetInnerHTML={{ __html: theme }} />}
        <MotionProvider>
          <MusicProvider
            siteName={settings.site_name}
            initialTracks={initialTracks}
          >
            <AppChromeProvider
              siteName={settings.site_name}
              logoUrl={settings.logo_url}
              memberLabel={toDisplayLabel(labels.memberPlural, settings.locale)}
            >
              {children}
            </AppChromeProvider>
          </MusicProvider>
        </MotionProvider>

        {analyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(analyticsId)});`}
            </Script>
          </>
        )}
        {adsenseClientId && settings.google_adsense_auto_ads && (
          <Script
            id="google-adsense"
            async
            crossOrigin="anonymous"
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          />
        )}
      </body>
    </html>
  );
}
