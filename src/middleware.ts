// src/middleware.ts
// Bảo vệ routes /admin/* - yêu cầu đăng nhập
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isLoginPage = nextUrl.pathname === "/admin/login";
  const isApiRoute = nextUrl.pathname.startsWith("/api");

  // API routes: handle auth in route handlers
  if (isApiRoute) return NextResponse.next();

  // Login page: redirect if already logged in
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  // Admin routes: redirect to login if not logged in
  if (isAdminRoute && !isLoginPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
