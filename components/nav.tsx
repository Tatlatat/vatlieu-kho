"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Package,
  Home,
  History,
  BarChart3,
  ClipboardCheck,
  LogOut,
  ArrowLeftRight,
  Users,
  Wallet,
  Building2,
  Boxes,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "ADMIN" | "MANAGER" | "KEEPER";

const ROLE_LEVEL: Record<Role, number> = { ADMIN: 3, MANAGER: 2, KEEPER: 1 };
const roleLabel = (r: Role) => (r === "ADMIN" ? "Quản trị" : r === "MANAGER" ? "Quản lý" : "Thủ kho");

const mainLinks = [
  { href: "/", label: "Trang chính", icon: Home, minRole: "KEEPER" as Role },
  { href: "/kiem-ke", label: "Kiểm kê", icon: ClipboardCheck, minRole: "KEEPER" as Role },
  { href: "/chuyen-kho", label: "Chuyển kho", icon: ArrowLeftRight, minRole: "KEEPER" as Role },
];

const moreLinks = [
  { href: "/lich-su", label: "Lịch sử", icon: History, minRole: "KEEPER" as Role },
  { href: "/bao-cao", label: "Báo cáo", icon: BarChart3, minRole: "KEEPER" as Role },
  { href: "/quy", label: "Quỹ", icon: Wallet, minRole: "MANAGER" as Role },
  { href: "/cong-trinh", label: "Công trình", icon: Building2, minRole: "MANAGER" as Role },
  { href: "/danh-muc", label: "Danh mục", icon: Boxes, minRole: "KEEPER" as Role },
  { href: "/nguoi-dung", label: "Người dùng", icon: Users, minRole: "ADMIN" as Role },
];

export function Nav({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
          {mainLinks
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

          {/* Dropdown "Thêm" */}
          {moreLinks.some((l) => ROLE_LEVEL[role] >= ROLE_LEVEL[l.minRole]) && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  moreOpen
                    ? "bg-slate-100 text-slate-800"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Menu className="h-4 w-4" />
                <span>Thêm</span>
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 rounded-md border bg-white shadow-lg z-50 min-w-[180px] py-1">
                  {moreLinks
                    .filter((l) => ROLE_LEVEL[role] >= ROLE_LEVEL[l.minRole])
                    .map((l) => {
                      const active = pathname.startsWith(l.href);
                      const Icon = l.icon;
                      return (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                            active
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{l.label}</span>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          )}
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
