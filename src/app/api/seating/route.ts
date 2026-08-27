// src/app/api/seating/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface SeatSlotData {
  id: string; // "slot-r1-c1"
  row: number; // 1-7
  col: number; // 1-8 (1-4: Dãy Trái, 5-8: Dãy Phải)
  block: "left" | "right"; // Dãy Trái hay Dãy Phải
  studentId?: number | null;
  studentName?: string | null;
  studentPhoto?: string | null;
  gender?: string | null;
}

// 56 slots mẫu chính xác theo ảnh sơ đồ lớp học mẫu
function generateInitialSlots(): SeatSlotData[] {
  // Dữ liệu mẫu học sinh từ ảnh
  const leftGrid: (string | null)[][] = [
    ["PHAN GIA KHANG", null, "HOÀNG BẢO NAM", "NGUYỄN MINH ĐỨC"],
    ["PHẠM MINH HIỂN", "LÊ NGUYỄN TRƯỜNG AN", null, "N VĨNH THIÊN PHÚC"],
    ["PHẠM THIÊN HƯƠNG", null, null, "HOÀNG VIỆT DANH"],
    ["TRẦN HOÀNG QUÂN", "TRỊNH CÔNG TRƯỜNG", "P PHƯƠNG UYÊN", "N NGỌC YẾN NHI"],
    ["LÊ NGUYỄN HOÀNG ANH", "P.N QUỲNH ANH", "HÀ THỊ DIỄM MY", "LÊ ĐỨC TRỌNG"],
    ["TRẦN NGỌC NHIÊN", "N HOÀNG TẤN HÀO", "N.P XUYÊN PHƯƠNG", "MÃ QUỐC DUY"],
    ["NGUYỄN THANH TÚ", null, null, "NGUYỄN TUẤN ANH"],
  ];

  const rightGrid: (string | null)[][] = [
    ["NGUYỄN TẤN SANG", "LƯU NGỌC QUỲNH HOA", "PHAN GIA BẢO", "N NGỌC ANH PHƯƠNG"],
    ["LÊ THỊ HOÀI THẢO", null, "PHAN ANH THƯ", "N NGỌC ANH THƯ"],
    ["VŨ ĐỨC HUY", null, "VŨ NGỌC MINH TUYẾT", "LÊ DƯƠNG ÂN"],
    ["NGUYỄN XUÂN HỢP", "LÂM VĂN TUẤN", "TRẦN PHONG", "TÔ VỸ"],
    ["L.C CHÁNH THÔNG", "ĐẶNG THỊ MỸ HÒA", "N THỊ KHÁNH NGỌC", "H THANH QUANG"],
    ["NGUYỄN THỊ HỒNG ANH", "TRẦN BẢO THANH", "NGUYỄN THỊ CÁT TUYỀN", "PHÙNG BẢO TRÂN"],
    [null, null, null, null], // Hàng 7 Dãy Phải dành cho Bàn Giáo Viên
  ];

  const slots: SeatSlotData[] = [];

  for (let r = 1; r <= 7; r++) {
    // Dãy Trái (Cột 1 -> 4)
    for (let c = 1; c <= 4; c++) {
      const name = leftGrid[r - 1]?.[c - 1] || null;
      slots.push({
        id: `slot-r${r}-c${c}`,
        row: r,
        col: c,
        block: "left",
        studentName: name,
        studentPhoto: null,
      });
    }

    // Dãy Phải (Cột 5 -> 8)
    for (let c = 5; c <= 8; c++) {
      const name = rightGrid[r - 1]?.[c - 5] || null;
      slots.push({
        id: `slot-r${r}-c${c}`,
        row: r,
        col: c,
        block: "right",
        studentName: name,
        studentPhoto: null,
      });
    }
  }

  return slots;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop") || "12T2";
    const month = searchParams.get("month") || "Tháng 09/2025";

    let chart = await prisma.seatingChart.findFirst({
      where: { lop, month },
      orderBy: { updatedAt: "desc" },
    });

    if (!chart) {
      // Create initial chart
      const initialSlots = generateInitialSlots();
      chart = await prisma.seatingChart.create({
        data: {
          lop,
          title: "CLASSROOM SEATING CHART",
          gvcn: "Phí Huỳnh Anh Hào",
          slogan: "Kỷ Cương - Trách Nhiệm - Hiệu Quả - Phát Triển",
          month,
          slotsData: JSON.stringify(initialSlots),
        },
      });
    }

    // Get list of all students of this class to easily pick from
    const students = await prisma.student.findMany({
      where: { lop },
      select: { id: true, hoTen: true, tenGoi: true, gioiTinh: true, avatar: true, to: true },
      orderBy: { hoTen: "asc" },
    });

    return NextResponse.json({
      success: true,
      chart: {
        ...chart,
        slots: JSON.parse(chart.slotsData),
      },
      students,
    });
  } catch (error) {
    console.error("GET seating chart error:", error);
    return NextResponse.json({ error: "Lỗi khi tải sơ đồ lớp học" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, lop, month, title, gvcn, slogan, slots } = body;

    const currentLop = lop?.trim() || "12T2";
    const currentMonth = month?.trim() || "Tháng 09/2025";
    const slotsString = typeof slots === "string" ? slots : JSON.stringify(slots);

    let updated;
    if (id) {
      updated = await prisma.seatingChart.update({
        where: { id: Number(id) },
        data: {
          title: title?.trim() || "CLASSROOM SEATING CHART",
          gvcn: gvcn?.trim() || "",
          slogan: slogan?.trim() || "",
          month: currentMonth,
          slotsData: slotsString,
        },
      });
    } else {
      const existing = await prisma.seatingChart.findFirst({
        where: { lop: currentLop, month: currentMonth },
      });

      if (existing) {
        updated = await prisma.seatingChart.update({
          where: { id: existing.id },
          data: {
            title: title?.trim() || existing.title,
            gvcn: gvcn !== undefined ? gvcn?.trim() : existing.gvcn,
            slogan: slogan !== undefined ? slogan?.trim() : existing.slogan,
            slotsData: slotsString,
          },
        });
      } else {
        updated = await prisma.seatingChart.create({
          data: {
            lop: currentLop,
            month: currentMonth,
            title: title?.trim() || "CLASSROOM SEATING CHART",
            gvcn: gvcn?.trim() || "Phí Huỳnh Anh Hào",
            slogan: slogan?.trim() || "Kỷ Cương - Trách Nhiệm - Hiệu Quả - Phát Triển",
            slotsData: slotsString,
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("POST seating chart error:", error);
    return NextResponse.json({ error: "Lỗi khi lưu sơ đồ lớp học" }, { status: 500 });
  }
}
