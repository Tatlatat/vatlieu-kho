export type AppRole = "OWNER" | "STAFF";
export type LegacyRole = "ADMIN" | "MANAGER" | "KEEPER";
export type AnyRole = AppRole | LegacyRole | string | null | undefined;

export function normalizeAppRole(role: AnyRole): AppRole {
  if (role === "OWNER" || role === "ADMIN") return "OWNER";
  return "STAFF";
}

export function hasOwnerAccess(role: AnyRole): boolean {
  return normalizeAppRole(role) === "OWNER";
}
