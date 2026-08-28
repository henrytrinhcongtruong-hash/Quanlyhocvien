// src/middleware.ts
// Bảo vệ toàn bộ hệ thống - Bắt buộc Đăng nhập hoặc Đăng ký tài khoản mới trước khi truy cập
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;

  // 1. Cho phép tự do truy cập các trang auth, api công khai, static assets
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

  if (isAuthPage || isPublicApi || isStaticAsset) {
    return NextResponse.next();
  }

  // 2. Kiểm tra token đăng nhập (hỗ trợ cả HTTPS production Vercel và HTTP localhost)
  const sessionToken =
    cookies.get("authjs.session-token")?.value ||
    cookies.get("__Secure-authjs.session-token")?.value ||
    cookies.get("next-auth.session-token")?.value ||
    cookies.get("__Secure-next-auth.session-token")?.value;

  const hasSession = !!sessionToken && sessionToken.trim().length > 10;

  // 3. Nếu CHƯA đăng nhập mà vào bất kỳ trang nào khác -> Chuyển về /login
  if (!hasSession) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
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
