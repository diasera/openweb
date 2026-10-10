import { ExternalLink, Users } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import { getMembers, getSettings } from "@/lib/data";
import { memberProfilePath } from "@/lib/members/slug";
import { buildAdminPageMetadata } from "@/lib/seo";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminList, AdminRow, StatusBadge } from "@/components/admin/admin-list";
import { DeleteAction, IconLink } from "@/components/admin/admin-actions";
import { MemberDialog } from "@/components/admin/members/member-dialog";
import { deleteMember } from "./actions";

export const metadata = buildAdminPageMetadata("Anggota");

export default async function AnggotaPage() {
  await requireFeature("anggota");
  const [members, settings] = await Promise.all([getMembers(), getSettings()]);
  const labels = getContentLabels(settings);
  const memberLabel = toDisplayLabel(labels.memberPlural, settings.locale);
  const coreLabel = toDisplayLabel(labels.memberCoreGroup, settings.locale);

  return (
    <AdminPage
      feature="anggota"
      title={memberLabel}
      description={`Kelola foto, nama, ${labels.memberIdentifier.toLocaleLowerCase()}, dan peran ${labels.memberPlural} — ${members.length} orang.`}
      actions={<MemberDialog labels={labels} />}
      width="wide"
    >
      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="size-8" />}
          title={`Belum ada ${labels.memberSingular}`}
          description={`Tambahkan ${labels.memberSingular} agar tampil di beranda dan direktori.`}
          action={<MemberDialog labels={labels} />}
        />
      ) : (
        <AdminList label={memberLabel}>
          {members.map((member, index) => (
            <AdminRow
              key={member.id}
              index={index}
              leading={
                <Avatar
                  name={member.name}
                  src={member.photo_url}
                  size={44}
                  ring={member.is_pengurus}
                  reserveRingSpace
                />
              }
              title={member.name}
              badges={
                <>
                  {member.position && (
                    <StatusBadge tone={member.is_pengurus ? "primary" : "neutral"}>
                      {member.position}
                    </StatusBadge>
                  )}
                  {member.is_pengurus && !member.position && (
                    <StatusBadge tone="primary">{coreLabel}</StatusBadge>
                  )}
                </>
              }
              meta={
                <>
                  {member.nim ? <span className="font-mono">{member.nim}</span> : "Tanpa nomor"}
                  {` · ${memberProfilePath(member)}`}
                </>
              }
              actions={
                <>
                  <IconLink
                    href={memberProfilePath(member)}
                    target="_blank"
                    label="Buka profil publik"
                    icon={ExternalLink}
                  />
                  <MemberDialog member={member} labels={labels} />
                  <DeleteAction
                    action={deleteMember}
                    id={member.id}
                    title={`Hapus ${member.name}?`}
                    message="Profil publik dan fotonya ikut dihapus."
                    successMessage={`${toDisplayLabel(labels.memberSingular)} dihapus`}
                  />
                </>
              }
            />
          ))}
        </AdminList>
      )}
    </AdminPage>
  );
}
