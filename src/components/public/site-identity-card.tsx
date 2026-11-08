import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { SiteLogo } from "./site-logo";

/**
 * Kartu identitas website untuk Profil dan Tentang: banner mesh dari warna
 * tema, logo mengambang di tepinya, lalu nama sebagai h1. Isi di bawah nama
 * (subjudul, statistik, deskripsi) diberikan pemanggil.
 */
export function SiteIdentityCard({
  name,
  logoUrl,
  logoSize = 72,
  children,
}: {
  name: string;
  logoUrl?: string | null;
  logoSize?: number;
  children?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden text-center">
      <div className="liquid-gradient grain relative h-24" aria-hidden="true" />
      <div className="relative -mt-11 flex justify-center">
        <span className="bg-surface shadow-elevated rounded-full p-1">
          <SiteLogo name={name} url={logoUrl} size={logoSize} />
        </span>
      </div>
      <div className="px-5 pb-5 pt-2">
        <h1 className="font-display text-title2 font-bold tracking-tight">{name}</h1>
        {children}
      </div>
    </Card>
  );
}
