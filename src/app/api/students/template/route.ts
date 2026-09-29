// src/app/api/students/template/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const sampleRows = [
      {
        "STT": 1,
        "LỚP": "10A1",
        "HỌ VÀ TÊN": "Nguyễn Văn An",
        "TÊN": "An",
        "NGÀY SINH": "15/08/2008",
        "GIỚI TÍNH": "Nam",
        "TỔ": 1,
        "GHI CHÚ": "Lớp trưởng",
      },
      {
        "STT": 2,
        "LỚP": "10A1",
        "HỌ VÀ TÊN": "Trần Thị Bình",
        "TÊN": "Bình",
        "NGÀY SINH": "20/09/2008",
        "GIỚI TÍNH": "Nữ",
        "TỔ": 2,
        "GHI CHÚ": "Bí thư",
      },
      {
        "STT": 3,
        "LỚP": "10A1",
        "HỌ VÀ TÊN": "Lê Hoàng Cường",
        "TÊN": "Cường",
        "NGÀY SINH": "01/01/2008",
        "GIỚI TÍNH": "Nam",
        "TỔ": 3,
        "GHI CHÚ": "",
      },
      {
        "STT": 4,
        "LỚP": "10A1",
        "HỌ VÀ TÊN": "Phạm Quỳnh Dung",
        "TÊN": "Dung",
        "NGÀY SINH": "12/12/2008",
        "GIỚI TÍNH": "Nữ",
        "TỔ": 4,
        "GHI CHÚ": "",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);

    // Set column widths
    ws["!cols"] = [
      { wch: 6 },  // STT
      { wch: 10 }, // LỚP
      { wch: 26 }, // HỌ VÀ TÊN
      { wch: 12 }, // TÊN
      { wch: 14 }, // NGÀY SINH
      { wch: 12 }, // GIỚI TÍNH
      { wch: 8 },  // TỔ
      { wch: 20 }, // GHI CHÚ
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách học sinh");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Disposition": 'attachment; filename="Mau_import_danh_sach_hoc_sinh.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (e) {
    console.error("Template download error:", e);
    return NextResponse.json({ error: "Lỗi tải file mẫu" }, { status: 500 });
  }
}
