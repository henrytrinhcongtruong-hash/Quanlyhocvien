// src/app/api/attendance/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { formatDate } from "@/lib/format";

export async function GET() {
  try {
    const records = await prisma.attendance.findMany({
      include: {
        student: { select: { hoTen: true, to: true, lop: true } },
      },
      orderBy: [{ ngay: "desc" }, { student: { to: "asc" } }, { student: { hoTen: "asc" } }],
    });

    const rows = records.map((r, idx) => ({
      "STT": idx + 1,
      "HỌ VÀ TÊN": r.student.hoTen,
      "TỔ": r.student.to,
      "NGÀY": formatDate(r.ngay),
      "LOẠI": r.loai,
      "GHI CHÚ": r.ghiChu || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Math");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Disposition": `attachment; filename="Diem_danh_11AT3_${Date.now()}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi xuất file điểm danh" }, { status: 500 });
  }
}
