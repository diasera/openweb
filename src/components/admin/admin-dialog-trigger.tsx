"use client";

import type { ReactNode } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Trigger bersama dialog create/edit tanpa menggandakan semantik tombolnya. */
export function AdminDialogTrigger({
  editing,
  createLabel,
  onClick,
}: {
  editing: boolean;
  createLabel: ReactNode;
  onClick: () => void;
}) {
  if (editing) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Edit"
        title="Edit"
        className="text-muted hover:bg-surface-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg"
      >
        <Pencil className="h-[18px] w-[18px]" />
      </button>
    );
  }

  return (
    <Button onClick={onClick}>
      <Plus className="h-4 w-4" /> {createLabel}
    </Button>
  );
}
