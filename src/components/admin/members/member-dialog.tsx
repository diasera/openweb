"use client";

import { saveMember } from "@/app/profil/(admin)/anggota/actions";
import { DEFAULT_CONTENT_LABELS, toDisplayLabel } from "@/lib/site-config/client";
import type { ContentLabels, MemberRow } from "@/lib/types/database";
import { AdminFormDialog } from "../admin-form-dialog";
import { SwitchField, TextAreaField, TextField } from "../form-controls";
import { ImageField } from "../image-field";

/** Dialog admin untuk tambah/edit anggota beserta foto dan profilnya. */
export function MemberDialog({
  member,
  labels = DEFAULT_CONTENT_LABELS,
}: {
  member?: MemberRow;
  labels?: Required<ContentLabels>;
}) {
  const memberLabel = toDisplayLabel(labels.memberSingular);
  return (
    <AdminFormDialog
      mode={member ? "edit" : "create"}
      title={member ? `Edit ${member.name}` : `Tambah ${labels.memberSingular}`}
      createLabel={`Tambah ${labels.memberSingular}`}
      action={saveMember}
      successMessage={member ? `${memberLabel} diperbarui` : `${memberLabel} ditambahkan`}
      requestErrorMessage={`Koneksi terputus saat menyimpan ${labels.memberSingular}. Coba lagi.`}
      hidden={{ id: member?.id ?? "" }}
    >
      <ImageField
        name="photo"
        label="Foto profil"
        initialUrl={member?.photo_url}
        profile="member-avatar"
        removable
        hint="Tanpa foto, avatar memakai inisial berwarna."
      />
      <TextField
        label="Nama"
        id="m-name"
        name="name"
        defaultValue={member?.name}
        required
        maxLength={80}
        hint="URL profil dibentuk dari nama; URL lama tetap dialihkan bila nama diganti."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={labels.memberIdentifier}
          id="m-nim"
          name="nim"
          defaultValue={member?.nim ?? ""}
          maxLength={30}
        />
        <TextField
          label="Jabatan (opsional)"
          id="m-pos"
          name="position"
          defaultValue={member?.position ?? ""}
          maxLength={40}
          placeholder="mis. Sekretaris"
        />
      </div>
      <TextAreaField
        label="Bio (opsional)"
        id="m-bio"
        name="bio"
        rows={2}
        maxLength={400}
        defaultValue={member?.bio ?? ""}
        hint="Juga dipakai sebagai deskripsi hasil pencarian profil."
      />
      <SwitchField
        name="is_pengurus"
        title={`Tampilkan sebagai ${labels.memberCoreGroup.toLocaleLowerCase()}`}
        description="Avatar mendapat cincin gradien dan tampil di halaman Tentang."
        defaultChecked={member?.is_pengurus ?? false}
      />
      <TextField
        label="Urutan tampil"
        id="m-sort"
        name="sort_order"
        type="number"
        min={0}
        defaultValue={member?.sort_order ?? 0}
        hint="Angka kecil tampil lebih dulu."
      />
    </AdminFormDialog>
  );
}
