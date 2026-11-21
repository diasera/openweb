"use client";

import { useMemo, useState } from "react";
import { BookOpen, LayoutGrid, UsersRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cardClass } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import { BrowserToolbar } from "@/components/public/browser-toolbar";
import { MemberCard } from "@/components/public/member-card";
import { useMusic } from "@/components/public/music";
import { MemberPassButton } from "@/components/public/profil/member-pass-modal";
import { StoryShareButton } from "@/components/public/story-share-button";
import { MotionLink, SharedMorph, listReveal } from "@/components/motion";
import { memberProfilePath } from "@/lib/members/slug";
import { toDisplayLabel } from "@/lib/site-config/client";
import type { ContentLabels, MemberRow } from "@/lib/types/database";
import { gradientCss } from "@/lib/utils/color";
import { formatSiteDate } from "@/lib/utils/time";

type MemberFilter = "all" | "core" | "regular";
type MemberViewMode = "directory" | "yearbook";
type DirectoryLabels = Required<ContentLabels>;

/**
 * Direktori anggota reusable dengan istilah dari Setting, dilengkapi sakelar
 * tampilan **Direktori** (grid padat) dan **Buku Angkatan** (*Yearbook*
 * editorial beserta kutipan bio & tombol Kartu Story 9:16).
 */
export function MemberBrowser({
  members,
  labels,
}: {
  members: MemberRow[];
  labels: DirectoryLabels;
}) {
  const { siteName } = useMusic();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [viewMode, setViewMode] = useState<MemberViewMode>("directory");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return members.filter((member) => {
      if (filter === "core" && !member.is_pengurus) return false;
      if (filter === "regular" && member.is_pengurus) return false;
      return (
        !normalizedQuery ||
        `${member.name} ${member.nim ?? ""} ${member.position ?? ""} ${member.bio ?? ""}`
          .toLocaleLowerCase()
          .includes(normalizedQuery)
      );
    });
  }, [filter, members, query]);

  return (
    <div className="space-y-4">
      <BrowserToolbar
        search={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={`Cari ${labels.memberSingular}, peran, atau ${labels.memberIdentifier.toLocaleLowerCase()}…`}
          />
        }
        primaryControl={
          <Segmented
            size="sm"
            ariaLabel="Mode tampilan anggota"
            value={viewMode}
            onChange={setViewMode}
            options={[
              {
                value: "directory",
                label: "Direktori",
                icon: <LayoutGrid className="size-3.5" aria-hidden="true" />,
              },
              {
                value: "yearbook",
                label: "Buku Angkatan",
                icon: <BookOpen className="size-3.5" aria-hidden="true" />,
              },
            ]}
          />
        }
        secondary={
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { label: "Semua", value: "all" },
              { label: toDisplayLabel(labels.memberCoreGroup), value: "core" },
              { label: toDisplayLabel(labels.memberSingular), value: "regular" },
            ]}
          />
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          compact
          icon={<UsersRound className="h-7 w-7" />}
          title={`Tidak ada ${labels.memberSingular} yang cocok`}
          description="Coba ubah kata kunci pencarian atau pilih filter peran lainnya."
        />
      ) : viewMode === "directory" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((member, index) => (
            <div key={member.id} {...listReveal(index)}>
              <MemberCard member={member} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((member, index) => {
            const roleLabel =
              member.position ||
              (member.is_pengurus ? toDisplayLabel(labels.memberCoreGroup) : null);
            const joined = member.created_at
              ? `Bergabung ${formatSiteDate(member.created_at, "monthYear")}`
              : null;

            return (
              <article
                key={member.id}
                {...listReveal(index)}
                className={cardClass(
                  "elevated",
                  "flex flex-col overflow-hidden rounded-3xl",
                )}
              >
                <div
                  className={
                    member.is_pengurus
                      ? "liquid-gradient grain relative h-20"
                      : "grain relative h-20"
                  }
                  style={
                    member.is_pengurus
                      ? undefined
                      : { background: gradientCss(member.id) }
                  }
                  aria-hidden="true"
                />
                <div className="flex flex-1 flex-col px-5 pb-4">
                  <div className="-mt-10 flex items-end justify-between gap-3">
                    <MotionLink
                      href={memberProfilePath(member)}
                      className="rounded-full"
                    >
                      <SharedMorph name={`member-${member.slug}`}>
                        <span className="bg-surface inline-block rounded-full p-1 [--avatar-gap:rgb(var(--surface))]">
                          <Avatar
                            name={member.name}
                            src={member.photo_url}
                            size={76}
                            ring={member.is_pengurus}
                          />
                        </span>
                      </SharedMorph>
                    </MotionLink>

                    <div className="flex items-center gap-0.5">
                      <MemberPassButton
                        variant="subtle"
                        data={{
                          member,
                          siteName,
                          roleLabel,
                          identifierLabel: labels.memberIdentifier,
                        }}
                      />
                      <StoryShareButton
                        spec={{
                          kind: "member",
                          siteName,
                          name: member.name,
                          role: roleLabel,
                          identifier: member.nim,
                          bio: member.bio,
                          joinedLabel: joined,
                          photoUrl: member.photo_url,
                          qrUrl: memberProfilePath(member),
                          filename: `kartu-${member.slug ?? member.id.slice(0, 8)}`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <MotionLink
                      href={memberProfilePath(member)}
                      className="hover:text-primary-readable font-display text-lg font-bold leading-snug transition-colors"
                    >
                      {member.name}
                    </MotionLink>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {roleLabel && (
                        <Chip variant={member.is_pengurus ? "softPrimary" : "soft"}>
                          {roleLabel}
                        </Chip>
                      )}
                      {member.nim && (
                        <span className="text-muted border-border rounded-full border px-2.5 py-0.5 font-mono text-caption2">
                          {member.nim}
                        </span>
                      )}
                    </div>
                  </div>

                  <blockquote className="text-muted border-primary/30 mt-3 flex-1 border-l-2 pl-3 text-footnote italic leading-relaxed">
                    “
                    {member.bio?.trim() ||
                      `Bagian dari perjalanan bersama ${siteName}.`}
                    ”
                  </blockquote>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
