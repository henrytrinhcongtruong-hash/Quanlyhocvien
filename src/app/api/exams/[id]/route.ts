// src/app/api/exams/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

    await prisma.examSchedule.delete({
      where: { id: examId },
    });

    return NextResponse.json({ success: true, message: "Đã xóa lịch thi thành công" });
  } catch (error) {
    console.error("Delete exam error:", error);
    return NextResponse.json({ error: "Lỗi khi xóa lịch thi" }, { status: 500 });
  }
}
