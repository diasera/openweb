import type { Metadata } from "next";
import { getPublicMessages, getSettings } from "@/lib/data";
import { MessageBoard } from "@/components/public/message-board";
import { PageShell } from "@/components/public/page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";

export const revalidate = 30;
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.pesan);
}

export default async function PesanPage() {
  const [settings, messages] = await Promise.all([
    getSettings(),
    getPublicMessages({ limit: 100 }),
  ]);

  return (
    <PageShell
      header={{ variant: "sub", title: "Pesan Anonim", backHref: "/" }}
    >
      <JsonLd
        data={breadcrumbStructuredData(settings, [
          { name: "Beranda", path: "/" },
          { name: "Pesan Anonim", path: "/pesan" },
        ])}
      />
      <MessageBoard messages={messages} />
    </PageShell>
  );
}
