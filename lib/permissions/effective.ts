import { KNOWN_PERMISSION_CODES } from "@/lib/permissions/catalog";

export interface EffectivePermissionInput {
  isOwner: boolean;
  positionPermissionCodes: string[];
  allowOverrideCodes: string[];
  denyOverrideCodes: string[];
}

export interface PermissionAccessSnapshot {
  isOwner: boolean;
  effectivePermissionCodes: string[];
}

export function normalizePermissionCodes(codes: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(codes).filter((code) => KNOWN_PERMISSION_CODES.has(code)))).sort();
}

export function calculateEffectivePermissionCodes(input: EffectivePermissionInput): string[] {
  if (input.isOwner) return normalizePermissionCodes(KNOWN_PERMISSION_CODES);

  const denied = new Set(normalizePermissionCodes(input.denyOverrideCodes));
  const allowed = normalizePermissionCodes([
    ...input.positionPermissionCodes,
    ...input.allowOverrideCodes,
  ]).filter((code) => !denied.has(code));

  return normalizePermissionCodes(allowed);
}

export function canAccessPermission(snapshot: PermissionAccessSnapshot, code: string): boolean {
  if (!KNOWN_PERMISSION_CODES.has(code)) return false;
  if (snapshot.isOwner) return true;
  return snapshot.effectivePermissionCodes.includes(code);
}
