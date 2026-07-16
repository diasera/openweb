import { requireFeature } from "@/lib/auth";
import { getAdmins } from "@/lib/admin/admins";
import { ADMIN_FEATURE_META, ASSIGNABLE_FEATURES } from "@/lib/constants";
import { buildAdminPageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { AdminDialog } from "@/components/admin/admin-dialog";
import { DeleteButton } from "@/components/admin/confirmed-action-button";
import { deleteAdmin } from "./actions";
import type { AdminRow } from "@/lib/types/database";

export const metadata = buildAdminPageMetadata("Admin");

function summarizePerms(a: AdminRow): string {
  const labels = ASSIGNABLE_FEATURES.filter((f) => a.permissions?.[f]).map(
    (feature) => ADMIN_FEATURE_META[feature].label,
  );
  return labels.length ? labels.join(", ") : "tanpa izin";
}

export default async function AdminPage() {
  await requireFeature("admin"); // ownerOnly
  const admins = await getAdmins();

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Owner dapat menambah admin lain dan mengatur izin fiturnya."
        action={<AdminDialog />}
      />

      <div className="space-y-3">
        {admins.map((a) => (
          <Card key={a.id} className="flex items-center gap-3 p-3">
            <Avatar name={a.name} src={a.avatar_url} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{a.name}</p>
                <Chip variant={a.role === "owner" ? "primary" : "soft"}>{a.role}</Chip>
                {!a.is_active && <Chip variant="outline">nonaktif</Chip>}
              </div>
              <p className="text-muted truncate text-xs">
                @{a.username}
                {a.role === "admin" && ` · ${summarizePerms(a)}`}
              </p>
            </div>
            {a.role === "admin" && (
              <>
                <AdminDialog admin={a} />
                <DeleteButton
                  action={deleteAdmin}
                  id={a.id}
                  message={`Hapus admin ${a.name}?`}
                />
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
