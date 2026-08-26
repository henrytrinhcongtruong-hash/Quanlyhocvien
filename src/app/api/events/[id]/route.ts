// src/app/api/events/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PUT /api/events/[id] - Cập nhật sự kiện
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
    const eventId = Number(id);
    const body = await req.json();
    const { tenSuKien, hangMuc, chiTiet, deadline, ketHoachTrienKhai, trangThai, members } = body;

    if (!tenSuKien?.trim()) {
      return NextResponse.json({ error: "Tên sự kiện không được để trống" }, { status: 400 });
    }

    // 1. Cập nhật thông tin sự kiện
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        tenSuKien: tenSuKien.trim(),
        hangMuc: hangMuc?.trim() || null,
        chiTiet: chiTiet?.trim() || null,
        deadline: deadline ? new Date(deadline) : null,
        ketHoachTrienKhai: ketHoachTrienKhai?.trim() || null,
        trangThai: trangThai || "Sắp diễn ra",
      },
    });

    // 2. Cập nhật thành viên nếu có truyền lên
    if (Array.isArray(members)) {
      await prisma.eventMember.deleteMany({ where: { eventId } });
      if (members.length > 0) {
        await prisma.eventMember.createMany({
          data: members.map((m: { studentId: number; vaiTro: string }) => ({
            eventId,
            studentId: Number(m.studentId),
            vaiTro: m.vaiTro || "Lead",
          })),
        });
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update event error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật sự kiện" }, { status: 500 });
  }
}

// DELETE /api/events/[id] - Xóa sự kiện
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
    const eventId = Number(id);

    // Xóa thành viên sự kiện trước rồi xóa sự kiện
    await prisma.eventMember.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });

    return NextResponse.json({ success: true, message: "Đã xóa sự kiện thành công" });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json({ error: "Lỗi khi xóa sự kiện" }, { status: 500 });
  }
}
