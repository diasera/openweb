import type { Metadata } from "next";
import { PageShell } from "@/components/public/page-shell";
import { UploadForm } from "@/components/public/upload-form";
import { getSettings } from "@/lib/data";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), {
    title: "Unggah Media",
    description: "Form pengiriman foto atau video untuk ditinjau pengelola website.",
    path: "/buat",
    noIndex: true,
  });
}

export default function BuatPage() {
  return (
    <PageShell
      hideTabBar
      header={{
        variant: "sub",
        title: "Buat Pin",
        close: true,
        backHref: "/",
      }}
    >
      <div className="mx-auto max-w-lg">
        <UploadForm />
      </div>
    </PageShell>
  );
}
