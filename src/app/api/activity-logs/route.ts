// src/app/api/activity-logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // 1. Phân quyền chặt chẽ: Chỉ Admin / GVCN mới có quyền xem Log
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const isSuperAdmin = !!(
      (session as { isSuperAdmin?: boolean })?.isSuperAdmin ||
      (session.user as { isSuperAdmin?: boolean })?.isSuperAdmin ||
      session.user?.id === "1" ||
      session.user?.name === "Admin Hệ Thống" ||
      session.user?.email === "admin"
    );

    const userRole = (
      (session as { roleLabel?: string })?.roleLabel ||
      (session.user as { roleLabel?: string })?.roleLabel ||
      ""
    );

    const isGVCN =
      userRole.toLowerCase().includes("gvcn") ||
      userRole.toLowerCase().includes("chủ nhiệm") ||
      userRole.toLowerCase().includes("giáo viên") ||
      userRole.toLowerCase().includes("admin") ||
      userRole === "Admin Tổng";

    if (!isSuperAdmin && !isGVCN) {
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập lịch sử hoạt động (Chỉ dành cho Quản trị viên)" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "25")));
    const search = searchParams.get("search")?.trim() || "";
    const action = searchParams.get("action")?.trim() || "";
    const target = searchParams.get("target")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const userRoleFilter = searchParams.get("userRole")?.trim() || "";
    const userLopFilter = searchParams.get("userLop")?.trim() || "";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    const exportAll = searchParams.get("exportAll") === "true";

    // 2. Xây dựng bộ lọc WHERE linh hoạt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (action && action !== "ALL") {
      where.action = action;
    }

    if (target && target !== "ALL") {
      where.target = target;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (userRoleFilter && userRoleFilter !== "ALL") {
      where.userRole = userRoleFilter;
    }

    if (userLopFilter && userLopFilter !== "ALL") {
      where.userLop = userLopFilter;
    }

    // Lọc theo khoảng thời gian
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Tìm kiếm từ khóa theo nhiều trường
    if (search) {
      where.OR = [
        { userName: { contains: search, mode: "insensitive" } },
        { details: { contains: search, mode: "insensitive" } },
        { targetId: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } },
        { userLop: { contains: search, mode: "insensitive" } },
      ];
    }

    // 3. Nếu là Export toàn bộ file Excel
    if (exportAll) {
      const allLogs = await prisma.activityLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: 5000, // Tối đa 5000 dòng để không tràn bộ nhớ
      });

      return NextResponse.json({
        success: true,
        data: allLogs,
        total: allLogs.length,
      });
    }

    // 4. Phân trang & Đếm tổng số bản ghi
    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("GET activity-logs error:", error);
    return NextResponse.json({ error: "Lỗi khi tải lịch sử hoạt động" }, { status: 500 });
  }
}

// Xóa log cũ (Dành cho SuperAdmin dọn dẹp dung lượng)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const isSuperAdmin = !!(
      (session as { isSuperAdmin?: boolean })?.isSuperAdmin ||
      (session.user as { isSuperAdmin?: boolean })?.isSuperAdmin ||
      session.user?.id === "1" ||
      session.user?.name === "Admin Hệ Thống" ||
      session.user?.email === "admin"
    );
    const userRole = (
      (session as { roleLabel?: string })?.roleLabel ||
      (session.user as { roleLabel?: string })?.roleLabel ||
      ""
    );

    if (!isSuperAdmin && userRole !== "Admin Tổng") {
      return NextResponse.json(
        { error: "Chỉ SuperAdmin mới có quyền xóa dữ liệu nhật ký hoạt động" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const olderThanDays = parseInt(searchParams.get("olderThanDays") || "90");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã dọn dẹp thành công ${result.count} bản ghi log cũ hơn ${olderThanDays} ngày`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("DELETE activity-logs error:", error);
    return NextResponse.json({ error: "Lỗi dọn dẹp nhật ký hoạt động" }, { status: 500 });
  }
}
