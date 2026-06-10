import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { hasOwnerAccess } from "./lib/roles";

const { auth } = NextAuth(authConfig);

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

  const ownerOnly = ["/bao-cao", "/vat-lieu"];
  if (!hasOwnerAccess(role) && ownerOnly.some((p) => nextUrl.pathname.startsWith(p))) {
    return Response.redirect(new URL("/", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
