// src/app/api/exams/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/auditLogger";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;
    const examId = Number(id);
    const body = await req.json();

    const updated = await prisma.examSchedule.update({
      where: { id: examId },
      data: {
        monHoc: body.monHoc?.trim(),
        tenKyThi: body.tenKyThi?.trim(),
        loaiKyThi: body.loaiKyThi,
        ngayThi: body.ngayThi ? new Date(body.ngayThi) : undefined,
        gioThi: body.gioThi?.trim(),
        thoiLuong: body.thoiLuong ? Number(body.thoiLuong) : undefined,
        hinhThuc: body.hinhThuc,
        phongThi: body.phongThi?.trim() || null,
        giamThi: body.giamThi?.trim() || null,
        phamViOnTap: body.phamViOnTap?.trim() || null,
        lop: body.lop?.trim(),
        ghiChu: body.ghiChu?.trim() || null,
      },
    });

    logActivity({
      userId: session.user?.id ? Number(session.user.id) : null,
      userName: session.user.name || (session.user as { username?: string })?.username || "Thành viên",
      userRole: (session.user as { roleLabel?: string })?.roleLabel || "Thành viên",
      userLop: updated.lop,
      action: "UPDATE",
      target: "ExamSchedule",
      targetId: updated.id,
      details: `Cập nhật lịch thi môn "${updated.monHoc}" (${updated.tenKyThi}) - Lớp ${updated.lop}`,
      newValue: updated,
      req,
      status: "SUCCESS",
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update exam error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật lịch thi" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;
    const examId = Number(id);

    const targetExam = await prisma.examSchedule.findUnique({ where: { id: examId } });
    if (!targetExam) {
      return NextResponse.json({ error: "Lịch thi không tồn tại" }, { status: 404 });
    }

    await prisma.examSchedule.delete({
      where: { id: examId },
    });

    logActivity({
      userId: session.user?.id ? Number(session.user.id) : null,
      userName: session.user.name || (session.user as { username?: string })?.username || "Thành viên",
      userRole: (session.user as { roleLabel?: string })?.roleLabel || "Thành viên",
      userLop: targetExam.lop,
      action: "DELETE",
      target: "ExamSchedule",
      targetId: examId,
      details: `Xóa lịch thi môn "${targetExam.monHoc}" (${targetExam.tenKyThi}) - Lớp ${targetExam.lop}`,
      previousValue: targetExam,
      req,
      status: "SUCCESS",
    });

    return NextResponse.json({ success: true, message: "Đã xóa lịch thi thành công" });
  } catch (error) {
    console.error("Delete exam error:", error);
    return NextResponse.json({ error: "Lỗi khi xóa lịch thi" }, { status: 500 });
  }
}

