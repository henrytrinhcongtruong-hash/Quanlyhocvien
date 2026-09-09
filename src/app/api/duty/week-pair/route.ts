// src/app/api/duty/week-pair/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/auditLogger";
import { THU_NAMES, THU_ORDER } from "@/lib/format";

// POST /api/duty/week-pair - Phân 2 bạn trực nhật nguyên tuần (Thứ 2 -> Thứ 6)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const isSuperAdmin = !!(session as { isSuperAdmin?: boolean }).isSuperAdmin;
    const { allowed } = isSuperAdmin ? { allowed: true } : await checkPermission(userId, "lich_truc", "toan_quyen");
    if (!allowed) {
      return NextResponse.json({ error: "Không có quyền quản lý lịch trực nhật" }, { status: 403 });
    }

    const body = await req.json();
    const { tuan, studentId1, studentId2, lop, clearPrevious = true } = body;

    if (!tuan) {
      return NextResponse.json({ error: "Thiếu thông tin tuần" }, { status: 400 });
    }

    const sId1 = Number(studentId1);
    const sId2 = Number(studentId2);

    if (!sId1 || !sId2) {
      return NextResponse.json({ error: "Vui lòng chọn đủ 2 học sinh trực nhật" }, { status: 400 });
    }

    if (sId1 === sId2) {
      return NextResponse.json({ error: "Học sinh 1 và học sinh 2 không được trùng nhau" }, { status: 400 });
    }

    // Kiểm tra thông tin 2 học sinh
    const [st1, st2] = await Promise.all([
      prisma.student.findUnique({ where: { id: sId1 }, select: { id: true, hoTen: true, tenGoi: true, lop: true, to: true } }),
      prisma.student.findUnique({ where: { id: sId2 }, select: { id: true, hoTen: true, tenGoi: true, lop: true, to: true } }),
    ]);

    if (!st1 || !st2) {
      return NextResponse.json({ error: "Không tìm thấy thông tin một trong hai học sinh" }, { status: 404 });
    }

    // 1. Xóa lịch cũ nếu được yêu cầu
    if (clearPrevious) {
      const deleteWhere: Record<string, unknown> = { tuan };
      const targetLop = lop && lop !== "ALL" ? lop : st1.lop;
      if (targetLop && targetLop !== "ALL") {
        deleteWhere.student = { lop: targetLop };
      }
      await prisma.dutyRoster.deleteMany({ where: deleteWhere });
    }

    // 2. Tạo 10 bản ghi trực nhật cho 5 ngày (Thứ 2 đến Thứ 6)
    const newRecords = [];
    for (const thu of THU_NAMES) {
      const thuOrder = THU_ORDER[thu] || 2;
      newRecords.push(
        { tuan, thu, thuOrder, studentId: sId1 },
        { tuan, thu, thuOrder, studentId: sId2 }
      );
    }

    await prisma.dutyRoster.createMany({
      data: newRecords,
    });

    // 3. Ghi audit log
    await logActivity({
      userId,
      action: "CREATE",
      target: "DutyRoster",
      details: `Phân 2 bạn [${st1.hoTen}] và [${st2.hoTen}] trực nguyên tuần ${tuan} (Thứ 2 - Thứ 6)`,
    });

    return NextResponse.json({
      success: true,
      message: `Đã phân công ${st1.hoTen} và ${st2.hoTen} trực cả tuần ${tuan}`,
      count: newRecords.length,
    });
  } catch (error) {
    console.error("Lỗi phân 2 bạn trực cả tuần:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi phân công trực nhật" }, { status: 500 });
  }
}
