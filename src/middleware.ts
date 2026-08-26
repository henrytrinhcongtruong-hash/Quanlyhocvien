// src/middleware.ts
// Bảo vệ routes /admin/* - Edge Runtime Compatible 100%
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;

  const hasSession =
    cookies.has("authjs.session-token") ||
    cookies.has("__Secure-authjs.session-token") ||
    cookies.has("next-auth.session-token") ||
    cookies.has("__Secure-next-auth.session-token");

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isLoginPage = nextUrl.pathname === "/admin/login";

  // Login page: chuyển sang /admin nếu đã đăng nhập
  if (isLoginPage && hasSession) {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  // Admin routes: chuyển sang login nếu chưa đăng nhập
  if (isAdminRoute && !isLoginPage && !hasSession) {
    return NextResponse.redirect(new URL("/admin/login", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
