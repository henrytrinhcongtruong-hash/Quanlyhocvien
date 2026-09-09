// src/app/api/duty/penalties/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/auditLogger";

// GET /api/duty/penalties - Lấy danh sách vi phạm & phạt quét lớp
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop");
    const trangThai = searchParams.get("trangThai");
    const studentId = searchParams.get("studentId");

    const where: Record<string, unknown> = {};
    if (lop && lop !== "ALL") {
      where.student = { lop };
    }
    if (trangThai && trangThai !== "ALL") {
      where.trangThai = trangThai;
    }
    if (studentId) {
      where.studentId = Number(studentId);
    }

    const penalties = await prisma.dutyPenalty.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            hoTen: true,
            tenGoi: true,
            to: true,
            lop: true,
            avatar: true,
            gioiTinh: true,
          },
        },
      },
      orderBy: { ngay: "desc" },
    });

    // Tính tổng số lần vi phạm của từng học sinh (để phục vụ cảnh báo >= 3 lần)
    const countWhere: Record<string, unknown> = {};
    if (lop && lop !== "ALL") {
      countWhere.student = { lop };
    }
    const allPenalties = await prisma.dutyPenalty.findMany({
      where: countWhere,
      select: { studentId: true },
    });

    const violationCounts: Record<number, number> = {};
    for (const p of allPenalties) {
      violationCounts[p.studentId] = (violationCounts[p.studentId] || 0) + 1;
    }

    return NextResponse.json({
      penalties,
      violationCounts,
      total: penalties.length,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách vi phạm:", error);
    return NextResponse.json({ error: "Lỗi tải danh sách vi phạm" }, { status: 500 });
  }
}

// POST /api/duty/penalties - Thêm mới một bản ghi vi phạm kỷ luật
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
      return NextResponse.json({ error: "Không có quyền ghi nhận vi phạm" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, lyDo, ngay, ghiChu, lop } = body;

    if (!studentId || !lyDo) {
      return NextResponse.json({ error: "Vui lòng chọn học sinh và lý do vi phạm" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
      select: { id: true, hoTen: true, lop: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 });
    }

    const penaltyDate = ngay ? new Date(ngay) : new Date();

    const newPenalty = await prisma.dutyPenalty.create({
      data: {
        studentId: Number(studentId),
        lop: lop || student.lop,
        lyDo: String(lyDo).trim(),
        ngay: penaltyDate,
        ghiChu: ghiChu ? String(ghiChu).trim() : null,
        trangThai: "Chưa quét",
      },
      include: {
        student: {
          select: {
            id: true,
            hoTen: true,
            tenGoi: true,
            to: true,
            lop: true,
            avatar: true,
            gioiTinh: true,
          },
        },
      },
    });

    // Đếm tổng số lần vi phạm hiện tại của bạn này
    const currentViolations = await prisma.dutyPenalty.count({
      where: { studentId: Number(studentId) },
    });

    await logActivity({
      userId,
      action: "CREATE",
      target: "DutyPenalty",
      details: `Ghi nhận vi phạm phạt quét lớp: ${student.hoTen} (${student.lop}) - Lý do: ${lyDo} (Lần thứ ${currentViolations})`,
    });

    return NextResponse.json(
      {
        penalty: newPenalty,
        violationCount: currentViolations,
        isRepeatedWarning: currentViolations >= 3,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lỗi thêm bản ghi vi phạm:", error);
    return NextResponse.json({ error: "Lỗi ghi nhận vi phạm" }, { status: 500 });
  }
}

// PUT /api/duty/penalties - Cập nhật trạng thái vi phạm ("Chưa quét" ⇄ "Đã hoàn thành") hoặc lý do/ghi chú
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const isSuperAdmin = !!(session as { isSuperAdmin?: boolean }).isSuperAdmin;
    const { allowed } = isSuperAdmin ? { allowed: true } : await checkPermission(userId, "lich_truc", "toan_quyen");
    if (!allowed) {
      return NextResponse.json({ error: "Không có quyền sửa bản ghi vi phạm" }, { status: 403 });
    }

    const body = await req.json();
    const { id, trangThai, ghiChu, lyDo, ngay } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu mã bản ghi vi phạm" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (trangThai !== undefined) updateData.trangThai = trangThai;
    if (ghiChu !== undefined) updateData.ghiChu = ghiChu;
    if (lyDo !== undefined) updateData.lyDo = lyDo;
    if (ngay) updateData.ngay = new Date(ngay);

    const updated = await prisma.dutyPenalty.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            hoTen: true,
            tenGoi: true,
            to: true,
            lop: true,
            avatar: true,
          },
        },
      },
    });

    await logActivity({
      userId,
      action: "UPDATE",
      target: "DutyPenalty",
      details: `Cập nhật trạng thái vi phạm ID ${id}: ${updated.student.hoTen} -> ${trangThai || "Cập nhật thông tin"}`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Lỗi cập nhật vi phạm:", error);
    return NextResponse.json({ error: "Lỗi cập nhật vi phạm" }, { status: 500 });
  }
}

// DELETE /api/duty/penalties - Xóa bản ghi vi phạm
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const isSuperAdmin = !!(session as { isSuperAdmin?: boolean }).isSuperAdmin;
    const { allowed } = isSuperAdmin ? { allowed: true } : await checkPermission(userId, "lich_truc", "toan_quyen");
    if (!allowed) {
      return NextResponse.json({ error: "Không có quyền xóa bản ghi vi phạm" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID bản ghi cần xóa" }, { status: 400 });
    }

    const deleted = await prisma.dutyPenalty.delete({
      where: { id: Number(id) },
      include: { student: { select: { hoTen: true } } },
    });

    await logActivity({
      userId,
      action: "DELETE",
      target: "DutyPenalty",
      details: `Xóa bản ghi vi phạm ID ${id} của học sinh ${deleted.student.hoTen}`,
    });

    return NextResponse.json({ success: true, message: "Đã xóa bản ghi vi phạm" });
  } catch (error) {
    console.error("Lỗi xóa vi phạm:", error);
    return NextResponse.json({ error: "Lỗi xóa bản ghi vi phạm" }, { status: 500 });
  }
}
