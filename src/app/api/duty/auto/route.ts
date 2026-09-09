// src/app/api/duty/auto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/auditLogger";
import { calculateDutyDistribution } from "@/lib/dutyRules";

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
    const { tuan, lop, mode, toNum, clearPrevious = true, slotsPerDay = 4 } = body;

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

    // 3. Truy vết lịch sử trực nhật các tuần trước (loại trừ tuần hiện tại) để thực hiện cơ chế BÙ CA CÔNG BẰNG
    const priorDuties = await prisma.dutyRoster.findMany({
      where: {
        tuan: { not: tuan },
        ...(lop !== "ALL" ? { student: { lop } } : {}),
      },
      select: { studentId: true },
    });

    const historyCountMap: Record<number, number> = {};
    for (const d of priorDuties) {
      historyCountMap[d.studentId] = (historyCountMap[d.studentId] || 0) + 1;
    }

    // 4. Phân bổ công bằng, loại trừ miễn trực và tự động bù ca thông minh
    // Cố định đúng 4 bạn/ngày theo phương án xoay tua vòng tròn
    const result = calculateDutyDistribution(
      students,
      undefined,
      Number(slotsPerDay) || 4,
      historyCountMap
    );

    if (result.eligibleStudents.length === 0) {
      return NextResponse.json(
        {
          error:
            "Không có học sinh nào cần phân công trực nhật (Tất cả thành viên đều thuộc diện miễn trực nhật)",
        },
        { status: 400 }
      );
    }

    // 4. Lưu phân công vào cơ sở dữ liệu
    for (const item of result.assignments) {
      await prisma.dutyRoster.create({
        data: {
          tuan,
          thu: item.thu,
          thuOrder: item.thuOrder,
          studentId: item.student.id,
        },
      });
    }

    // 5. Ghi nhật ký hoạt động (Audit Log)
    const exemptedNames = result.exemptedStudents.map((e) => `${e.hoTen} (${e.reason})`).join(", ");
    logActivity({
      userId,
      userName: session.user.name || (session.user as { username?: string })?.username || "Admin",
      userRole: (session.user as { roleLabel?: string })?.roleLabel || "Admin",
      userLop: lop !== "ALL" ? lop : null,
      action: "CREATE",
      target: "DutyRoster",
      details: `Tự động phân công trực nhật Tuần ${tuan} (Lớp ${lop}${
        mode === "to" ? `, Tổ ${toNum}` : ", Cả lớp"
      }): Phân bổ đều ${result.eligibleStudents.length} học sinh cho Thứ 2 → Thứ 6.${
        result.exemptedStudents.length > 0 ? ` Đã miễn trực cho ${result.exemptedStudents.length} bạn: ${exemptedNames}` : ""
      }`,
      req,
      status: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      count: result.assignments.length,
      tuan,
      lop,
      mode,
      toNum: mode === "to" ? Number(toNum) : undefined,
      assignedCount: result.eligibleStudents.length,
      exemptedCount: result.exemptedStudents.length,
      exempted: result.exemptedStudents.map((s) => ({
        id: s.id,
        hoTen: s.hoTen,
        reason: s.reason,
      })),
      dailyCounts: result.dailyCounts,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi tự động xếp lịch trực nhật" }, { status: 500 });
  }
}

