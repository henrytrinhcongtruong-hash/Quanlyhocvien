// src/app/api/students/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { formatDate } from "@/lib/format";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop");
    const where = lop && lop !== "ALL" ? { lop } : {};

    const students = await prisma.student.findMany({
      where,
      orderBy: [{ lop: "asc" }, { to: "asc" }, { hoTen: "asc" }],
    });

    const rows = students.map((s, idx) => ({
      "STT": idx + 1,
      "LỚP": s.lop,
      "HỌ VÀ TÊN": s.hoTen,
      "TÊN": s.tenGoi || "",
      "NGÀY SINH": formatDate(s.ngaySinh),
      "GIỚI TÍNH": s.gioiTinh,
      "TỔ": s.to,
      "GHI CHÚ": s.ghiChu || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const sheetTitle = lop && lop !== "ALL" ? `Lớp ${lop}` : "Danh sách học sinh";
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const classTag = lop && lop !== "ALL" ? lop : "toan_truong";

    return new NextResponse(buf, {
      headers: {
        "Content-Disposition": `attachment; filename="Danh_sach_lop_${classTag}_${Date.now()}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi xuất file" }, { status: 500 });
  }
}
