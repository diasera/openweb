import { Users } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import { getMembers, getSettings } from "@/lib/data";
import { buildAdminPageMetadata } from "@/lib/seo";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberDialog } from "@/components/admin/member-dialog";
import { DeleteButton } from "@/components/admin/confirmed-action-button";
import { deleteMember } from "./actions";

export const metadata = buildAdminPageMetadata("Anggota");

export default async function AnggotaPage() {
  await requireFeature("anggota");
  const [members, settings] = await Promise.all([getMembers(), getSettings()]);
  const labels = getContentLabels(settings);
  const memberLabel = toDisplayLabel(labels.memberPlural, settings.locale);

  return (
    <div>
      <PageHeader
        title={memberLabel}
        description={`Kelola foto, nama, ${labels.memberIdentifier.toLocaleLowerCase()}, dan peran ${labels.memberPlural}.`}
        action={<MemberDialog labels={labels} />}
      />

      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={`Belum ada ${labels.memberSingular}`}
          description={`Tambahkan ${labels.memberSingular} agar dapat ditampilkan di website.`}
          action={<MemberDialog labels={labels} />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Card key={m.id} className="flex items-center gap-3 p-3">
              <Avatar name={m.name} src={m.photo_url} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.name}</p>
                <p className="text-muted truncate text-xs">
                  {[m.position, m.nim].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <MemberDialog member={m} labels={labels} />
              <DeleteButton
                action={deleteMember}
                id={m.id}
                message={`Hapus ${m.name}?`}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
