// src/app/api/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission, getScopeFilter } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "diem_danh", "chi_xem");
    if (!allowed) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const { toFilter } = await getScopeFilter(userId, "diem_danh");

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const ngay = searchParams.get("ngay");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const lop = searchParams.get("lop");

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = Number(studentId);
    if (ngay) where.ngay = new Date(ngay);
    if (from || to) {
      where.ngay = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    if (toFilter !== null && toFilter.length > 0) {
      where.toId = { in: toFilter };
    } else if (toFilter !== null && toFilter.length === 0) {
      return NextResponse.json({ data: [] }); // Không có phạm vi
    }
    if (lop && lop !== "ALL") {
      where.student = { lop };
    }

    const data = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, hoTen: true, tenGoi: true, to: true, lop: true } },
      },
      orderBy: [{ ngay: "desc" }, { student: { to: "asc" } }],
    });

    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const body = await req.json();
    const { studentId, ngay, loai, ghiChu } = body;

    if (!studentId || !ngay || !loai) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Lấy thông tin tổ của học sinh
    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
      select: { to: true },
    });
    if (!student) return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 });

    // Kiểm tra quyền theo scope
    const { allowed } = await checkPermission(userId, "diem_danh", "toan_quyen", student.to);
    if (!allowed) return NextResponse.json({ error: "Không có quyền cho tổ này" }, { status: 403 });

    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_ngay_loai: {
          studentId: Number(studentId),
          ngay: new Date(ngay),
          loai,
        },
      },
      update: { ghiChu: ghiChu?.trim() || null, submittedBy: userId },
      create: {
        studentId: Number(studentId),
        ngay: new Date(ngay),
        loai,
        ghiChu: ghiChu?.trim() || null,
        submittedBy: userId,
        toId: student.to,
      },
    });

    return NextResponse.json(attendance, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

    const record = await prisma.attendance.findUnique({ where: { id: Number(id) } });
    if (!record) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    const { allowed } = await checkPermission(userId, "diem_danh", "toan_quyen", record.toId);
    if (!allowed) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    await prisma.attendance.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
