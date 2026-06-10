import { KNOWN_PERMISSION_CODES, POSITION_PRESETS, type PositionCode } from "@/lib/permissions/catalog";
import { normalizePermissionCodes } from "@/lib/permissions/effective";

export interface ParsedPermissionUpdateForm {
  targetUserId: string;
  positionCodes: PositionCode[];
  allowCodes: string[];
  denyCodes: string[];
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formStrings(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

export function parsePermissionUpdateForm(formData: FormData): ParsedPermissionUpdateForm {
  const targetUserId = formString(formData, "targetUserId");
  if (!targetUserId) throw new Error("Thiếu người dùng");

  const positionCodes = Array.from(
    new Set(
      formStrings(formData, "positionCodes").filter((code): code is PositionCode => code in POSITION_PRESETS)
    )
  ).sort();
  const denyCodes = normalizePermissionCodes(formStrings(formData, "denyCodes"));
  const allowCodes = normalizePermissionCodes(formStrings(formData, "allowCodes")).filter(
    (code) => KNOWN_PERMISSION_CODES.has(code) && !denyCodes.includes(code)
  );

  return {
    targetUserId,
    positionCodes,
    allowCodes,
    denyCodes,
  };
}
