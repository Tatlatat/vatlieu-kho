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
  Users,
  Truck,
  Wrench,
  Wallet,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "ADMIN" | "MANAGER" | "KEEPER";

// Cấp vai trò (khớp ROLE_LEVEL ở lib/auth-helpers; định nghĩa cục bộ vì nav là
// client component, không import được server helper).
const ROLE_LEVEL: Record<Role, number> = { ADMIN: 3, MANAGER: 2, KEEPER: 1 };
const roleLabel = (r: Role) => (r === "ADMIN" ? "Quản trị" : r === "MANAGER" ? "Quản lý" : "Thủ kho");

const links: { href: string; label: string; icon: typeof Home; minRole: Role }[] = [
  { href: "/", label: "Trang chính", icon: Home, minRole: "KEEPER" },
  { href: "/kiem-ke", label: "Kiểm kê", icon: ClipboardCheck, minRole: "KEEPER" },
  { href: "/chuyen-kho", label: "Chuyển kho", icon: ArrowLeftRight, minRole: "KEEPER" },
  { href: "/lich-su", label: "Lịch sử", icon: History, minRole: "KEEPER" },
  { href: "/bao-cao", label: "Báo cáo", icon: BarChart3, minRole: "KEEPER" },
  { href: "/quy", label: "Quỹ", icon: Wallet, minRole: "MANAGER" },
  { href: "/cong-trinh", label: "Công trình", icon: Building2, minRole: "MANAGER" },
  { href: "/vat-lieu", label: "Danh mục", icon: Boxes, minRole: "MANAGER" },
  { href: "/nha-cung-cap", label: "Nhà cung cấp", icon: Truck, minRole: "MANAGER" },
  { href: "/xe-may", label: "Xe/máy", icon: Wrench, minRole: "MANAGER" },
  { href: "/nguoi-dung", label: "Người dùng", icon: Users, minRole: "ADMIN" },
];

export function Nav({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();

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
            .filter((l) => ROLE_LEVEL[role] >= ROLE_LEVEL[l.minRole])
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
            {name} ({roleLabel(role)})
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
