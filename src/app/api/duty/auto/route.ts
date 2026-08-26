// src/app/api/duty/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { THU_NAMES, THU_ORDER } from "@/lib/format";

// POST /api/duty/auto - Tự động thiết lập lại và xếp lịch trực nhật theo tổ hoặc toàn lớp
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const isSuperAdmin = !!(session as { isSuperAdmin?: boolean }).isSuperAdmin;
    const { allowed } = isSuperAdmin ? { allowed: true } : await checkPermission(userId, "lich_truc", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền quản lý lịch trực nhật" }, { status: 403 });

    const body = await req.json();
    const { tuan, lop, mode, toNum, clearPrevious = true } = body;

    if (!tuan || !lop) {
      return NextResponse.json({ error: "Thiếu thông tin tuần hoặc lớp" }, { status: 400 });
    }

    // 1. Clear previous assignments if requested
    if (clearPrevious) {
      const deleteWhere: Record<string, unknown> = { tuan };
      if (lop !== "ALL") {
        deleteWhere.student = { lop };
      }
      await prisma.dutyRoster.deleteMany({ where: deleteWhere });
    }

    // 2. Fetch target students
    const studentWhere: Record<string, unknown> = {};
    if (lop !== "ALL") studentWhere.lop = lop;
    if (mode === "to" && toNum) studentWhere.to = Number(toNum);

    const students = await prisma.student.findMany({
      where: studentWhere,
      orderBy: [{ to: "asc" }, { hoTen: "asc" }],
    });

    if (students.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy học sinh nào phù hợp" }, { status: 404 });
    }

    // 3. Distribute students across 5 days (Thứ 2 -> Thứ 6)
    const days = THU_NAMES.slice(0, 5); // ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"]
    let count = 0;

    for (let i = 0; i < students.length; i++) {
      const dayIndex = i % days.length;
      const thu = days[dayIndex];
      const thuOrder = THU_ORDER[thu] || (dayIndex + 2);
      const student = students[i];

      await prisma.dutyRoster.create({
        data: {
          tuan,
          thu,
          thuOrder,
          studentId: student.id,
        },
      });
      count++;
    }

    return NextResponse.json({
      success: true,
      count,
      tuan,
      lop,
      mode,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi tự động xếp lịch trực nhật" }, { status: 500 });
  }
}
