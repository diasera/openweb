import {
  ADMIN_FEATURES,
  ADMIN_FEATURE_META,
  type AdminFeature,
} from "@/lib/constants";
import type { AdminRole, FeaturePermissions } from "@/lib/types/database";

/**
 * Inti model izin (pure, tanpa side-effect) — dipakai ulang oleh menu sidebar,
 * guard route, dan editor izin admin. Owner selalu penuh; fitur ownerOnly
 * (Admin & Setting) hanya untuk owner.
 */
export interface Principal {
  role: AdminRole;
  permissions: FeaturePermissions;
}

export function canAccess(
  principal: Principal,
  feature: AdminFeature,
): boolean {
  if (ADMIN_FEATURE_META[feature].ownerOnly) return principal.role === "owner";
  if (principal.role === "owner") return true;
  return principal.permissions?.[feature] === true;
}

export function allowedFeatures(principal: Principal): AdminFeature[] {
  return ADMIN_FEATURES.filter((feature) => canAccess(principal, feature));
}
