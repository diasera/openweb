"use client";

import { useMemo, useState } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import { MemberCard } from "@/components/public/member-card";
import { toDisplayLabel } from "@/lib/site-config/client";
import type { ContentLabels, MemberRow } from "@/lib/types/database";

type MemberFilter = "all" | "core" | "regular";
type DirectoryLabels = Required<ContentLabels>;

/** Direktori anggota reusable dengan istilah yang seluruhnya berasal dari Setting. */
export function MemberBrowser({
  members,
  labels,
}: {
  members: MemberRow[];
  labels: DirectoryLabels;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return members.filter((member) => {
      if (filter === "core" && !member.is_pengurus) return false;
      if (filter === "regular" && member.is_pengurus) return false;
      return (
        !normalizedQuery ||
        `${member.name} ${member.nim ?? ""}`
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
        placeholder={`Cari ${labels.memberSingular} atau ${labels.memberIdentifier.toLocaleLowerCase()}…`}
      />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { label: "Semua", value: "all" },
          { label: toDisplayLabel(labels.memberCoreGroup), value: "core" },
          { label: toDisplayLabel(labels.memberSingular), value: "regular" },
        ]}
      />
      {filtered.length === 0 ? (
        <p className="text-muted py-10 text-center text-sm">
          Tidak ada {labels.memberSingular} yang cocok.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
