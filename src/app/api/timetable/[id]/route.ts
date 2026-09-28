// src/app/api/timetable/[id]/route.ts
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
    const { id } = await params;
    const periodId = Number(id);
    const body = await req.json();
    const { thu, tiet, buoi, thoiGian, monHoc, giaoVien, phongHoc, ghiChu } = body;

    const updateData: Record<string, unknown> = {};
    if (thu !== undefined) updateData.thu = Number(thu);
    if (tiet !== undefined) updateData.tiet = Number(tiet);
    if (buoi !== undefined) updateData.buoi = buoi;
    if (thoiGian !== undefined) updateData.thoiGian = thoiGian?.trim() || null;
    if (monHoc !== undefined) updateData.monHoc = monHoc.trim();
    if (giaoVien !== undefined) updateData.giaoVien = giaoVien?.trim() || null;
    if (phongHoc !== undefined) updateData.phongHoc = phongHoc?.trim() || null;
    if (ghiChu !== undefined) updateData.ghiChu = ghiChu?.trim() || null;

    const updated = await prisma.timetable.update({
      where: { id: periodId },
      data: updateData,
    });

    logActivity({
      userId: session?.user?.id ? Number(session.user.id) : null,
      userName: session?.user?.name || (session?.user as { username?: string })?.username || "Thành viên",
      userRole: (session?.user as { roleLabel?: string })?.roleLabel || "Thành viên",
      userLop: updated.lop,
      action: "UPDATE",
      target: "Timetable",
      targetId: updated.id,
      details: `Cập nhật tiết học Thứ ${updated.thu} - Tiết ${updated.tiet} môn "${updated.monHoc}" (Lớp ${updated.lop})`,
      newValue: updated,
      req,
      status: "SUCCESS",
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT timetable error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật tiết học" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    const periodId = Number(id);

    const targetPeriod = await prisma.timetable.findUnique({ where: { id: periodId } });
    if (!targetPeriod) {
      return NextResponse.json({ error: "Tiết học không tồn tại" }, { status: 404 });
    }

    await prisma.timetable.delete({ where: { id: periodId } });

    logActivity({
      userId: session?.user?.id ? Number(session.user.id) : null,
      userName: session?.user?.name || (session?.user as { username?: string })?.username || "Thành viên",
      userRole: (session?.user as { roleLabel?: string })?.roleLabel || "Thành viên",
      userLop: targetPeriod.lop,
      action: "DELETE",
      target: "Timetable",
      targetId: periodId,
      details: `Xóa tiết học Thứ ${targetPeriod.thu} - Tiết ${targetPeriod.tiet} môn "${targetPeriod.monHoc}" (Lớp ${targetPeriod.lop})`,
      previousValue: targetPeriod,
      req,
      status: "SUCCESS",
    });

    return NextResponse.json({ success: true, message: "Đã xóa tiết học thành công" });
  } catch (error) {
    console.error("DELETE timetable error:", error);
    return NextResponse.json({ error: "Lỗi xóa tiết học" }, { status: 500 });
  }
}

