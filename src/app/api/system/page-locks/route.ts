// src/app/api/system/page-locks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/auditLogger";

export const DEFAULT_STUDENT_PAGES = [
  {
    path: "/",
    title: "Trang chủ học viên",
    description: "Cổng thông tin tổng quan, thông báo lớp, thống kê học tập",
    icon: "Home",
  },
  {
    path: "/so-do-lop",
    title: "Sơ đồ lớp học",
    description: "Sơ đồ vị trí 56 chỗ ngồi trực quan 4 Tổ của lớp học",
    icon: "LayoutGrid",
  },
  {
    path: "/thoi-khoa-bieu",
    title: "Thời khóa biểu",
    description: "Lịch học các môn sáng & chiều từ Thứ 2 đến Thứ 7",
    icon: "CalendarDays",
  },
  {
    path: "/quy-lop",
    title: "Quỹ lớp & Thu chi",
    description: "Báo cáo thu quỹ học sinh và các hóa đơn chi tiêu minh bạch",
    icon: "Wallet",
  },
  {
    path: "/lich-thi",
    title: "Lịch thi & Kiểm tra",
    description: "Lịch kiểm tra 15p, 1 tiết, thi giữa kỳ & cuối kỳ",
    icon: "GraduationCap",
  },
  {
    path: "/lich-truc",
    title: "Lịch trực nhật",
    description: "Phân công tổ & học sinh trực nhật theo từng tuần",
    icon: "Calendar",
  },
  {
    path: "/su-kien",
    title: "Sự kiện & Hoạt động",
    description: "Các phong trào, hoạt động ngoại khóa, phân công nhiệm vụ",
    icon: "Star",
  },
  {
    path: "/diem-danh-cua-toi",
    title: "Điểm danh cá nhân",
    description: "Trang tra cứu chuyên cần, số buổi vắng & đi trễ của học viên",
    icon: "BookOpen",
  },
  {
    path: "/dang-ky",
    title: "Đăng ký tài khoản học sinh",
    description: "Cổng tạo tài khoản đăng nhập cá nhân cho học sinh mới",
    icon: "UserPlus",
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pathQuery = searchParams.get("path");

    // Lấy toàn bộ bản ghi khóa trang trong database
    let dbLocks = await prisma.pageLock.findMany({
      orderBy: { id: "asc" },
    });

    // Nếu database chưa có đủ 9 trang -> tự động khởi tạo (Seed)
    if (dbLocks.length < DEFAULT_STUDENT_PAGES.length) {
      for (const def of DEFAULT_STUDENT_PAGES) {
        const exists = dbLocks.find((l) => l.path === def.path);
        if (!exists) {
          await prisma.pageLock.upsert({
            where: { path: def.path },
            update: {},
            create: {
              path: def.path,
              title: def.title,
              description: def.description,
              isLocked: false,
              lockReason: "Hệ thống đang được nâng cấp tính năng mới. Vui lòng quay lại sau ít phút!",
            },
          });
        }
      }

      dbLocks = await prisma.pageLock.findMany({
        orderBy: { id: "asc" },
      });
    }

    if (pathQuery) {
      const single = dbLocks.find((l) => l.path === pathQuery);
      return NextResponse.json({
        success: true,
        data: single || { path: pathQuery, isLocked: false },
      });
    }

    // Ghép icon vào từng trang
    const merged = DEFAULT_STUDENT_PAGES.map((def) => {
      const found = dbLocks.find((l) => l.path === def.path);
      return {
        path: def.path,
        title: found?.title || def.title,
        description: found?.description || def.description,
        icon: def.icon,
        isLocked: found?.isLocked || false,
        lockReason: found?.lockReason || "Hệ thống đang được nâng cấp tính năng mới. Vui lòng quay lại sau ít phút!",
        lockUntil: found?.lockUntil || null,
        lockedBy: found?.lockedBy || null,
        updatedAt: found?.updatedAt || new Date(),
      };
    });

    return NextResponse.json({
      success: true,
      data: merged,
      total: merged.length,
      lockedCount: merged.filter((m) => m.isLocked).length,
      unlockedCount: merged.filter((m) => !m.isLocked).length,
    });
  } catch (error) {
    console.error("GET page-locks error:", error);
    return NextResponse.json({ error: "Lỗi tải trạng thái khóa trang" }, { status: 500 });
  }
}

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
    const { path, isLocked, lockReason, lockUntil } = body;

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Đường dẫn (path) không hợp lệ" }, { status: 400 });
    }

    const defaultDef = DEFAULT_STUDENT_PAGES.find((d) => d.path === path);

    const updated = await prisma.pageLock.upsert({
      where: { path },
      update: {
        isLocked: Boolean(isLocked),
        lockReason: lockReason !== undefined ? lockReason : undefined,
        lockUntil: lockUntil ? new Date(lockUntil) : null,
        lockedBy: session.user.name || (session.user as { username?: string })?.username || "Admin",
      },
      create: {
        path,
        title: defaultDef?.title || path,
        description: defaultDef?.description || "",
        isLocked: Boolean(isLocked),
        lockReason: lockReason || "Hệ thống đang được nâng cấp tính năng mới. Vui lòng quay lại sau ít phút!",
        lockUntil: lockUntil ? new Date(lockUntil) : null,
        lockedBy: session.user.name || (session.user as { username?: string })?.username || "Admin",
      },
    });

    // Ghi audit log
    logActivity({
      userName: session.user.name || (session.user as { username?: string })?.username || "Admin",
      userRole: userRole || "Admin",
      action: isLocked ? "LOCK_PAGE" : "UNLOCK_PAGE",
      target: "PageLock",
      targetId: path,
      details: isLocked
        ? `Khóa trang "${updated.title}" (${path}) để nâng cấp: ${lockReason || "Không có lý do cụ thể"}`
        : `Mở khóa trang "${updated.title}" (${path}) cho học viên truy cập`,
      newValue: { path, isLocked, lockReason, lockUntil },
      req,
      status: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      message: isLocked ? `Đã KHÓA trang "${updated.title}" để nâng cấp thành công` : `Đã MỞ KHÓA trang "${updated.title}" cho học viên truy cập`,
      data: updated,
    });
  } catch (error) {
    console.error("POST page-locks error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật trạng thái khóa trang" }, { status: 500 });
  }
}
