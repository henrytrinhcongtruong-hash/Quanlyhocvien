import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SeatSlotData, generateEmptySlots } from "@/lib/seatingTypes";

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
      // Create initial chart with 56 empty slots
      const initialSlots = generateEmptySlots();
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
