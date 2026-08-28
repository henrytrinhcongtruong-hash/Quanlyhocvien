// src/app/api/system/page-locks/toggle-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DEFAULT_STUDENT_PAGES } from "../route";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yêu cầu đăng nhập quản trị viên" }, { status: 401 });
    }

    const userRole = (session.user as { roleLabel?: string })?.roleLabel || "";
    const isSuperAdmin = (session.user as { isSuperAdmin?: boolean })?.isSuperAdmin;
    const isGVCN = userRole.toLowerCase().includes("gvcn") || userRole.toLowerCase().includes("chủ nhiệm") || userRole.toLowerCase().includes("giáo viên");

    if (!isSuperAdmin && !isGVCN && userRole !== "Admin Tổng") {
      return NextResponse.json({ error: "Bạn không có quyền quản lý khóa trang" }, { status: 403 });
    }

    const body = await req.json();
    const { lockAll, lockReason, lockUntil } = body;

    const shouldLock = Boolean(lockAll);
    const lockedBy = session.user.name || (session.user as { username?: string })?.username || "Admin";

    for (const def of DEFAULT_STUDENT_PAGES) {
      await prisma.pageLock.upsert({
        where: { path: def.path },
        update: {
          isLocked: shouldLock,
          lockReason: lockReason || "Hệ thống đang được nâng cấp toàn diện. Vui lòng quay lại sau ít phút!",
          lockUntil: lockUntil ? new Date(lockUntil) : null,
          lockedBy,
        },
        create: {
          path: def.path,
          title: def.title,
          description: def.description,
          isLocked: shouldLock,
          lockReason: lockReason || "Hệ thống đang được nâng cấp toàn diện. Vui lòng quay lại sau ít phút!",
          lockUntil: lockUntil ? new Date(lockUntil) : null,
          lockedBy,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: shouldLock
        ? "Đã KHÓA TOÀN BỘ tất cả các trang của học viên để nâng cấp!"
        : "Đã MỞ KHÓA TOÀN BỘ tất cả các trang cho học viên truy cập!",
    });
  } catch (error) {
    console.error("POST toggle-all page-locks error:", error);
    return NextResponse.json({ error: "Lỗi thực hiện thao tác khóa toàn bộ" }, { status: 500 });
  }
}
