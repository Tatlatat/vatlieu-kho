export type NavIconKey =
  | "home"
  | "stocktake"
  | "transfer"
  | "history"
  | "fund"
  | "report"
  | "periodLock"
  | "catalog"
  | "users";

export interface NavLinkDefinition {
  href: string;
  label: string;
  icon: NavIconKey;
  permissionCodes?: string[];
}

export const NAV_LINKS: NavLinkDefinition[] = [
  { href: "/", label: "Trang chính", icon: "home" },
  { href: "/kiem-ke", label: "Kiểm kê", icon: "stocktake", permissionCodes: ["inventory.stocktake.view"] },
  { href: "/chuyen-kho", label: "Chuyển kho", icon: "transfer", permissionCodes: ["inventory.transfer.view"] },
  { href: "/lich-su", label: "Lịch sử", icon: "history", permissionCodes: ["inventory.history.view"] },
  { href: "/quy", label: "Quỹ", icon: "fund", permissionCodes: ["fund.view"] },
  { href: "/bao-cao", label: "Báo cáo", icon: "report", permissionCodes: ["inventory.report.view"] },
  { href: "/khoa-ky", label: "Khóa kỳ", icon: "periodLock", permissionCodes: ["period.lock.manage"] },
  { href: "/vat-lieu", label: "Danh mục", icon: "catalog", permissionCodes: ["catalog.view", "project.view"] },
  { href: "/nguoi-dung", label: "Người dùng", icon: "users", permissionCodes: ["permission.manage"] },
];

export function visibleNavLinks(permissionCodes: readonly string[]): NavLinkDefinition[] {
  const permissionSet = new Set(permissionCodes);
  return NAV_LINKS.filter((link) => {
    if (!link.permissionCodes || link.permissionCodes.length === 0) return true;
    return link.permissionCodes.some((code) => permissionSet.has(code));
  });
}
