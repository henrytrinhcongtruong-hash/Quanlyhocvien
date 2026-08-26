// src/app/api/fees/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";

function parseMoneyAmount(val: string | number): number {
  if (typeof val === "number") return val;
  let str = String(val).trim().toLowerCase();
  if (str.endsWith("k")) {
    const num = parseFloat(str.replace("k", "").replace(/,/g, ".").trim());
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }
  if (str.endsWith("tr") || str.endsWith("m")) {
    const num = parseFloat(str.replace(/(tr|m)/g, "").replace(/,/g, ".").trim());
    return isNaN(num) ? 0 : Math.round(num * 1000000);
  }
  // Remove dots and commas used as thousand separators
  str = str.replace(/[.\s,đvnd]/g, "");
  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : num;
}

// POST /api/fees/batch - Tạo / Cập nhật đợt thu quỹ cho toàn bộ học sinh trong 1 lớp
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const isSuperAdmin = !!(session as { isSuperAdmin?: boolean }).isSuperAdmin;
    const { allowed } = isSuperAdmin ? { allowed: true } : await checkPermission(userId, "quy", "toan_quyen");
    if (!allowed) {
      return NextResponse.json({ error: "Chỉ Admin Tổng hoặc Giáo viên chủ nhiệm mới có quyền thiết lập mức thu quỹ" }, { status: 403 });
    }

    const body = await req.json();
    const { lop, kyThu, soTien, ghiChu } = body;

    const parsedAmount = parseMoneyAmount(soTien);

    if (!lop || !kyThu || parsedAmount <= 0) {
      return NextResponse.json({ error: "Vui lòng chọn lớp, kỳ thu và nhập số tiền hợp lệ (ví dụ: 50k, 50.000, 300000)" }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where: lop === "ALL" ? {} : { lop: lop.trim() },
    });

    if (students.length === 0) {
      return NextResponse.json({ error: `Không tìm thấy học sinh nào trong Lớp ${lop}` }, { status: 404 });
    }

    let count = 0;
    for (const s of students) {
      const existing = await prisma.feeCollection.findUnique({
        where: { studentId_kyThu: { studentId: s.id, kyThu } },
      });

      if (existing) {
        await prisma.feeCollection.update({
          where: { id: existing.id },
          data: {
            soTien: parsedAmount,
            ghiChu: ghiChu?.trim() || existing.ghiChu,
          },
        });
      } else {
        await prisma.feeCollection.create({
          data: {
            studentId: s.id,
            kyThu,
            soTien: parsedAmount,
            hinhThucDong: "Tiền Mặt",
            trangThai: "Chưa Đóng",
            ghiChu: ghiChu?.trim() || null,
          },
        });
      }
      count++;
    }

    return NextResponse.json({
      success: true,
      count,
      lop,
      kyThu,
      soTien: parsedAmount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi tạo đợt thu quỹ" }, { status: 500 });
  }
}
