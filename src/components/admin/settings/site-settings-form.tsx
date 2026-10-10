"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SITE_SETTINGS_TABS, type SiteSettingsTabId } from "@/lib/site-config/client";
import { adminFeatureHref } from "@/lib/constants";
import type { SiteSettingsRow } from "@/lib/types/database";
import { ConfirmSheet } from "../admin-actions";
import { AdminTabs } from "../admin-tabs";
import { ContactSection } from "./contact-section";
import { HomeSection } from "./home-section";
import { IdentitySection } from "./identity-section";
import { SeoSection } from "./seo-section";

const TAB_PATH = adminFeatureHref("setting");

/**
 * Cangkang tab Pengaturan: tab berbasis URL (?tab=) yang bisa ditautkan,
 * dan penjaga perubahan belum disimpan saat pindah tab (sheet konfirmasi).
 * Tiap tab punya form, validasi, dan tombol simpan sendiri.
 */
export function SiteSettingsForm({
  settings,
  siteUrl,
  activeTab,
}: {
  settings: SiteSettingsRow;
  /** Origin kanonis hasil server (getSiteOrigin); jangan dihitung ulang di klien. */
  siteUrl: string;
  activeTab: SiteSettingsTabId;
}) {
  const router = useRouter();
  const dirtyRef = useRef(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const onDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  return (
    <div className="space-y-5">
      <div className="sticky-below-island z-30">
        <AdminTabs
          basePath={TAB_PATH}
          param="tab"
          label="Bagian pengaturan"
          active={activeTab}
          items={SITE_SETTINGS_TABS.map((tab) => ({ label: tab.label, value: tab.id }))}
          onSelect={(value, href, event) => {
            // Klik bermodifier membuka tab browser baru: draf di sini tetap utuh.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (value === activeTab) {
              event.preventDefault();
              return;
            }
            if (dirtyRef.current) {
              event.preventDefault();
              setPendingHref(href);
            }
          }}
        />
      </div>

      {activeTab === "identity" && (
        <IdentitySection settings={settings} siteUrl={siteUrl} onDirtyChange={onDirtyChange} />
      )}
      {activeTab === "home" && <HomeSection settings={settings} onDirtyChange={onDirtyChange} />}
      {activeTab === "seo" && (
        <SeoSection settings={settings} siteUrl={siteUrl} onDirtyChange={onDirtyChange} />
      )}
      {activeTab === "contact" && (
        <ContactSection settings={settings} siteUrl={siteUrl} onDirtyChange={onDirtyChange} />
      )}

      <ConfirmSheet
        open={pendingHref !== null}
        options={{
          title: "Buang perubahan?",
          message: "Perubahan di tab ini belum disimpan dan akan hilang bila pindah tab.",
          confirmLabel: "Buang & pindah",
        }}
        onClose={() => setPendingHref(null)}
        onConfirm={() => {
          const href = pendingHref;
          setPendingHref(null);
          dirtyRef.current = false;
          if (href) router.push(href, { scroll: false });
        }}
      />
    </div>
  );
}
