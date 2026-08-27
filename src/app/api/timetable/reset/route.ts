// src/app/api/timetable/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_TIMETABLE_EVENING = [
  // Thứ 2
  { thu: 2, tiet: 1, monHoc: "Chào Cờ", thoiGian: "18:00 - 18:40", ghiChu: "Chào cờ đầu tuần & HĐTN2" },
  { thu: 2, tiet: 2, monHoc: "Hóa học", thoiGian: "18:40 - 19:20", ghiChu: "" },
  { thu: 2, tiet: 3, monHoc: "Hóa học", thoiGian: "19:35 - 20:15", ghiChu: "" },
  { thu: 2, tiet: 4, monHoc: "HĐTN3", thoiGian: "20:15 - 20:55", ghiChu: "Hoạt động trải nghiệm" },
  { thu: 2, tiet: 5, monHoc: "Lịch sử", thoiGian: "20:55 - 21:35", ghiChu: "" },

  // Thứ 3
  { thu: 3, tiet: 1, monHoc: "Ngữ văn", thoiGian: "18:00 - 18:40", ghiChu: "" },
  { thu: 3, tiet: 2, monHoc: "Ngữ văn", thoiGian: "18:40 - 19:20", ghiChu: "" },
  { thu: 3, tiet: 3, monHoc: "Tin học", thoiGian: "19:35 - 20:15", ghiChu: "" },
  { thu: 3, tiet: 4, monHoc: "Toán", thoiGian: "20:15 - 20:55", ghiChu: "" },
  { thu: 3, tiet: 5, monHoc: "Toán", thoiGian: "20:55 - 21:35", ghiChu: "" },

  // Thứ 4
  { thu: 4, tiet: 1, monHoc: "Sinh học", thoiGian: "18:00 - 18:40", ghiChu: "" },
  { thu: 4, tiet: 2, monHoc: "Sinh học", thoiGian: "18:40 - 19:20", ghiChu: "" },
  { thu: 4, tiet: 3, monHoc: "Tin học", thoiGian: "19:35 - 20:15", ghiChu: "" },
  { thu: 4, tiet: 4, monHoc: "Ngoại ngữ", thoiGian: "20:15 - 20:55", ghiChu: "" },
  { thu: 4, tiet: 5, monHoc: "Ngoại ngữ", thoiGian: "20:55 - 21:35", ghiChu: "" },

  // Thứ 5
  { thu: 5, tiet: 1, monHoc: "Ngữ văn", thoiGian: "18:00 - 18:40", ghiChu: "" },
  { thu: 5, tiet: 2, monHoc: "Ngữ văn", thoiGian: "18:40 - 19:20", ghiChu: "" },
  { thu: 5, tiet: 3, monHoc: "Toán", thoiGian: "19:35 - 20:15", ghiChu: "" },
  { thu: 5, tiet: 4, monHoc: "Toán", thoiGian: "20:15 - 20:55", ghiChu: "" },

  // Thứ 6
  { thu: 6, tiet: 1, monHoc: "Địa lý", thoiGian: "18:00 - 18:40", ghiChu: "" },
  { thu: 6, tiet: 2, monHoc: "Địa lý", thoiGian: "18:40 - 19:20", ghiChu: "" },
  { thu: 6, tiet: 3, monHoc: "Hóa học", thoiGian: "19:35 - 20:15", ghiChu: "" },
  { thu: 6, tiet: 4, monHoc: "Ngoại ngữ", thoiGian: "20:15 - 20:55", ghiChu: "" },
];

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop") || "12T2";
    const hocKy = searchParams.get("hocKy") || "HK1";

    await prisma.timetable.deleteMany({
      where: { lop, hocKy },
    });

    await prisma.timetable.createMany({
      data: DEFAULT_TIMETABLE_EVENING.map((item) => ({
        thu: item.thu,
        tiet: item.tiet,
        buoi: "Tối",
        thoiGian: item.thoiGian,
        monHoc: item.monHoc,
        giaoVien: null,
        phongHoc: null,
        lop,
        hocKy,
        ghiChu: item.ghiChu || null,
      })),
    });

    return NextResponse.json({ success: true, message: `Đã nạp thời khóa biểu buổi tối chuẩn cho lớp ${lop}` });
  } catch (error) {
    console.error("Reset timetable error:", error);
    return NextResponse.json({ error: "Lỗi đặt lại thời khóa biểu" }, { status: 500 });
  }
}
