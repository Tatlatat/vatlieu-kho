"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Package,
  Home,
  History,
  BarChart3,
  Boxes,
  ClipboardCheck,
  LogOut,
  ArrowLeftRight,
  Building2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "OWNER" | "STAFF";

const links: { href: string; label: string; icon: typeof Home; permission?: string }[] = [
  { href: "/", label: "Trang chính", icon: Home },
  { href: "/kiem-ke", label: "Kiểm kê", icon: ClipboardCheck, permission: "inventory.stocktake.view" },
  { href: "/chuyen-kho", label: "Chuyển kho", icon: ArrowLeftRight, permission: "inventory.transfer.view" },
  { href: "/lich-su", label: "Lịch sử", icon: History, permission: "inventory.history.view" },
  { href: "/cong-trinh", label: "Công trình", icon: Building2, permission: "project.view" },
  { href: "/bao-cao", label: "Báo cáo", icon: BarChart3, permission: "inventory.report.view" },
  { href: "/vat-lieu", label: "Danh mục", icon: Boxes, permission: "catalog.view" },
  { href: "/nguoi-dung", label: "Người dùng", icon: Users, permission: "permission.manage" },
];

export function Nav({
  role,
  name,
  permissionCodes,
}: {
  role: Role;
  name: string;
  permissionCodes: string[];
}) {
  const pathname = usePathname();
  const permissionSet = new Set(permissionCodes);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Package className="h-5 w-5" />
          </div>
          <span className="hidden font-semibold sm:inline">Kho Vật Liệu</span>
        </div>

        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {links
            .filter((l) => !l.permission || permissionSet.has(l.permission))
            .map((l) => {
              const active =
                l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  title={l.label}
                  aria-label={l.label}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{l.label}</span>
                </Link>
              );
            })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-slate-500 sm:inline">
            {name} ({role === "OWNER" ? "Quản lý" : "Thủ kho"})
          </span>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" type="submit" title="Đăng xuất" aria-label="Đăng xuất">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
