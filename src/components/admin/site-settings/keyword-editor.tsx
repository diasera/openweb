"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  normalizeStringList,
  SITE_CONFIG_LIMITS,
} from "@/lib/site-config/client";

export function KeywordEditor({ initialValue }: { initialValue: string[] | null }) {
  const [keywords, setKeywords] = useState(() =>
    normalizeStringList(initialValue ?? [], SITE_CONFIG_LIMITS.keywords),
  );
  const [draft, setDraft] = useState("");
  const submittedKeywords = normalizeStringList(
    [...keywords, ...draft.split(/[,;\n]/)],
    SITE_CONFIG_LIMITS.keywords,
  );

  function addDraft() {
    const next = normalizeStringList(
      [...keywords, ...draft.split(/[,;\n]/)],
      SITE_CONFIG_LIMITS.keywords,
    );
    setKeywords(next);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="keywords" value={JSON.stringify(submittedKeywords)} />
      <div className="flex gap-2">
        <Input
          value={draft}
          maxLength={SITE_CONFIG_LIMITS.keywordLength}
          placeholder="Contoh: organisasi pelajar di Bandung"
          aria-label="Tambahkan frasa pencarian"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addDraft();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!draft.trim() || keywords.length >= SITE_CONFIG_LIMITS.keywords}
          onClick={addDraft}
        >
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>
      {keywords.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Daftar frasa pencarian">
          {keywords.map((keyword) => (
            <span
              key={keyword.toLocaleLowerCase()}
              className="bg-surface-2 border-border inline-flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-1 text-xs"
            >
              {keyword}
              <button
                type="button"
                aria-label={`Hapus ${keyword}`}
                className="hover:bg-border grid h-6 w-6 place-items-center rounded-full"
                onClick={() => setKeywords((items) => items.filter((item) => item !== keyword))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-muted text-xs">Belum ada frasa pencarian.</p>
      )}
      <div className="text-muted flex justify-between gap-4 text-xs">
        <span>Gunakan frasa spesifik yang benar-benar dibahas dalam konten.</span>
        <span className="shrink-0 tabular-nums">
          {keywords.length}/{SITE_CONFIG_LIMITS.keywords}
        </span>
      </div>
    </div>
  );
}
