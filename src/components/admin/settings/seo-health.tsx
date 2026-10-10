"use client";

import {
  CircleAlert,
  CircleCheck,
  Copy,
  ExternalLink,
  Info,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { hasReadableText } from "@/lib/site-config/client";
import { normalizeVerificationCode } from "@/lib/site-config/external-identifiers";
import type { SiteSettingsRow } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

type CheckState = "ok" | "warn" | "info";

interface HealthCheck {
  state: CheckState;
  title: string;
  detail: string;
}

/** Pemeriksaan murni dari pengaturan tersimpan — tanpa request keluar. */
function healthChecks(settings: SiteSettingsRow, siteUrl: string): HealthCheck[] {
  const description = settings.description?.trim() ?? "";
  const legacyHiddenTitle = Boolean(settings.hero_title?.trim()) && !hasReadableText(settings.hero_title);
  return [
    settings.seo_indexing_enabled
      ? { state: "ok", title: "Mesin pencari diizinkan", detail: "robots.txt mengizinkan seluruh halaman publik." }
      : {
          state: "warn",
          title: "Indexing dimatikan",
          detail: "robots.txt memblokir semua halaman dan sitemap kosong. Nyalakan sakelar di bawah.",
        },
    settings.site_url
      ? siteUrl.startsWith("https://")
        ? { state: "ok", title: "URL utama HTTPS tersimpan", detail: `Canonical, sitemap, dan robots memakai ${siteUrl}.` }
        : { state: "warn", title: "URL utama belum HTTPS", detail: "Google mengutamakan HTTPS; gunakan https://domain-anda." }
      : {
          state: "warn",
          title: "URL utama belum diisi",
          detail: "Tanpa ini canonical memakai URL server yang bisa berbeda dengan domain Search Console.",
        },
    normalizeVerificationCode(settings.google_site_verification)
      ? { state: "ok", title: "Kode verifikasi Google terpasang", detail: "Tag meta google-site-verification ada di <head>." }
      : {
          state: "info",
          title: "Kode verifikasi Google kosong",
          detail: "Tidak masalah bila properti Search Console sudah terverifikasi lewat DNS.",
        },
    description.length >= 70 && description.length <= 160
      ? { state: "ok", title: "Deskripsi beranda ideal", detail: `${description.length} karakter, pas untuk cuplikan Google.` }
      : {
          state: description ? "info" : "warn",
          title: description ? "Panjang deskripsi kurang ideal" : "Deskripsi beranda kosong",
          detail: "Isi 70–160 karakter di tab Identitas agar cuplikan Google tidak terpotong atau dibuat otomatis.",
        },
    legacyHiddenTitle
      ? {
          state: "warn",
          title: "Judul hero berisi simbol",
          detail: "Simpan tab Beranda sekali: judul diganti sakelar “Tampilkan judul”, h1 kembali memakai nama website.",
        }
      : { state: "ok", title: "Judul utama (h1) halaman depan valid", detail: "Google membaca judul yang bermakna." },
    settings.seo_image_url || settings.hero_image_url
      ? { state: "ok", title: "Gambar sosial tersedia", detail: "Dipakai saat tautan dibagikan ke WhatsApp, X, dll." }
      : { state: "info", title: "Gambar sosial otomatis", detail: "Kartu dirender dari judul halaman; unggah gambar untuk tampilan merek." },
  ];
}

const ICONS = {
  ok: <CircleCheck className="text-success size-5" aria-hidden="true" />,
  warn: <CircleAlert className="text-warning size-5" aria-hidden="true" />,
  info: <Info className="text-muted size-5" aria-hidden="true" />,
} satisfies Record<CheckState, React.ReactNode>;

function EndpointRow({ label, url }: { label: string; url: string }) {
  const { toast } = useToast();
  return (
    <div className="bg-surface flex items-center gap-2 rounded-xl border border-border/70 py-1 pl-3 pr-1">
      <div className="min-w-0 flex-1">
        <p className="text-muted text-caption2 font-semibold uppercase tracking-wide">{label}</p>
        <p className="truncate font-mono text-caption1">{url}</p>
      </div>
      <button
        type="button"
        aria-label={`Salin ${label}`}
        title="Salin"
        onClick={() => {
          void navigator.clipboard
            .writeText(url)
            .then(() => toast.success(`${label} disalin`))
            .catch(() => toast.error("Tidak dapat menyalin. Salin manual."));
        }}
        className="text-muted hover:bg-surface-2 hover:text-foreground grid size-9 shrink-0 place-items-center rounded-lg transition-colors"
      >
        <Copy className="size-4" aria-hidden="true" />
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Buka ${label}`}
        title="Buka"
        className="text-muted hover:bg-surface-2 hover:text-foreground grid size-9 shrink-0 place-items-center rounded-lg transition-colors"
      >
        <ExternalLink className="size-4" aria-hidden="true" />
      </a>
    </div>
  );
}

/**
 * Panel kesehatan SEO di tab SEO: daftar periksa dari pengaturan tersimpan,
 * endpoint teknis siap salin, dan langkah Search Console untuk mempercepat
 * pengindeksan (termasuk saat sitemap berstatus "Tidak dapat mengambil").
 */
export function SeoHealth({
  settings,
  siteUrl,
}: {
  settings: SiteSettingsRow;
  siteUrl: string;
}) {
  const checks = healthChecks(settings, siteUrl);
  const passed = checks.filter((check) => check.state === "ok").length;
  const host = (() => {
    try {
      return new URL(siteUrl).host;
    } catch {
      return siteUrl;
    }
  })();

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Kesehatan SEO</p>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-caption1 font-bold tabular-nums",
              passed === checks.length ? "bg-success/12 text-success" : "bg-warning/12 text-warning",
            )}
          >
            {passed}/{checks.length} baik
          </span>
        </div>
        <div className="bg-surface-2 mt-2 h-1.5 overflow-hidden rounded-full" aria-hidden="true">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700",
              passed === checks.length ? "bg-success" : "bg-warning",
            )}
            style={{ width: `${(passed / checks.length) * 100}%` }}
          />
        </div>
        <ul className="mt-3 space-y-2">
          {checks.map((check) => (
            <li key={check.title} className="flex gap-2.5">
              <span className="mt-0.5 shrink-0">{ICONS[check.state]}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{check.title}</span>
                <span className="text-muted block text-caption1 leading-relaxed">{check.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Endpoint otomatis</p>
        <EndpointRow label="Sitemap" url={`${siteUrl}/sitemap.xml`} />
        <EndpointRow label="Robots" url={`${siteUrl}/robots.txt`} />
        <EndpointRow label="Feed RSS" url={`${siteUrl}/feed.xml`} />
      </div>

      <details className="bg-surface-2/60 group rounded-2xl px-4 py-3">
        <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">
          <span className="flex items-center justify-between gap-2">
            Langkah agar halaman cepat terindeks Google
            <span className="text-muted text-caption1 group-open:hidden">Buka</span>
          </span>
        </summary>
        <ol className="text-muted mt-3 list-decimal space-y-2 pl-4 text-caption1 leading-relaxed">
          <li>
            Buka Search Console properti <span className="text-foreground font-mono">{host}</span> →
            Peta Situs. Bila status <em>Tidak dapat mengambil</em>, hapus entri lama lalu kirim ulang
            <span className="text-foreground font-mono"> {siteUrl}/sitemap.xml</span>. Status ini sering
            tersisa dari percobaan pertama walau sitemap sebenarnya sudah dapat dibaca.
          </li>
          <li>
            Pakai Inspeksi URL → <em>Uji URL aktif</em> untuk sitemap dan beranda; pastikan
            “Pengambilan halaman: Berhasil”.
          </li>
          <li>
            Klik <em>Minta pengindeksan</em> untuk beranda, /blog, /galeri, /anggota, dan artikel
            penting. Halaman baru otomatis masuk sitemap saat diterbitkan.
          </li>
          <li>
            Situs baru biasanya butuh beberapa hari sampai beberapa minggu; tautan dari media sosial
            dan situs lain mempercepat penemuan.
          </li>
        </ol>
        <a
          href="https://search.google.com/search-console"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-readable mt-3 inline-flex items-center gap-1 text-caption1 font-semibold"
        >
          Buka Search Console <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </details>
    </div>
  );
}
