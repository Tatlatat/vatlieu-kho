import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isLogin = nextUrl.pathname.startsWith("/login");

  if (isLogin) {
    if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
    return;
  }

  if (!isLoggedIn) return Response.redirect(new URL("/login", nextUrl));
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
