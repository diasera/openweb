"use client";

import { useState } from "react";
import { AdminDialogTrigger } from "@/components/admin/admin-dialog-trigger";
import { ImageField } from "@/components/admin/image-field";
import { useAdminFormAction } from "@/components/admin/use-admin-form-action";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { saveMember } from "@/app/profil/(admin)/anggota/actions";
import {
  DEFAULT_CONTENT_LABELS,
  toDisplayLabel,
} from "@/lib/site-config/client";
import type { ContentLabels, MemberRow } from "@/lib/types/database";

/** Dialog admin untuk tambah/edit anggota beserta foto dan profilnya. */
export function MemberDialog({
  member,
  labels = DEFAULT_CONTENT_LABELS,
}: {
  member?: MemberRow;
  labels?: Required<ContentLabels>;
}) {
  const [open, setOpen] = useState(false);
  const memberLabel = toDisplayLabel(labels.memberSingular);
  const { onSubmit, pending } = useAdminFormAction({
    action: saveMember,
    successMessage: member
      ? `${memberLabel} diperbarui`
      : `${memberLabel} ditambahkan`,
    requestErrorMessage: `Koneksi terputus saat menyimpan ${labels.memberSingular}. Coba lagi.`,
    onSuccess: () => setOpen(false),
  });

  return (
    <>
      <AdminDialogTrigger
        editing={Boolean(member)}
        createLabel={<>Tambah {labels.memberSingular}</>}
        onClick={() => setOpen(true)}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={member ? `Edit ${memberLabel}` : `Tambah ${memberLabel}`}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {member && <input type="hidden" name="id" value={member.id} />}

          <ImageField
            name="photo"
            label="Foto profil"
            initialUrl={member?.photo_url}
            profile="member-avatar"
          />

          <Field label="Nama" htmlFor="m-name">
            <Input id="m-name" name="name" defaultValue={member?.name} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={labels.memberIdentifier} htmlFor="m-nim">
              <Input id="m-nim" name="nim" defaultValue={member?.nim ?? ""} />
            </Field>
            <Field label="Jabatan" htmlFor="m-pos">
              <Input
                id="m-pos"
                name="position"
                defaultValue={member?.position ?? ""}
                placeholder="opsional"
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_pengurus"
              defaultChecked={member?.is_pengurus ?? false}
              className="accent-primary h-4 w-4"
            />
            Tampilkan sebagai {labels.memberCoreGroup.toLocaleLowerCase()}
          </label>
          <Field label="Bio (opsional)" htmlFor="m-bio">
            <Input id="m-bio" name="bio" defaultValue={member?.bio ?? ""} />
          </Field>
          <Field label="Urutan tampil" htmlFor="m-sort">
            <Input
              id="m-sort"
              name="sort_order"
              type="number"
              min={0}
              defaultValue={member?.sort_order ?? 0}
            />
          </Field>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
