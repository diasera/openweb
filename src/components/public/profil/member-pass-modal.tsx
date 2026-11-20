"use client";

import { useState, type ReactNode } from "react";
import { IdCard, QrCode, RotateCw, ShieldCheck, ZoomIn } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { MediaLightbox } from "@/components/ui/media-lightbox";
import { Modal } from "@/components/ui/modal";
import { QrCodeSvg } from "@/components/ui/qr-code";
import { StoryShareButton } from "@/components/public/story-share-button";
import { memberProfilePath } from "@/lib/members/slug";
import type { MemberRow } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { formatSiteDate } from "@/lib/utils/time";

export interface MemberPassData {
  member: MemberRow;
  siteName: string;
  roleLabel: string | null;
  identifierLabel?: string;
  profileUrl?: string;
  mediaCount?: number;
  blogCount?: number;
}

function resolveProfileUrl(member: MemberRow, explicitUrl?: string): string {
  if (explicitUrl) return explicitUrl;
  const path = memberProfilePath(member);
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}

function formatHostPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Modal Kartu Anggota Digital Holografik 3D: dua sisi (identitas + QR offline)
 * dengan efek kilau pelangi berbasis `--depth-px/--depth-py`, salin tautan, dan
 * ekspor Kartu Story 9:16 lengkap dengan foto profil serta QR Code.
 */
export function MemberPassModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: MemberPassData;
}) {
  const [flipped, setFlipped] = useState(false);
  const { member, siteName, roleLabel, mediaCount, blogCount } = data;
  const profileUrl = resolveProfileUrl(member, data.profileUrl);
  const joinedLabel = member.created_at
    ? `Bergabung ${formatSiteDate(member.created_at, "monthYear")}`
    : null;

  function handleClose() {
    setFlipped(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Kartu ID Digital">
      <div className="space-y-4">
        <div className="holo-card-scene mx-auto w-full max-w-[21rem]">
          <div
            data-depth-tilt
            onClick={() => setFlipped((prev) => !prev)}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={
              flipped
                ? "Tampilkan sisi depan Kartu ID Digital"
                : "Balik Kartu ID Digital untuk menampilkan kode QR"
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setFlipped((prev) => !prev);
              }
            }}
            className="holo-card-inner cursor-pointer rounded-[1.75rem] outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-flipped={flipped}
          >
            {/* Sisi Depan: Kartu Identitas Holografik */}
            <div className="holo-card-face liquid-gradient grain relative overflow-hidden rounded-[1.75rem] border border-white/25 p-5 text-white shadow-xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-linear-to-br from-black/25 via-black/35 to-black/60"
              />
              <div className="holo-foil" aria-hidden="true" />

              <div className="relative z-10 flex min-h-[22rem] flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[0.65rem] font-bold tracking-[0.2em] uppercase text-white/75">
                      {siteName}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[0.68rem] font-medium text-white/65">
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      Kartu Anggota Resmi
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold tracking-wider uppercase backdrop-blur-md">
                    {member.is_pengurus ? "INTI" : "ID"}
                  </span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <span className="rounded-full bg-white/15 p-1 ring-1 ring-white/30 backdrop-blur-md">
                    <Avatar
                      name={member.name}
                      src={member.photo_url}
                      size={88}
                      ring={member.is_pengurus}
                    />
                  </span>
                  <h3 className="font-display mt-3 text-xl font-bold leading-tight tracking-tight text-white">
                    {member.name}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                    {roleLabel && (
                      <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-caption2 font-semibold text-white backdrop-blur-md">
                        {roleLabel}
                      </span>
                    )}
                    {member.nim && (
                      <span className="rounded-full border border-white/25 bg-black/25 px-2.5 py-0.5 font-mono text-caption2 text-white/90">
                        {member.nim}
                      </span>
                    )}
                  </div>
                  {member.bio && (
                    <p className="mt-2.5 line-clamp-2 max-w-[16rem] text-xs leading-relaxed text-white/80">
                      “{member.bio}”
                    </p>
                  )}
                </div>

                <div className="border-t border-white/18 pt-3">
                  <div className="flex items-center justify-between gap-2 text-[0.7rem] text-white/80">
                    <span className="truncate font-medium">
                      {joinedLabel ?? "Anggota Aktif"}
                    </span>
                    {typeof mediaCount === "number" &&
                    typeof blogCount === "number" ? (
                      <span className="shrink-0 font-mono text-[0.68rem] text-white/75">
                        {mediaCount} media · {blogCount} artikel
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-white/90">
                        <QrCode className="size-3.5" aria-hidden="true" />
                        Ketuk QR
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sisi Belakang: QR Code Offline */}
            <div className="holo-card-face holo-card-face-back bg-surface border-border relative flex flex-col items-center justify-between overflow-hidden rounded-[1.75rem] border p-5 text-center shadow-xl">
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-muted truncate text-[0.65rem] font-bold tracking-[0.18em] uppercase">
                  {siteName}
                </span>
                <span className="bg-primary/12 text-primary-readable rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold">
                  QR Offline
                </span>
              </div>

              <div className="flex flex-col items-center gap-2.5">
                <div className="border-border rounded-2xl border bg-white p-2 shadow-sm">
                  <QrCodeSvg
                    value={profileUrl}
                    label={`Kode QR profil ${member.name}`}
                    size={168}
                    className="p-0"
                  />
                </div>
                <div>
                  <p className="font-display text-sm font-bold">{member.name}</p>
                  <p className="text-muted mt-0.5 max-w-[16rem] truncate font-mono text-[0.68rem]">
                    {formatHostPath(profileUrl)}
                  </p>
                </div>
              </div>

              <p className="text-muted text-[0.7rem]">
                Pindai dengan kamera ponsel untuk membuka profil lengkap
              </p>
            </div>
          </div>
        </div>

        <p className="text-muted text-center text-caption1">
          Ketuk kartu atau tombol di bawah untuk membalik sisi depan &amp; kode QR.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setFlipped((prev) => !prev)}
            className={buttonClass({ variant: "outline", size: "sm" })}
          >
            <RotateCw className="size-3.5" aria-hidden="true" />
            {flipped ? "Lihat Depan" : "Tampilkan QR"}
          </button>

          <CopyButton
            value={profileUrl}
            label="Salin Tautan"
            successMessage="Tautan profil disalin"
            showLabel
            className="h-9 rounded-full px-3.5 text-xs"
          />

          <StoryShareButton
            variant="outlineSm"
            label="Kartu Story"
            spec={{
              kind: "member",
              siteName,
              name: member.name,
              role: roleLabel,
              identifier: member.nim,
              bio: member.bio,
              joinedLabel,
              photoUrl: member.photo_url,
              qrUrl: profileUrl,
              filename: `kartu-${member.slug ?? member.id.slice(0, 8)}`,
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

/** Tombol pemicu Kartu ID Digital yang dipakai di MemberHero & Buku Angkatan. */
export function MemberPassButton({
  data,
  variant = "pill",
  className,
}: {
  data: MemberPassData;
  variant?: "pill" | "subtle";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          variant === "pill"
            ? buttonClass({ variant: "outline", size: "sm" })
            : "motion-pressable text-muted hover:text-foreground inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption2 font-semibold transition-colors",
          className,
        )}
      >
        <IdCard
          className={variant === "pill" ? "size-4" : "size-3.5"}
          aria-hidden="true"
        />
        <span>Kartu ID</span>
      </button>

      {open && (
        <MemberPassModal open={open} onClose={() => setOpen(false)} data={data} />
      )}
    </>
  );
}

/** Pembungkus avatar profil agar bisa diketuk untuk melihat foto layar penuh. */
export function MemberAvatarZoom({
  name,
  photoUrl,
  children,
}: {
  name: string;
  photoUrl: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!photoUrl) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Perbesar foto profil ${name}`}
        className="group relative cursor-zoom-in rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {children}
        <span
          aria-hidden="true"
          className="bg-surface/90 border-border text-foreground absolute bottom-1 right-1 grid size-7 place-items-center rounded-full border opacity-0 shadow-sm backdrop-blur-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <ZoomIn className="size-3.5" />
        </span>
      </button>

      <MediaLightbox
        open={open}
        onClose={() => setOpen(false)}
        label={`Foto profil ${name}`}
        slides={[
          {
            id: `avatar-${name}`,
            type: "photo",
            url: photoUrl,
            mime_type: null,
            width: null,
            height: null,
          },
        ]}
      />
    </>
  );
}
