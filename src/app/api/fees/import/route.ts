// src/app/api/fees/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { parseFeesFromExcel, parseExpensesFromExcel } from "@/lib/excel";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userId = Number(session.user.id);
    const { allowed } = await checkPermission(userId, "quy", "toan_quyen");
    if (!allowed) return NextResponse.json({ error: "Không có quyền import quỹ" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "Không tìm thấy file" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const fees = parseFeesFromExcel(buffer);
    const expenses = parseExpensesFromExcel(buffer);

    let feeCount = 0;
    for (const f of fees) {
      const student = await prisma.student.findFirst({
        where: { hoTen: f.studentHoTen },
      });
      if (student) {
        await prisma.feeCollection.upsert({
          where: {
            studentId_kyThu: {
              studentId: student.id,
              kyThu: f.kyThu,
            },
          },
          update: {
            soTien: f.soTien,
            hinhThucDong: f.hinhThucDong || "Tiền Mặt",
            trangThai: f.trangThai || "Chưa Đóng",
            ngayDong: f.ngayDong,
          },
          create: {
            studentId: student.id,
            kyThu: f.kyThu,
            soTien: f.soTien,
            hinhThucDong: f.hinhThucDong || "Tiền Mặt",
            trangThai: f.trangThai || "Chưa Đóng",
            ngayDong: f.ngayDong,
          },
        });
        feeCount++;
      }
    }

    let expenseCount = 0;
    for (const exp of expenses) {
      if (exp.danhSachChi && exp.thanhTien > 0) {
        await prisma.expense.create({
          data: {
            danhSachChi: exp.danhSachChi,
            hangMucChi: exp.hangMucChi || "Khác",
            soLuong: exp.soLuong || 1,
            donGia: exp.donGia || exp.thanhTien,
            thanhTien: exp.thanhTien,
            ngayChi: exp.ngayChi || new Date(),
          },
        });
        expenseCount++;
      }
    }

    return NextResponse.json({ feeCount, expenseCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi import quỹ từ Excel" }, { status: 500 });
  }
}
