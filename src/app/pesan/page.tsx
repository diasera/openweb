import type { Metadata } from "next";
import { getPublicMessages, getSettings } from "@/lib/data";
import { MessageBoard } from "@/components/public/message-board";
import { PageShell } from "@/components/public/page-shell";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";

export const revalidate = 30;
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.pesan);
}

export default async function PesanPage() {
  const messages = await getPublicMessages({ limit: 100 });

  return (
    <PageShell
      header={{ variant: "sub", title: "Pesan Anonim", backHref: "/" }}
    >
      <MessageBoard messages={messages} />
    </PageShell>
  );
}
