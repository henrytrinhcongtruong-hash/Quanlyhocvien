// src/app/api/duty/week-pair/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/auditLogger";
import { THU_NAMES, THU_ORDER } from "@/lib/format";

// POST /api/duty/week-pair - Phân học sinh trực nhật nguyên tuần (Thứ 2 -> Thứ 6) với số lượng tùy chọn
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
    const { tuan, studentIds, studentId1, studentId2, lop, clearPrevious = true } = body;

    if (!tuan) {
      return NextResponse.json({ error: "Thiếu thông tin tuần" }, { status: 400 });
    }

    // Hỗ trợ cả mảng studentIds linh hoạt hoặc 2 ID riêng lẻ (tương thích ngược)
    let rawIds: number[] = [];
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      rawIds = studentIds.map(Number);
    } else {
      if (studentId1) rawIds.push(Number(studentId1));
      if (studentId2) rawIds.push(Number(studentId2));
    }

    // Lọc bỏ ID không hợp lệ và trùng lặp
    const uniqueIds = Array.from(new Set(rawIds.filter((id) => !isNaN(id) && id > 0)));

    if (uniqueIds.length === 0) {
      return NextResponse.json({ error: "Vui lòng chọn ít nhất 1 học sinh trực nhật" }, { status: 400 });
    }

    // Kiểm tra danh sách học sinh tồn tại trong cơ sở dữ liệu
    const selectedStudents = await prisma.student.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, hoTen: true, tenGoi: true, lop: true, to: true },
    });

    if (selectedStudents.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy thông tin các học sinh đã chọn" }, { status: 404 });
    }

    // 1. Xóa lịch cũ nếu được yêu cầu
    if (clearPrevious) {
      const deleteWhere: Record<string, unknown> = { tuan };
      const targetLop = lop && lop !== "ALL" ? lop : selectedStudents[0]?.lop;
      if (targetLop && targetLop !== "ALL") {
        deleteWhere.student = { lop: targetLop };
      }
      await prisma.dutyRoster.deleteMany({ where: deleteWhere });
    }

    // 2. Tạo bản ghi trực nhật cho tất cả các bạn được chọn từ Thứ 2 đến Thứ 6
    const newRecords: Array<{ tuan: string; thu: string; thuOrder: number; studentId: number }> = [];
    for (const thu of THU_NAMES) {
      const thuOrder = THU_ORDER[thu] || 2;
      for (const s of selectedStudents) {
        newRecords.push({
          tuan,
          thu,
          thuOrder,
          studentId: s.id,
        });
      }
    }

    await prisma.dutyRoster.createMany({
      data: newRecords,
    });

    // 3. Ghi audit log
    const namesList = selectedStudents.map((s) => s.hoTen).join(", ");
    await logActivity({
      userId,
      action: "CREATE",
      target: "DutyRoster",
      details: `Phân ${selectedStudents.length} bạn [${namesList}] trực nguyên tuần ${tuan} (Thứ 2 - Thứ 6)`,
    });

    return NextResponse.json({
      success: true,
      message: `Đã phân công ${selectedStudents.length} bạn (${namesList}) trực cả tuần ${tuan}`,
      count: newRecords.length,
      studentCount: selectedStudents.length,
    });
  } catch (error) {
    console.error("Lỗi phân học sinh trực cả tuần:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi phân công trực nhật" }, { status: 500 });
  }
}
