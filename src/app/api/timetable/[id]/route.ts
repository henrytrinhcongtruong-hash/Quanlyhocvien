// src/app/api/timetable/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params;
    const periodId = Number(id);

    await prisma.timetable.delete({ where: { id: periodId } });

    return NextResponse.json({ success: true, message: "Đã xóa tiết học thành công" });
  } catch (error) {
    console.error("DELETE timetable error:", error);
    return NextResponse.json({ error: "Lỗi xóa tiết học" }, { status: 500 });
  }
}
