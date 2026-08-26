// src/app/api/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";

// GET /api/students - Danh sách học sinh (public + admin)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get("to");
    const lop = searchParams.get("lop");
    const search = searchParams.get("search");
    const page = Number(searchParams.get("page") || 1);
    const perPage = Number(searchParams.get("perPage") || 100);

    const where: Record<string, unknown> = {};
    if (lop && lop !== "ALL") where.lop = lop;
    if (to && Number(to) > 0) where.to = Number(to);
    if (search) {
      where.OR = [
        { hoTen: { contains: search } },
        { tenGoi: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        orderBy: [{ to: "asc" }, { hoTen: "asc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
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
    const { allowed } = await checkPermission(userId, "hoc_sinh", "toan_quyen");
    if (!allowed) {
      return NextResponse.json({ error: "Không có quyền thao tác" }, { status: 403 });
    }

    const body = await req.json();
    const { hoTen, tenGoi, ngaySinh, gioiTinh, to, lop, ghiChu } = body;

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
        lop: (lop || (session as { assignedLop?: string })?.assignedLop || "11AT3").trim(),
        ghiChu: ghiChu?.trim() || null,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
