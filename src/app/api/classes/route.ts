// src/app/api/classes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      select: { lop: true },
      distinct: ["lop"],
      orderBy: { lop: "asc" },
    });

    const classes = students.map((s) => s.lop).filter(Boolean);
    if (classes.length === 0) {
      classes.push("11AT3");
    }

    return NextResponse.json({ data: classes });
  } catch (e) {
    console.error("Classes API error:", e);
    return NextResponse.json({ data: ["12T2", "11AT3"] });
  }
}

// DELETE /api/classes?lop=12T2 — Xóa toàn bộ 1 lớp và cascade toàn bộ dữ liệu liên quan
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop");
    if (!lop || lop === "ALL") {
      return NextResponse.json(
        { error: "Vui lòng chỉ định tên lớp cụ thể cần xóa" },
        { status: 400 }
      );
    }

    // 1. Tìm tất cả học sinh thuộc lớp cần xóa
    const students = await prisma.student.findMany({
      where: { lop },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);

    // 2. Xóa cascade toàn bộ dữ liệu liên quan (Thu quỹ, Điểm danh, Lịch trực, Phân công sự kiện, Học sinh)
    if (studentIds.length > 0) {
      await prisma.$transaction([
        prisma.feeCollection.deleteMany({ where: { studentId: { in: studentIds } } }),
        prisma.attendance.deleteMany({ where: { studentId: { in: studentIds } } }),
        prisma.dutyRoster.deleteMany({ where: { studentId: { in: studentIds } } }),
        prisma.eventMember.deleteMany({ where: { studentId: { in: studentIds } } }),
        prisma.student.deleteMany({ where: { id: { in: studentIds } } }),
      ]);
    } else {
      await prisma.student.deleteMany({ where: { lop } });
    }

    // 3. Cập nhật lại tài khoản người dùng nếu đang gán lớp đã xóa
    const remainingClasses = await prisma.student.findMany({
      select: { lop: true },
      distinct: ["lop"],
    });
    const fallbackClass = remainingClasses[0]?.lop || "11AT3";
    await prisma.user.updateMany({
      where: { assignedLop: lop },
      data: { assignedLop: fallbackClass },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa vĩnh viễn lớp ${lop} và toàn bộ ${students.length} học sinh cùng mọi thông tin liên quan.`,
    });
  } catch (error) {
    console.error("Delete class error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ khi xóa lớp" }, { status: 500 });
  }
}
