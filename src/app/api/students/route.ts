// src/app/api/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission, getScopeFilter } from "@/lib/permissions";
import { logActivity } from "@/lib/auditLogger";

// GET /api/students - Lấy danh sách học sinh (có filter theo scope quyền)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lopParam = searchParams.get("lop");
    const toParam = searchParams.get("to");
    const searchParam = searchParams.get("search");

    const session = await auth();
    const isSuperAdmin = !!(
      (session as { isSuperAdmin?: boolean })?.isSuperAdmin ||
      (session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin ||
      session?.user?.id === "1" ||
      session?.user?.name === "Admin Hệ Thống"
    );

    let allowedToIds: number[] | null = null;
    let assignedLop = (session as { assignedLop?: string })?.assignedLop || "12T2";

    if (session?.user?.id && !isSuperAdmin) {
      const userId = Number(session.user.id);
      assignedLop = (session as { assignedLop?: string })?.assignedLop || "12T2";

      // Allow viewing students if user has permission on hoc_sinh or any related classroom module
      const [
        hocSinhPerm,
        diemDanhPerm,
        soDoPerm,
        tkbPerm,
        thiPerm,
        trucPerm,
        suKienPerm,
        baoCaoPerm,
      ] = await Promise.all([
        checkPermission(userId, "hoc_sinh", "chi_xem"),
        checkPermission(userId, "diem_danh", "chi_xem"),
        checkPermission(userId, "so_do_lop", "chi_xem"),
        checkPermission(userId, "thoi_khoa_bieu", "chi_xem"),
        checkPermission(userId, "lich_thi", "chi_xem"),
        checkPermission(userId, "lich_truc", "chi_xem"),
        checkPermission(userId, "su_kien", "chi_xem"),
        checkPermission(userId, "bao_cao", "chi_xem"),
      ]);

      const hasAccess =
        hocSinhPerm.allowed ||
        diemDanhPerm.allowed ||
        soDoPerm.allowed ||
        tkbPerm.allowed ||
        thiPerm.allowed ||
        trucPerm.allowed ||
        suKienPerm.allowed ||
        baoCaoPerm.allowed;

      if (!hasAccess) {
        return NextResponse.json({ error: "Không có quyền xem học sinh" }, { status: 403 });
      }

      // If specific scope applies to hoc_sinh
      const scope = await getScopeFilter(userId, "hoc_sinh");
      if (scope.toFilter && scope.toFilter.length > 0) {
        allowedToIds = scope.toFilter;
      }
    }

    const where: Record<string, unknown> = {};

    if (lopParam && lopParam !== "ALL") {
      where.lop = lopParam;
    } else if (!isSuperAdmin && assignedLop) {
      where.lop = assignedLop;
    }

    if (toParam && Number(toParam) > 0) {
      where.to = Number(toParam);
    } else if (allowedToIds !== null && allowedToIds.length > 0) {
      where.to = { in: allowedToIds };
    }

    if (searchParam && searchParam.trim()) {
      where.OR = [
        { hoTen: { contains: searchParam.trim(), mode: "insensitive" } },
        { tenGoi: { contains: searchParam.trim(), mode: "insensitive" } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: [{ to: "asc" }, { hoTen: "asc" }],
    });

    return NextResponse.json({ data: students, total: students.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// POST /api/students - Thêm học sinh (yêu cầu hoc_sinh = toan_quyen)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const isSuperAdmin = !!(session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin;
    const { allowed } = await checkPermission(userId, "hoc_sinh", "toan_quyen");
    if (!allowed && !isSuperAdmin && userId !== 1) {
      return NextResponse.json({ error: "Không có quyền thao tác" }, { status: 403 });
    }

    const body = await req.json();
    const { hoTen, tenGoi, ngaySinh, gioiTinh, to, lop, ghiChu, avatar } = body;

    if (!hoTen || !to) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const student = await prisma.student.create({
      data: {
        hoTen: hoTen.trim(),
        tenGoi: tenGoi?.trim() || null,
        ngaySinh: ngaySinh ? new Date(ngaySinh) : null,
        gioiTinh: gioiTinh || "Nam",
        to: Number(to),
        lop: (lop || (session as { assignedLop?: string })?.assignedLop || "12T2").trim(),
        ghiChu: ghiChu?.trim() || null,
        avatar: avatar || null,
      },
    });

    // Ghi audit log tạo học sinh
    logActivity({
      userId,
      userName: session.user.name || (session.user as { username?: string })?.username || "Admin",
      userRole: (session.user as { roleLabel?: string })?.roleLabel || "Admin",
      userLop: student.lop,
      action: "CREATE",
      target: "Student",
      targetId: student.id,
      details: `Thêm mới học sinh "${student.hoTen}" vào Tổ ${student.to} (Lớp ${student.lop})`,
      newValue: student,
      req,
      status: "SUCCESS",
    });

    return NextResponse.json(student, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
