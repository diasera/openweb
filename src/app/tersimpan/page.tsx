import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import { buildPageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/public/page-shell";
import { SavedBrowser } from "@/components/public/saved-browser";
import { PageHeader } from "@/components/ui/page-header";

const SAVED_DESCRIPTION =
  "Koleksi pin dan artikel yang kamu simpan di perangkat ini.";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), {
    title: "Tersimpan",
    description: SAVED_DESCRIPTION,
    path: "/tersimpan",
    noIndex: true,
  });
}

export default function SavedPage() {
  return (
    <PageShell header={{ variant: "sub", title: "Tersimpan", backHref: "/profil" }}>
      <PageHeader size="large" title="Tersimpan" description={SAVED_DESCRIPTION} />
      <SavedBrowser />
    </PageShell>
  );
}
