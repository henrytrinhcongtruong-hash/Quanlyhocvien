// src/app/api/fees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/auditLogger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const kyThu = searchParams.get("kyThu");
    const lop = searchParams.get("lop");

    // Public: nếu có studentId, cho xem tình trạng cá nhân
    if (studentId) {
      const fees = await prisma.feeCollection.findMany({
        where: { studentId: Number(studentId) },
        orderBy: { kyThu: "asc" },
      });
      return NextResponse.json({ data: fees });
    }

    // Protected: danh sách toàn bộ cần quyền
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const isSuperAdmin = !!(
      (session as { isSuperAdmin?: boolean })?.isSuperAdmin ||
      (session?.user as { isSuperAdmin?: boolean })?.isSuperAdmin ||
      session?.user?.id === "1"
    );
    const userRole = (
      (session as { roleLabel?: string })?.roleLabel ||
      (session?.user as { roleLabel?: string })?.roleLabel ||
      ""
    ).toLowerCase();
    const isStudent = userRole.includes("học viên") || userRole.includes("student");

    if (!isSuperAdmin && !isStudent) {
      const userId = Number(session.user.id);
      const { allowed } = await checkPermission(userId, "quy", "chi_xem");
      if (!allowed) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const where: Record<string, unknown> = {};
    if (kyThu) where.kyThu = kyThu;
    if (lop && lop !== "ALL") {
      where.student = { lop };
    }

    const data = await prisma.feeCollection.findMany({
      where,
      include: {
        student: { select: { id: true, hoTen: true, tenGoi: true, to: true, lop: true } },
      },
      orderBy: [{ kyThu: "asc" }, { student: { to: "asc" } }, { student: { hoTen: "asc" } }],
    });

    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "quy", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const { studentId, kyThu, soTien, hinhThucDong, trangThai, ngayDong, ghiChu } = body;

    if (!studentId || !kyThu || !soTien) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const fee = await prisma.feeCollection.upsert({
      where: { studentId_kyThu: { studentId: Number(studentId), kyThu } },
      update: {
        soTien: Number(soTien),
        hinhThucDong: hinhThucDong || "Tiền Mặt",
        trangThai: trangThai || "Chưa Đóng",
        ngayDong: ngayDong ? new Date(ngayDong) : null,
        ghiChu: ghiChu?.trim() || null,
      },
      create: {
        studentId: Number(studentId),
        kyThu,
        soTien: Number(soTien),
        hinhThucDong: hinhThucDong || "Tiền Mặt",
        trangThai: trangThai || "Chưa Đóng",
        ngayDong: ngayDong ? new Date(ngayDong) : null,
        ghiChu: ghiChu?.trim() || null,
      },
    });

    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
      select: { hoTen: true, to: true, lop: true },
    });

    logActivity({
      userId,
      userName: session.user.name || (session.user as { username?: string })?.username || "Thành viên",
      userRole: (session.user as { roleLabel?: string })?.roleLabel || "Thủ quỹ",
      userLop: student?.lop || (session as { assignedLop?: string })?.assignedLop,
      action: "UPDATE",
      target: "FeeCollection",
      targetId: fee.id,
      details: `Cập nhật đóng quỹ học sinh "${student?.hoTen || studentId}" (${kyThu}): ${trangThai || "Chưa Đóng"} - ${Number(soTien).toLocaleString("vi-VN")} đ (${hinhThucDong || "Tiền Mặt"})${ghiChu ? ` - Ghi chú: ${ghiChu}` : ""}`,
      newValue: fee,
      req,
      status: "SUCCESS",
    });

    return NextResponse.json(fee, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
