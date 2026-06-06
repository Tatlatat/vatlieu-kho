import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

// Cấp vai trò (khớp ROLE_LEVEL ở lib/auth-helpers). Middleware so cấp ≥ ngưỡng;
// page guard (requireAtLeast) là nguồn chính, đây là chặn thô ở biên.
const ROLE_LEVEL: Record<string, number> = { ADMIN: 3, MANAGER: 2, KEEPER: 1 };

// Tiền tố đường dẫn -> cấp tối thiểu.
const MIN_ROLE: { prefix: string; level: number }[] = [
  { prefix: "/nguoi-dung", level: 3 }, // ADMIN
  { prefix: "/vat-lieu", level: 2 },   // MANAGER
  { prefix: "/cong-trinh", level: 2 },
  { prefix: "/quy", level: 2 },
  { prefix: "/nha-cung-cap", level: 2 },
  { prefix: "/xe-may", level: 2 },
  { prefix: "/ton-dau-ky", level: 2 },
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const isLogin = nextUrl.pathname.startsWith("/login");

  if (isLogin) {
    if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
    return;
  }

  if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl));

  const userLevel = ROLE_LEVEL[role ?? ""] ?? 0;
  const rule = MIN_ROLE.find((r) => nextUrl.pathname.startsWith(r.prefix));
  if (rule && userLevel < rule.level) {
    return Response.redirect(new URL("/", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
