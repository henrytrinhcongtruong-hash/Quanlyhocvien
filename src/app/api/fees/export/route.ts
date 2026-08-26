// src/app/api/fees/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { formatDate, formatVND } from "@/lib/format";

export async function GET() {
  try {
    const fees = await prisma.feeCollection.findMany({
      include: {
        student: { select: { hoTen: true, to: true, lop: true } },
      },
      orderBy: [{ kyThu: "asc" }, { student: { to: "asc" } }, { student: { hoTen: "asc" } }],
    });

    const expenses = await prisma.expense.findMany({
      orderBy: { ngayChi: "desc" },
    });

    // Sheet 1: Receipts (Thu)
    const receiptRows = fees.map((f, idx) => ({
      "STT": idx + 1,
      "HỌ VÀ TÊN": f.student.hoTen,
      "TỔ": f.student.to,
      "KỲ THU": f.kyThu,
      "SỐ TIỀN": f.soTien,
      "HÌNH THỨC": f.hinhThucDong,
      "TRẠNG THÁI": f.trangThai,
      "NGÀY ĐÓNG": formatDate(f.ngayDong),
      "GHI CHÚ": f.ghiChu || "",
    }));

    // Sheet 2: Expenses (Chi)
    const expenseRows = expenses.map((e, idx) => ({
      "STT": idx + 1,
      "DANH SÁCH CHI": e.danhSachChi,
      "HẠNG MỤC": e.hangMucChi,
      "SỐ LƯỢNG": e.soLuong,
      "ĐƠN GIÁ": e.donGia,
      "THÀNH TIỀN": e.thanhTien,
      "NGÀY CHI": formatDate(e.ngayChi),
      "GHI CHÚ": e.ghiChu || "",
    }));

    const wb = XLSX.utils.book_new();
    const wsReceipts = XLSX.utils.json_to_sheet(receiptRows);
    const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);

    XLSX.utils.book_append_sheet(wb, wsReceipts, "Receipts");
    XLSX.utils.book_append_sheet(wb, wsExpenses, "Expenses");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Disposition": `attachment; filename="Bao_cao_quy_lop_11AT3_${Date.now()}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi xuất báo cáo quỹ" }, { status: 500 });
  }
}
