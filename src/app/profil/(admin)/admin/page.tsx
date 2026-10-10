import { requireFeature } from "@/lib/auth";
import { getAdmins } from "@/lib/admin/admins";
import { ASSIGNABLE_FEATURES } from "@/lib/constants";
import { buildAdminPageMetadata } from "@/lib/seo";
import type { AdminAccount } from "@/lib/types/database";
import { Avatar } from "@/components/ui/avatar";
import { RelativeTime } from "@/components/ui/relative-time";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminList, AdminRow, StatusBadge } from "@/components/admin/admin-list";
import { DeleteAction } from "@/components/admin/admin-actions";
import { AdminUserDialog } from "@/components/admin/accounts/admin-user-dialog";
import { adminFeatureLabel } from "@/components/admin/features";
import { deleteAdmin } from "./actions";

export const metadata = buildAdminPageMetadata("Admin");

function permissionSummary(admin: AdminAccount): string {
  const labels = ASSIGNABLE_FEATURES.filter((feature) => admin.permissions?.[feature]).map(
    adminFeatureLabel,
  );
  return labels.length ? labels.join(", ") : "Belum ada izin";
}

export default async function AdminAccountsPage() {
  await requireFeature("admin"); // ownerOnly
  const admins = await getAdmins();

  return (
    <AdminPage
      feature="admin"
      title="Admin"
      description="Tambah pengelola dan atur menu apa saja yang boleh mereka buka."
      actions={<AdminUserDialog />}
      width="wide"
    >
      <AdminList label="Akun pengelola">
        {admins.map((admin, index) => (
          <AdminRow
            key={admin.id}
            index={index}
            leading={<Avatar name={admin.name} src={admin.avatar_url} size={44} ring={admin.role === "owner"} />}
            title={admin.name}
            badges={
              <>
                <StatusBadge tone={admin.role === "owner" ? "primary" : "neutral"}>
                  {admin.role === "owner" ? "Owner" : "Admin"}
                </StatusBadge>
                {!admin.is_active && <StatusBadge tone="outline">Nonaktif</StatusBadge>}
              </>
            }
            meta={
              <>
                @{admin.username}
                {admin.role === "admin" && ` · ${permissionSummary(admin)}`}
                {admin.last_login_at && (
                  <>
                    {" · masuk "}
                    <RelativeTime iso={admin.last_login_at} />
                  </>
                )}
              </>
            }
            actions={
              admin.role === "admin" ? (
                <>
                  <AdminUserDialog admin={admin} />
                  <DeleteAction
                    action={deleteAdmin}
                    id={admin.id}
                    title={`Hapus admin ${admin.name}?`}
                    message="Akun dan seluruh sesinya langsung dicabut."
                    successMessage="Admin dihapus"
                  />
                </>
              ) : undefined
            }
          />
        ))}
      </AdminList>
    </AdminPage>
  );
}
