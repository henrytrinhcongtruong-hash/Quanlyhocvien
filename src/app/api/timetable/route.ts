// src/app/api/timetable/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_TIMES: Record<number, string> = {
  1: "07:15 - 08:00",
  2: "08:05 - 08:50",
  3: "09:05 - 09:50",
  4: "09:55 - 10:40",
  5: "10:45 - 11:30",
  6: "13:30 - 14:15",
  7: "14:20 - 15:05",
  8: "15:15 - 16:00",
  9: "16:05 - 16:50",
  10: "16:55 - 17:40",
};

// Mẫu Thời khóa biểu chuẩn trường THPT
const SAMPLE_TIMETABLE_11AT3 = [
  // Thứ 2
  { thu: 2, tiet: 1, buoi: "Sáng", monHoc: "Chào Cờ", giaoVien: "BGH / GVCN", phongHoc: "Sân trường", ghiChu: "Tập trung đúng 07:00" },
  { thu: 2, tiet: 2, buoi: "Sáng", monHoc: "Toán Học", giaoVien: "Thầy Tuấn", phongHoc: "Phòng 201", ghiChu: "Hàm số lượng giác" },
  { thu: 2, tiet: 3, buoi: "Sáng", monHoc: "Toán Học", giaoVien: "Thầy Tuấn", phongHoc: "Phòng 201", ghiChu: "Luyện tập bài tập" },
  { thu: 2, tiet: 4, buoi: "Sáng", monHoc: "Vật Lý", giaoVien: "Thầy Hùng", phongHoc: "Phòng 201", ghiChu: "Dao động điều hòa" },
  { thu: 2, tiet: 5, buoi: "Sáng", monHoc: "Tiếng Anh", giaoVien: "Cô Mai", phongHoc: "Phòng 201", ghiChu: "Unit 1: Generation Gap" },

  // Thứ 3
  { thu: 3, tiet: 1, buoi: "Sáng", monHoc: "Ngữ Văn", giaoVien: "Cô Lan", phongHoc: "Phòng 201", ghiChu: "Đọc hiểu văn bản" },
  { thu: 3, tiet: 2, buoi: "Sáng", monHoc: "Ngữ Văn", giaoVien: "Cô Lan", phongHoc: "Phòng 201", ghiChu: "Viết đoạn văn nghị luận" },
  { thu: 3, tiet: 3, buoi: "Sáng", monHoc: "Hóa Học", giaoVien: "Cô Thảo", phongHoc: "Phòng 201", ghiChu: "Cân bằng hóa học" },
  { thu: 3, tiet: 4, buoi: "Sáng", monHoc: "Sinh Học", giaoVien: "Thầy Long", phongHoc: "Phòng 201", ghiChu: "Trao đổi chất ở tế bào" },
  { thu: 3, tiet: 5, buoi: "Sáng", monHoc: "Lịch Sử", giaoVien: "Thầy Đức", phongHoc: "Phòng 201", ghiChu: "Bài 2: Cách mạng tư sản" },

  // Thứ 4
  { thu: 4, tiet: 1, buoi: "Sáng", monHoc: "Toán Học", giaoVien: "Thầy Tuấn", phongHoc: "Phòng 201", ghiChu: "Hình học không gian" },
  { thu: 4, tiet: 2, buoi: "Sáng", monHoc: "Tiếng Anh", giaoVien: "Cô Mai", phongHoc: "Phòng 201", ghiChu: "Grammar & Speaking" },
  { thu: 4, tiet: 3, buoi: "Sáng", monHoc: "Tiếng Anh", giaoVien: "Cô Mai", phongHoc: "Phòng 201", ghiChu: "Listening Practice" },
  { thu: 4, tiet: 4, buoi: "Sáng", monHoc: "Tin Học", giaoVien: "Thầy Huy", phongHoc: "Phòng Máy 1", ghiChu: "Lập trình Python" },
  { thu: 4, tiet: 5, buoi: "Sáng", monHoc: "Tin Học", giaoVien: "Thầy Huy", phongHoc: "Phòng Máy 1", ghiChu: "Thực hành cấu trúc rẽ nhánh" },

  // Thứ 5
  { thu: 5, tiet: 1, buoi: "Sáng", monHoc: "Vật Lý", giaoVien: "Thầy Hùng", phongHoc: "Phòng 201", ghiChu: "Thực hành đo chu kỳ" },
  { thu: 5, tiet: 2, buoi: "Sáng", monHoc: "Hóa Học", giaoVien: "Cô Thảo", phongHoc: "Phòng 201", ghiChu: "Dung dịch & pH" },
  { thu: 5, tiet: 3, buoi: "Sáng", monHoc: "Địa Lý", giaoVien: "Cô Thu", phongHoc: "Phòng 201", ghiChu: "Bản đồ & Khí hậu" },
  { thu: 5, tiet: 4, buoi: "Sáng", monHoc: "GDCD", giaoVien: "Cô Hạnh", phongHoc: "Phòng 201", ghiChu: "Pháp luật & Đời sống" },
  { thu: 5, tiet: 5, buoi: "Sáng", monHoc: "Công Nghệ", giaoVien: "Thầy Sơn", phongHoc: "Phòng 201", ghiChu: "Bản vẽ kỹ thuật" },

  // Thứ 6
  { thu: 6, tiet: 1, buoi: "Sáng", monHoc: "Toán Học", giaoVien: "Thầy Tuấn", phongHoc: "Phòng 201", ghiChu: "Ôn tập chuyên đề" },
  { thu: 6, tiet: 2, buoi: "Sáng", monHoc: "Ngữ Văn", giaoVien: "Cô Lan", phongHoc: "Phòng 201", ghiChu: "Thực hành tiếng Việt" },
  { thu: 6, tiet: 3, buoi: "Sáng", monHoc: "Vật Lý", giaoVien: "Thầy Hùng", phongHoc: "Phòng 201", ghiChu: "Bài tập sóng cơ" },
  { thu: 6, tiet: 4, buoi: "Sáng", monHoc: "Thể Dục", giaoVien: "Thầy Cường", phongHoc: "Sân Thể Dục", ghiChu: "Chạy cự ly ngắn & Bóng chuyền" },
  { thu: 6, tiet: 5, buoi: "Sáng", monHoc: "Thể Dục", giaoVien: "Thầy Cường", phongHoc: "Sân Thể Dục", ghiChu: "Mang giày & nước uống" },

  // Thứ 7
  { thu: 7, tiet: 1, buoi: "Sáng", monHoc: "Tiếng Anh", giaoVien: "Cô Mai", phongHoc: "Phòng 201", ghiChu: "Kiểm tra 15 phút từ vựng" },
  { thu: 7, tiet: 2, buoi: "Sáng", monHoc: "Toán Học", giaoVien: "Thầy Tuấn", phongHoc: "Phòng 201", ghiChu: "Giải tích" },
  { thu: 7, tiet: 3, buoi: "Sáng", monHoc: "Hóa Học", giaoVien: "Cô Thảo", phongHoc: "Phòng 201", ghiChu: "Phản ứng trao đổi ion" },
  { thu: 7, tiet: 4, buoi: "Sáng", monHoc: "HĐ Trải Nghiệm", giaoVien: "GVCN", phongHoc: "Phòng 201", ghiChu: "Kỹ năng quản lý thời gian" },
  { thu: 7, tiet: 5, buoi: "Sáng", monHoc: "Sinh Hoạt Lớp", giaoVien: "GVCN", phongHoc: "Phòng 201", ghiChu: "Tổng kết tuần & Phổ biến kế hoạch" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop") || "11AT3";
    const hocKy = searchParams.get("hocKy") || "HK1";

    let timetable = await prisma.timetable.findMany({
      where: { lop, hocKy },
      orderBy: [{ thu: "asc" }, { tiet: "asc" }],
    });

    // Auto-seed sample timetable if database is empty for this class
    if (timetable.length === 0) {
      await prisma.timetable.createMany({
        data: SAMPLE_TIMETABLE_11AT3.map((item) => ({
          ...item,
          lop,
          hocKy,
          thoiGian: DEFAULT_TIMES[item.tiet] || "07:15 - 08:00",
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
    const { thu, tiet, buoi, thoiGian, monHoc, giaoVien, phongHoc, lop, hocKy, ghiChu } = body;

    if (!thu || !tiet || !monHoc?.trim()) {
      return NextResponse.json({ error: "Thiếu thông tin thứ, tiết hoặc môn học" }, { status: 400 });
    }

    const currentLop = lop?.trim() || "11AT3";
    const currentHocKy = hocKy?.trim() || "HK1";
    const currentThu = Number(thu);
    const currentTiet = Number(tiet);

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
        buoi: buoi || (currentTiet <= 5 ? "Sáng" : "Chiều"),
        thoiGian: thoiGian?.trim() || DEFAULT_TIMES[currentTiet] || null,
        monHoc: monHoc.trim(),
        giaoVien: giaoVien?.trim() || null,
        phongHoc: phongHoc?.trim() || null,
        ghiChu: ghiChu?.trim() || null,
      },
      create: {
        lop: currentLop,
        hocKy: currentHocKy,
        thu: currentThu,
        tiet: currentTiet,
        buoi: buoi || (currentTiet <= 5 ? "Sáng" : "Chiều"),
        thoiGian: thoiGian?.trim() || DEFAULT_TIMES[currentTiet] || null,
        monHoc: monHoc.trim(),
        giaoVien: giaoVien?.trim() || null,
        phongHoc: phongHoc?.trim() || null,
        ghiChu: ghiChu?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: period });
  } catch (error) {
    console.error("POST timetable error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ khi lưu thời khóa biểu" }, { status: 500 });
  }
}
