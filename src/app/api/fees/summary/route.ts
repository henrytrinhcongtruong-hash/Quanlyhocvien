// src/app/api/fees/summary/route.ts
// Public endpoint - tổng quan quỹ lớp (hỗ trợ lọc theo lớp)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop");

    const feeWhere = lop && lop !== "ALL" ? { student: { lop } } : {};
    const studentWhere = lop && lop !== "ALL" ? { lop } : {};

    const [fees, expenses, totalStudents] = await Promise.all([
      prisma.feeCollection.findMany({
        where: feeWhere,
        select: { soTien: true, trangThai: true, kyThu: true },
      }),
      prisma.expense.findMany({
        select: { thanhTien: true, hangMucChi: true },
      }),
      prisma.student.count({ where: studentWhere }),
    ]);

    const tongThu = fees
      .filter((f) => f.trangThai === "Đã Đóng")
      .reduce((sum, f) => sum + f.soTien, 0);

    const tongChi = expenses.reduce((sum, e) => sum + e.thanhTien, 0);

    // Count unique students đã đóng HK1
    const feesByStudent = await prisma.feeCollection.groupBy({
      by: ["studentId"],
      where: {
        kyThu: "HK1",
        trangThai: "Đã Đóng",
        ...(lop && lop !== "ALL" ? { student: { lop } } : {}),
      },
      _count: true,
    });

    // Chi theo hạng mục
    const chiTheoHangMuc = expenses.reduce(
      (acc: Record<string, number>, e) => {
        acc[e.hangMucChi] = (acc[e.hangMucChi] || 0) + e.thanhTien;
        return acc;
      },
      {}
    );

    const chiTheoHangMucArr = Object.entries(chiTheoHangMuc)
      .map(([hangMucChi, total]) => ({ hangMucChi, total }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      tongThu,
      tongChi,
      conLai: tongThu - tongChi,
      soHSDaDong: feesByStudent.length,
      tongHS: totalStudents,
      chiTheoHangMuc: chiTheoHangMucArr,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
