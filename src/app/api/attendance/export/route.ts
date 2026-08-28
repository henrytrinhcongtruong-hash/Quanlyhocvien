// src/app/api/attendance/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { formatDate } from "@/lib/format";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const ngay = searchParams.get("ngay");
    const loai = searchParams.get("loai");

    const where: Record<string, unknown> = {};
    if (lop && lop !== "ALL") {
      where.student = { lop };
    }
    if (ngay) {
      where.ngay = new Date(ngay);
    } else if (from || to) {
      where.ngay = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    if (loai && loai !== "ALL") {
      where.loai = loai;
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { hoTen: true, to: true, lop: true } },
      },
      orderBy: [{ ngay: "desc" }, { student: { to: "asc" } }, { student: { hoTen: "asc" } }],
    });

    const rows = records.map((r, idx) => ({
      "STT": idx + 1,
      "HỌ VÀ TÊN": r.student.hoTen,
      "LỚP": r.student.lop,
      "TỔ": r.student.to,
      "NGÀY": formatDate(r.ngay),
      "LOẠI VI PHẠM": r.loai,
      "GHI CHÚ": r.ghiChu || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ViPham_DiemDanh");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Disposition": `attachment; filename="Bao_cao_vi_pham_${lop || "all"}_${Date.now()}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi xuất file điểm danh" }, { status: 500 });
  }
}
