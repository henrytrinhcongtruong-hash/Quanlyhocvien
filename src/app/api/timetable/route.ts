// src/app/api/timetable/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Khung giờ học Buổi Tối chuẩn Trung tâm GDNN - GDTX TP. Thủ Đức (Bắt đầu 18:00)
export const EVENING_TIMES: Record<number, string> = {
  1: "18:00 - 18:40",
  2: "18:40 - 19:20",
  3: "19:35 - 20:15",
  4: "20:15 - 20:55",
  5: "20:55 - 21:35",
};

export const STANDARD_SUBJECTS = [
  "Chào Cờ",
  "Toán",
  "Ngữ văn",
  "Ngoại ngữ",
  "Hóa học",
  "Sinh học",
  "Lịch sử",
  "Địa lý",
  "Tin học",
  "HĐTN",
  "HĐTN2",
  "HĐTN3",
];

// Thời khóa biểu chuẩn Buổi Tối chính xác 100% theo kế hoạch của lớp
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop") || "12T2";
    const hocKy = searchParams.get("hocKy") || "HK1";

    let timetable = await prisma.timetable.findMany({
      where: { lop, hocKy },
      orderBy: [{ thu: "asc" }, { tiet: "asc" }],
    });

    // Auto-seed or reset with the exact evening schedule if empty or if requested
    if (timetable.length === 0) {
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

      timetable = await prisma.timetable.findMany({
        where: { lop, hocKy },
        orderBy: [{ thu: "asc" }, { tiet: "asc" }],
      });
    }

    return NextResponse.json({ success: true, data: timetable, lop, hocKy });
  } catch (error) {
    console.error("GET timetable error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ khi tải thời khóa biểu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { thu, tiet, monHoc, giaoVien, lop, hocKy, ghiChu } = body;

    if (!thu || !tiet) {
      return NextResponse.json({ error: "Thiếu thông tin thứ hoặc tiết" }, { status: 400 });
    }

    const currentLop = lop?.trim() || "12T2";
    const currentHocKy = hocKy?.trim() || "HK1";
    const currentThu = Number(thu);
    const currentTiet = Number(tiet);

    // If monHoc is empty or "NONE", delete this period
    if (!monHoc || monHoc === "NONE" || monHoc.trim() === "") {
      await prisma.timetable.deleteMany({
        where: {
          lop: currentLop,
          hocKy: currentHocKy,
          thu: currentThu,
          tiet: currentTiet,
        },
      });
      return NextResponse.json({ success: true, message: "Đã để trống tiết học" });
    }

    const thoiGian = EVENING_TIMES[currentTiet] || "18:00 - 18:40";

    const period = await prisma.timetable.upsert({
      where: {
        lop_hocKy_thu_tiet: {
          lop: currentLop,
          hocKy: currentHocKy,
          thu: currentThu,
          tiet: currentTiet,
        },
      },
      update: {
        buoi: "Tối",
        thoiGian,
        monHoc: monHoc.trim(),
        giaoVien: giaoVien?.trim() || null,
        phongHoc: null,
        ghiChu: ghiChu?.trim() || null,
      },
      create: {
        lop: currentLop,
        hocKy: currentHocKy,
        thu: currentThu,
        tiet: currentTiet,
        buoi: "Tối",
        thoiGian,
        monHoc: monHoc.trim(),
        giaoVien: giaoVien?.trim() || null,
        phongHoc: null,
        ghiChu: ghiChu?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: period });
  } catch (error) {
    console.error("POST timetable error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ khi lưu thời khóa biểu" }, { status: 500 });
  }
}
