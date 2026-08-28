// src/middleware.ts
// Bảo vệ toàn bộ hệ thống - Bắt buộc Đăng nhập hoặc Đăng ký tài khoản mới trước khi truy cập
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;

  const hasSession =
    cookies.has("authjs.session-token") ||
    cookies.has("__Secure-authjs.session-token") ||
    cookies.has("next-auth.session-token") ||
    cookies.has("__Secure-next-auth.session-token");

  // Các đường dẫn công khai không cần đăng nhập:
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/dang-ky" ||
    pathname === "/admin/login";

  const isPublicApi =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/classes");

  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|css|js|woff|woff2|ttf)$/);

  // 1. Nếu CHƯA đăng nhập mà truy cập bất kỳ trang nào (ngoại trừ login, dang-ky, api công khai)
  // => Chuyển hướng ngay về trang /login
  if (!hasSession && !isAuthPage && !isPublicApi && !isStaticAsset) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Nếu ĐÃ đăng nhập mà truy cập /login, /dang-ky, /admin/login
  // => Chuyển hướng vào trang chủ hoặc dashboard
  if (hasSession && isAuthPage) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Khớp tất cả routes, ngoại trừ:
     * - api/auth (NextAuth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
