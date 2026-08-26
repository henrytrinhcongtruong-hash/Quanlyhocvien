// src/app/api/exams/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const SAMPLE_EXAMS = [
  {
    monHoc: "Toán Học",
    tenKyThi: "Kiểm tra 1 tiết (45p) — Chương Hàm Số",
    loaiKyThi: "1 Tiết",
    ngayThi: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 ngày tới
    gioThi: "07:45",
    thoiLuong: 45,
    hinhThuc: "Trắc nghiệm",
    phongThi: "Phòng 201",
    giamThi: "Thầy Nguyễn Quốc Huy",
    phamViOnTap: "Chương 1: Khảo sát sự biến thiên và vẽ đồ thị hàm số (Bài 1 - 5)",
    lop: "12T2",
    ghiChu: "Chuẩn bị máy tính cầm tay fx-580VNX, bút chì 2B và compa",
  },
  {
    monHoc: "Vật Lý",
    tenKyThi: "Kiểm tra định kỳ — Dao Động Cơ Học",
    loaiKyThi: "1 Tiết",
    ngayThi: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 ngày tới
    gioThi: "08:45",
    thoiLuong: 45,
    hinhThuc: "Trắc nghiệm + Tự luận",
    phongThi: "Phòng 201",
    giamThi: "Cô Trần Thị Mai",
    phamViOnTap: "Chương 1 & 2: Dao động điều hòa, con lắc lò xo và con lắc đơn",
    lop: "12T2",
    ghiChu: "Không sử dụng tài liệu, làm bài trên giấy thi nhà trường",
  },
  {
    monHoc: "Tiếng Anh",
    tenKyThi: "Khảo sát Năng lực Tiếng Anh Đầu Năm",
    loaiKyThi: "Khảo sát",
    ngayThi: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày tới
    gioThi: "13:30",
    thoiLuong: 60,
    hinhThuc: "Trắc nghiệm",
    phongThi: "Hội trường B",
    giamThi: "Thầy John Smith & Cô Lan",
    phamViOnTap: "Reading Comprehension, Vocabulary Unit 1-3, Grammar Tenses",
    lop: "12T2",
    ghiChu: "Thi trắc nghiệm trên phiếu trả lời quang học",
  },
  {
    monHoc: "Ngữ Văn",
    tenKyThi: "Kiểm tra 15 phút — Tác phẩm Văn học",
    loaiKyThi: "15 Phút",
    ngayThi: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    gioThi: "09:30",
    thoiLuong: 15,
    hinhThuc: "Tự luận",
    phongThi: "Phòng 201",
    giamThi: "Cô Kim Liên",
    phamViOnTap: "Phân tích giá trị nhân đạo tác phẩm Vợ Nhặt - Kim Lân",
    lop: "12T2",
    ghiChu: "Viết đoạn văn nghị luận 200 chữ",
  },
  {
    monHoc: "Hóa Học",
    tenKyThi: "Thi Giữa Học Kỳ I",
    loaiKyThi: "Giữa Kỳ",
    ngayThi: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    gioThi: "07:30",
    thoiLuong: 50,
    hinhThuc: "Trắc nghiệm",
    phongThi: "Phòng 302",
    giamThi: "Thầy Lê Văn Hùng",
    phamViOnTap: "Chương Este - Lipit và Cacbohidrat",
    lop: "12T2",
    ghiChu: "Được đem bảng tuần hoàn hóa học không có ghi chú thêm",
  },
  {
    monHoc: "Toán Học",
    tenKyThi: "Kiểm tra 15 phút — Lượng giác 11",
    loaiKyThi: "15 Phút",
    ngayThi: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    gioThi: "08:00",
    thoiLuong: 15,
    hinhThuc: "Trắc nghiệm",
    phongThi: "Phòng 105",
    giamThi: "Thầy Phạm Văn Đức",
    phamViOnTap: "Phương trình lượng giác cơ bản",
    lop: "11AT3",
    ghiChu: "Làm trên giấy kiểm tra mẫu",
  },
  {
    monHoc: "Lịch Sử",
    tenKyThi: "Kiểm tra 1 tiết — Lịch sử Thế giới cận đại",
    loaiKyThi: "1 Tiết",
    ngayThi: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    gioThi: "10:15",
    thoiLuong: 45,
    hinhThuc: "Tự luận",
    phongThi: "Phòng 105",
    giamThi: "Cô Nguyễn Thị Lan",
    phamViOnTap: "Cách mạng tư sản Pháp và Phong trào công nhân quốc tế",
    lop: "11AT3",
    ghiChu: "Nêu rõ nguyên nhân, diễn biến và ý nghĩa lịch sử",
  },
];

// GET /api/exams?lop=12T2&type=all&mon=all
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop");
    const loaiKyThi = searchParams.get("type");
    const monHoc = searchParams.get("mon");

    // Auto-seed if empty
    const count = await prisma.examSchedule.count();
    if (count === 0) {
      await prisma.examSchedule.createMany({
        data: SAMPLE_EXAMS,
      });
    }

    const where: Record<string, unknown> = {};
    if (lop && lop !== "ALL") {
      where.OR = [{ lop }, { lop: "ALL" }];
    }
    if (loaiKyThi && loaiKyThi !== "ALL") {
      where.loaiKyThi = loaiKyThi;
    }
    if (monHoc && monHoc !== "ALL") {
      where.monHoc = monHoc;
    }

    const data = await prisma.examSchedule.findMany({
      where,
      orderBy: [{ ngayThi: "asc" }, { gioThi: "asc" }],
    });

    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error("Exams GET error fallback:", error);
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop");
    const filtered = lop && lop !== "ALL"
      ? SAMPLE_EXAMS.filter((e) => e.lop === lop || e.lop === "ALL")
      : SAMPLE_EXAMS;
    return NextResponse.json({ data: filtered, total: filtered.length });
  }
}

// POST /api/exams - Tạo lịch thi mới
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const {
      monHoc,
      tenKyThi,
      loaiKyThi = "1 Tiết",
      ngayThi,
      gioThi = "07:30",
      thoiLuong = 45,
      hinhThuc = "Trắc nghiệm",
      phongThi,
      giamThi,
      phamViOnTap,
      lop = "12T2",
      ghiChu,
    } = body;

    if (!monHoc?.trim() || !tenKyThi?.trim() || !ngayThi) {
      return NextResponse.json(
        { error: "Vui lòng điền đủ Tên môn học, Tên kỳ thi và Ngày thi" },
        { status: 400 }
      );
    }

    const exam = await prisma.examSchedule.create({
      data: {
        monHoc: monHoc.trim(),
        tenKyThi: tenKyThi.trim(),
        loaiKyThi,
        ngayThi: new Date(ngayThi),
        gioThi: gioThi.trim(),
        thoiLuong: Number(thoiLuong) || 45,
        hinhThuc,
        phongThi: phongThi?.trim() || null,
        giamThi: giamThi?.trim() || null,
        phamViOnTap: phamViOnTap?.trim() || null,
        lop: lop.trim(),
        ghiChu: ghiChu?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: exam });
  } catch (error) {
    console.error("Exam create error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ khi tạo lịch thi" }, { status: 500 });
  }
}
