"use client";

import Link from "next/link";
import { useCallback, useRef, type MouseEvent } from "react";
import { Card } from "@/components/ui/card";
import { SITE_SETTINGS_TABS } from "@/lib/site-config/client";
import type { SiteSettingsTabId } from "@/lib/site-config/client";
import type { SiteSettingsRow } from "@/lib/types/database";
import { ContactSection } from "./contact-section";
import { HomeSection } from "./home-section";
import { IdentitySection } from "./identity-section";
import { SeoSection } from "./seo-section";

const TAB_PATH = "/profil/setting";

/**
 * Cangkang tab Setting: nav pill URL-driven (?tab=) yang deep-linkable, plus
 * guard pergantian tab saat masih ada perubahan belum disimpan. Tiap tab punya
 * form dan tombol simpan sendiri.
 */
export function SiteSettingsForm({
  settings,
  activeTab,
}: {
  settings: SiteSettingsRow;
  activeTab: SiteSettingsTabId;
}) {
  const dirtyRef = useRef(false);
  const onDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  function guardTabSwitch(event: MouseEvent<HTMLAnchorElement>) {
    if (dirtyRef.current) {
      const leave = window.confirm(
        "Perubahan tab ini belum disimpan. Pindah tab akan membuang perubahan. Lanjutkan?",
      );
      if (!leave) event.preventDefault();
      else dirtyRef.current = false;
    }
  }

  return (
    <div className="space-y-4">
      <Card className="no-scrollbar sticky top-3 z-20 overflow-x-auto p-2 shadow-ios">
        <nav
          className="flex min-w-max gap-1"
          aria-label="Bagian konfigurasi website"
        >
          {SITE_SETTINGS_TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                href={`${TAB_PATH}?tab=${tab.id}`}
                onClick={guardTabSwitch}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "bg-surface-2 rounded-full px-3.5 py-2 text-sm font-semibold"
                    : "hover:bg-surface-2 rounded-full px-3.5 py-2 text-sm font-medium"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </Card>

      {activeTab === "identity" && (
        <IdentitySection settings={settings} onDirtyChange={onDirtyChange} />
      )}
      {activeTab === "home" && (
        <HomeSection settings={settings} onDirtyChange={onDirtyChange} />
      )}
      {activeTab === "seo" && (
        <SeoSection settings={settings} onDirtyChange={onDirtyChange} />
      )}
      {activeTab === "contact" && (
        <ContactSection settings={settings} onDirtyChange={onDirtyChange} />
      )}
    </div>
  );
}
