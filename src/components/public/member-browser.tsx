"use client";

import { useMemo, useState } from "react";
import { BookOpen, LayoutGrid } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cardClass } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import { MemberCard } from "@/components/public/member-card";
import { useMusic } from "@/components/public/music";
import { StoryShareButton } from "@/components/public/story-share-button";
import { MotionLink, SharedMorph, listReveal } from "@/components/motion";
import { memberProfilePath } from "@/lib/members/slug";
import { toDisplayLabel } from "@/lib/site-config/client";
import type { ContentLabels, MemberRow } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
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
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={`Cari ${labels.memberSingular}, peran, atau ${labels.memberIdentifier.toLocaleLowerCase()}…`}
      />

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-56 flex-1">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { label: "Semua", value: "all" },
              { label: toDisplayLabel(labels.memberCoreGroup), value: "core" },
              { label: toDisplayLabel(labels.memberSingular), value: "regular" },
            ]}
          />
        </div>

        <div
          role="group"
          aria-label="Mode tampilan anggota"
          className="bg-surface-2 inline-flex shrink-0 items-center rounded-full p-1"
        >
          <button
            type="button"
            aria-pressed={viewMode === "directory"}
            onClick={() => setViewMode("directory")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption1 font-semibold transition-colors",
              viewMode === "directory"
                ? "bg-surface text-foreground shadow-2xs"
                : "text-muted hover:text-foreground",
            )}
          >
            <LayoutGrid className="size-3.5" aria-hidden="true" />
            Direktori
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "yearbook"}
            onClick={() => setViewMode("yearbook")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption1 font-semibold transition-colors",
              viewMode === "yearbook"
                ? "bg-surface text-foreground shadow-2xs"
                : "text-muted hover:text-foreground",
            )}
          >
            <BookOpen className="size-3.5" aria-hidden="true" />
            Buku Angkatan
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted py-10 text-center text-sm">
          Tidak ada {labels.memberSingular} yang cocok.
        </p>
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
                  className="liquid-gradient grain relative h-20"
                  aria-hidden="true"
                />
                <div className="flex flex-1 flex-col px-5 pb-4">
                  <div className="-mt-10 flex items-end justify-between gap-3">
                    <MotionLink
                      href={memberProfilePath(member)}
                      className="rounded-full"
                    >
                      <SharedMorph name={`member-${member.slug}`}>
                        <span className="bg-surface inline-block rounded-full p-1">
                          <Avatar
                            name={member.name}
                            src={member.photo_url}
                            size={76}
                            ring={member.is_pengurus}
                          />
                        </span>
                      </SharedMorph>
                    </MotionLink>

                    <StoryShareButton
                      spec={{
                        kind: "member",
                        siteName,
                        name: member.name,
                        role: roleLabel,
                        identifier: member.nim,
                        bio: member.bio,
                        joinedLabel: joined,
                        filename: `kartu-${member.slug ?? member.id.slice(0, 8)}`,
                      }}
                    />
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
