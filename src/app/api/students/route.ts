// src/app/api/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission, getScopeFilter } from "@/lib/permissions";

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
      const perm = await checkPermission(userId, "hoc_sinh", "chi_xem");
      if (!perm.allowed) {
        return NextResponse.json({ error: "Không có quyền xem học sinh" }, { status: 403 });
      }
      const scope = await getScopeFilter(userId, "hoc_sinh");
      allowedToIds = scope.toFilter;
      assignedLop = (session as { assignedLop?: string })?.assignedLop || "12T2";
    }

    const where: Record<string, unknown> = {};

    if (lopParam && lopParam !== "ALL") {
      where.lop = lopParam;
    } else if (!isSuperAdmin && assignedLop) {
      where.lop = assignedLop;
    }

    if (toParam && Number(toParam) > 0) {
      where.to = Number(toParam);
    } else if (allowedToIds !== null) {
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

    return NextResponse.json(student, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
